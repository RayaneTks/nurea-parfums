import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js-light";
import type { OrderStatus } from "@prisma/client";
import { deriveFulfillment, type Fulfillment } from "@/domain/order-status";

export type OrderListRow = {
  id: string;
  customerId: string | null;
  customerName: string;
  customerContact: string | null;
  orderedAt: string;
  deliveryAt: string | null;
  status: OrderStatus;
  itemCount: number;
  total: string;
  depositPaid: string;
  due: string;
  hasSale: boolean;
  /** Avancement livraison dérivé des lignes (none/partial/full). */
  fulfillment: Fulfillment;
};

export type OrderDetailRow = OrderListRow & {
  notes: string | null;
  batchId: string | null;
  batchName: string | null;
  items: Array<{
    id: string;
    perfumeId: number | null;
    quantity: number;
    deliveredQuantity: number;
    isGift: boolean;
    volumeMl: number;
    unitPrice: string;
    unitCostDzd: string | null;
    exchangeRate: string | null;
    note: string | null;
    snapshot: { name: string; brandName: string | null; image: string | null };
  }>;
};

export type OrderGroupLabel = "Aujourd'hui" | "En retard" | "À traiter" | "À venir" | "Livrées" | "Annulées";

export type OrdersListResult = {
  groups: Array<{ label: OrderGroupLabel; rows: OrderListRow[] }>;
  counts: { pending: number; ready: number; delivered: number; overdue: number };
};

export type OrdersFilter = "all" | "pending" | "ready" | "delivered";

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function sumLines(items: Array<{ unitPrice: { toString(): string }; quantity: number }>): Decimal {
  return items.reduce<Decimal>(
    (acc, it) => acc.plus(new Decimal(it.unitPrice.toString()).times(it.quantity)),
    new Decimal(0),
  );
}

function sumPayments(payments: Array<{ type: string; amount: { toString(): string } }>): {
  deposit: Decimal;
  balance: Decimal;
  refund: Decimal;
} {
  let deposit = new Decimal(0);
  let balance = new Decimal(0);
  let refund = new Decimal(0);
  for (const p of payments) {
    const amt = new Decimal(p.amount.toString());
    if (p.type === "DEPOSIT") deposit = deposit.plus(amt);
    else if (p.type === "BALANCE") balance = balance.plus(amt);
    else if (p.type === "REFUND") refund = refund.plus(amt);
  }
  return { deposit, balance, refund };
}

export async function listOrders(filter: OrdersFilter = "all"): Promise<OrdersListResult> {
  const where =
    filter === "all"
      ? { status: { not: "DELIVERED" as OrderStatus } }
      : filter === "pending"
        ? { status: "PENDING" as OrderStatus }
        : filter === "ready"
          ? { status: "READY" as OrderStatus }
          : { status: "DELIVERED" as OrderStatus };

  const orders = await prisma.order.findMany({
    where,
    orderBy: [{ deliveryAt: "asc" }, { orderedAt: "desc" }],
    take: 200,
    select: {
      id: true,
      customerId: true,
      customerName: true,
      customerContact: true,
      orderedAt: true,
      deliveryAt: true,
      status: true,
      items: { select: { unitPrice: true, quantity: true, deliveredQuantity: true } },
      payments: { select: { type: true, amount: true } },
      sale: { select: { id: true } },
      customer: { select: { fullName: true } },
    },
  });

  const rows: OrderListRow[] = orders.map((o) => {
    const total = sumLines(o.items);
    const { deposit, balance, refund } = sumPayments(o.payments);
    const paid = deposit.plus(balance).minus(refund);
    const due = total.minus(paid);
    return {
      id: o.id,
      customerId: o.customerId,
      customerName: o.customer?.fullName ?? o.customerName ?? "Anonyme",
      customerContact: o.customerContact ?? null,
      orderedAt: o.orderedAt.toISOString(),
      deliveryAt: o.deliveryAt?.toISOString() ?? null,
      status: o.status,
      itemCount: o.items.length,
      total: total.toFixed(2),
      depositPaid: deposit.minus(refund).toFixed(2),
      due: due.toFixed(2),
      hasSale: o.sale !== null,
      fulfillment: deriveFulfillment(o.items),
    };
  });

  // Grouping
  const startToday = startOfToday().getTime();
  const endToday = endOfToday().getTime();
  const todayBucket: OrderListRow[] = [];
  const overdueBucket: OrderListRow[] = [];
  const readyBucket: OrderListRow[] = [];
  const upcomingBucket: OrderListRow[] = [];
  const deliveredBucket: OrderListRow[] = [];
  const cancelledBucket: OrderListRow[] = [];

  let pending = 0;
  let ready = 0;
  let delivered = 0;
  let overdue = 0;

  for (const r of rows) {
    if (r.status === "PENDING") pending += 1;
    if (r.status === "READY") ready += 1;
    if (r.status === "DELIVERED") delivered += 1;

    if (r.status === "CANCELLED") {
      cancelledBucket.push(r);
      continue;
    }
    if (r.status === "DELIVERED") {
      deliveredBucket.push(r);
      continue;
    }

    if (r.deliveryAt) {
      const t = new Date(r.deliveryAt).getTime();
      if (t < startToday) {
        overdueBucket.push(r);
        overdue += 1;
        continue;
      }
      if (t >= startToday && t <= endToday) {
        todayBucket.push(r);
        continue;
      }
    }
    if (r.status === "READY") {
      readyBucket.push(r);
    } else {
      upcomingBucket.push(r);
    }
  }

  const groups: OrdersListResult["groups"] = [];
  if (overdueBucket.length) groups.push({ label: "En retard", rows: overdueBucket });
  if (todayBucket.length) groups.push({ label: "Aujourd'hui", rows: todayBucket });
  if (readyBucket.length) groups.push({ label: "À traiter", rows: readyBucket });
  if (upcomingBucket.length) groups.push({ label: "À venir", rows: upcomingBucket });
  if (deliveredBucket.length) groups.push({ label: "Livrées", rows: deliveredBucket });
  if (cancelledBucket.length) groups.push({ label: "Annulées", rows: cancelledBucket });

  return { groups, counts: { pending, ready, delivered, overdue } };
}

