import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js-light";

export type CustomerListRow = {
  id: string;
  fullName: string;
  phoneE164: string | null;
  snapchat: string | null;
  whatsappE164: string | null;
  ordersCount: number;
  /// Solde dû en € (positif = client doit, négatif = trop-perçu).
  outstandingBalance: string;
  lastOrderAt: string | null;
};

export type CustomerSearchRow = {
  id: string;
  fullName: string;
  phoneE164: string | null;
};

export type CustomerDetail = CustomerListRow & {
  address: string | null;
  notes: string | null;
  snapchat: string | null;
  whatsappE164: string | null;
  createdAt: string;
};

/**
 * Liste clients triée par nom, paginée par cursor (id).
 */
export async function listCustomers(params: {
  q?: string;
  cursor?: string;
  limit?: number;
}): Promise<{ rows: CustomerListRow[]; nextCursor: string | null }> {
  const limit = Math.max(1, Math.min(params.limit ?? 50, 100));
  const where = params.q
    ? {
        OR: [
          { fullName: { contains: params.q, mode: "insensitive" as const } },
          { phoneE164: { contains: params.q, mode: "insensitive" as const } },
          { snapchat: { contains: params.q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const customers = await prisma.customer.findMany({
    where,
    take: limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      phoneE164: true,
      snapchat: true,
      whatsappE164: true,
      orders: {
        select: {
          id: true,
          orderedAt: true,
        },
        orderBy: { orderedAt: "desc" },
      },
    },
  });

  const hasMore = customers.length > limit;
  const sliced = hasMore ? customers.slice(0, limit) : customers;
  const last = sliced[sliced.length - 1];
  const nextCursor = hasMore && last ? last.id : null;

  if (sliced.length === 0) return { rows: [], nextCursor };

  const ids = sliced.map((c) => c.id);
  const balances = await computeBalancesForCustomers(ids);

  const rows: CustomerListRow[] = sliced.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    phoneE164: c.phoneE164,
    snapchat: c.snapchat,
    whatsappE164: c.whatsappE164,
    ordersCount: c.orders.length,
    outstandingBalance: balances.get(c.id) ?? "0.00",
    lastOrderAt: c.orders[0]?.orderedAt.toISOString() ?? null,
  }));

  return { rows, nextCursor };
}

/**
 * Recherche pour autocomplete. Compact, max 20 résultats.
 */
export async function searchCustomers(q: string, limit = 10): Promise<CustomerSearchRow[]> {
  const normalized = q.trim();
  if (normalized.length === 0) return [];
  const rows = await prisma.customer.findMany({
    where: {
      OR: [
        { fullName: { contains: normalized, mode: "insensitive" } },
        { phoneE164: { contains: normalized, mode: "insensitive" } },
        { snapchat: { contains: normalized, mode: "insensitive" } },
      ],
    },
    take: Math.max(1, Math.min(limit, 20)),
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, phoneE164: true },
  });
  return rows;
}

export async function getCustomerById(id: string): Promise<CustomerDetail | null> {
  const c = await prisma.customer.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      phoneE164: true,
      snapchat: true,
      whatsappE164: true,
      address: true,
      notes: true,
      createdAt: true,
      orders: {
        select: { id: true, orderedAt: true },
        orderBy: { orderedAt: "desc" },
      },
    },
  });
  if (!c) return null;

  const balances = await computeBalancesForCustomers([c.id]);
  return {
    id: c.id,
    fullName: c.fullName,
    phoneE164: c.phoneE164,
    snapchat: c.snapchat,
    whatsappE164: c.whatsappE164,
    address: c.address,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
    ordersCount: c.orders.length,
    outstandingBalance: balances.get(c.id) ?? "0.00",
    lastOrderAt: c.orders[0]?.orderedAt.toISOString() ?? null,
  };
}

/**
 * Calcule solde dû par client (sum order totals des commandes actives - sum payments).
 *
 * Active = PENDING ou READY (pas DELIVERED, pas CANCELLED).
 *
 * Une commande livrée est considérée close (le BALANCE final aura été enregistré
 * comme PaymentTransaction avant la transition vers DELIVERED).
 */
async function computeBalancesForCustomers(ids: readonly string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();

  // Total commandé par client (sur commandes actives uniquement).
  const orders = await prisma.order.findMany({
    where: {
      customerId: { in: [...ids] },
      status: { in: ["PENDING", "READY"] },
    },
    select: {
      id: true,
      customerId: true,
      items: { select: { unitPrice: true, quantity: true } },
    },
  });

  const totalByCustomer = new Map<string, Decimal>();
  const orderIdsByCustomer = new Map<string, string[]>();

  for (const o of orders) {
    if (!o.customerId) continue;
    const subtotal = o.items.reduce<Decimal>((acc, it) => {
      const price = new Decimal(it.unitPrice.toString());
      return acc.plus(price.times(it.quantity));
    }, new Decimal(0));

    totalByCustomer.set(o.customerId, (totalByCustomer.get(o.customerId) ?? new Decimal(0)).plus(subtotal));
    const list = orderIdsByCustomer.get(o.customerId) ?? [];
    list.push(o.id);
    orderIdsByCustomer.set(o.customerId, list);
  }

  // Total payé (DEPOSIT + BALANCE - REFUND) sur les commandes actives.
  const allOrderIds = orders.map((o) => o.id);
  const payments = allOrderIds.length
    ? await prisma.paymentTransaction.findMany({
        where: { orderId: { in: allOrderIds } },
        select: { orderId: true, type: true, amount: true },
      })
    : [];

  const paidByOrder = new Map<string, Decimal>();
  for (const p of payments) {
    const sign = p.type === "REFUND" ? -1 : 1;
    const amount = new Decimal(p.amount.toString()).times(sign);
    paidByOrder.set(p.orderId, (paidByOrder.get(p.orderId) ?? new Decimal(0)).plus(amount));
  }

  const result = new Map<string, string>();
  for (const id of ids) {
    const total = totalByCustomer.get(id) ?? new Decimal(0);
    const orderIds = orderIdsByCustomer.get(id) ?? [];
    const paid = orderIds.reduce<Decimal>(
      (acc, oid) => acc.plus(paidByOrder.get(oid) ?? new Decimal(0)),
      new Decimal(0),
    );
    result.set(id, total.minus(paid).toFixed(2));
  }
  return result;
}