export async function getOrderForDetail(orderId: string): Promise<OrderDetailRow | null> {
  const o = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      customerId: true,
      customerName: true,
      customerContact: true,
      orderedAt: true,
      deliveryAt: true,
      status: true,
      notes: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          perfumeId: true,
          quantity: true,
          deliveredQuantity: true,
          isGift: true,
          volumeMl: true,
          unitPrice: true,
          unitCostDzd: true,
          exchangeRate: true,
          note: true,
          perfumeSnapshot: true,
          perfume: {
            select: { id: true, name: true, image: true, brand: { select: { name: true } } },
          },
        },
      },
      payments: { select: { type: true, amount: true } },
      sale: { select: { id: true } },
      customer: { select: { fullName: true } },
      batchId: true,
      batch: { select: { name: true } },
    },
  });
  if (!o) return null;

  const total = sumLines(o.items);
  const { deposit, balance, refund } = sumPayments(o.payments);
  const paid = deposit.plus(balance).minus(refund);
  const due = total.minus(paid);

  return {
    id: o.id,
    customerId: o.customerId,
    customerName: o.customer?.fullName ?? o.customerName ?? "Anonyme",
    customerContact: o.customerContact ?? null,
    orderedAt: o.orderedAt.toISOString(),
    deliveryAt: o.deliveryAt?.toISOString() ?? null,
    status: o.status,
    itemCount: o.items.length,
    total: total.toFixed(2),
    depositPaid: deposit.minus(refund).toFixed(2),
    due: due.toFixed(2),
    hasSale: o.sale !== null,
    fulfillment: deriveFulfillment(o.items),
    notes: o.notes,
    batchId: o.batchId,
    batchName: o.batch?.name ?? null,
    items: o.items.map((it) => {
      const snap = it.perfumeSnapshot;
      const snapshot = {
        name:
          snap && typeof snap === "object" && "name" in snap && typeof snap.name === "string"
            ? snap.name
            : it.perfume?.name ?? "Hors catalogue",
        brandName:
          snap && typeof snap === "object" && "brandName" in snap && typeof snap.brandName === "string"
            ? snap.brandName
            : it.perfume?.brand.name ?? null,
        image: it.perfume?.image ?? null,
      };
      return {
        id: it.id,
        perfumeId: it.perfumeId,
        quantity: it.quantity,
        deliveredQuantity: it.deliveredQuantity,
        isGift: it.isGift,
        volumeMl: it.volumeMl,
        unitPrice: it.unitPrice.toString(),
        unitCostDzd: it.unitCostDzd?.toString() ?? null,
        exchangeRate: it.exchangeRate?.toString() ?? null,
        note: it.note,
        snapshot,
      };
    }),
  };
}
