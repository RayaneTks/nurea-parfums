import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js-light";
import type { OrderStatus } from "@prisma/client";

export type OrderComptaRow = {
  id: string;
  customerName: string;
  status: OrderStatus;
  orderedAt: string;
  total: string;
  cashed: string;
  due: string;
  cost: string;
  itemCount: number;
};

export type ConfirmedOrdersFinancials = {
  totals: { cashed: string; cost: string; due: string; count: number };
  rows: OrderComptaRow[];
};

type LineForCost = {
  unitPrice: { toString(): string };
  quantity: number;
  unitCost: { toString(): string };
};

type PaymentForSum = { type: string; amount: { toString(): string } };

function sumPaid(payments: PaymentForSum[]): Decimal {
  let deposit = new Decimal(0);
  let balance = new Decimal(0);
  let refund = new Decimal(0);
  for (const p of payments) {
    const amt = new Decimal(p.amount.toString());
    if (p.type === "DEPOSIT") deposit = deposit.plus(amt);
    else if (p.type === "BALANCE") balance = balance.plus(amt);
    else if (p.type === "REFUND") refund = refund.plus(amt);
  }
  return deposit.plus(balance).minus(refund);
}

/** Math pure d'une commande pour la compta (encaissé plafonné au total, marge = encaissé − coût). */
export function orderComptaMath(
  items: LineForCost[],
  payments: PaymentForSum[],
): { total: string; cashed: string; due: string; cost: string; net: string } {
  const total = items.reduce(
    (acc, it) => acc.plus(new Decimal(it.unitPrice.toString()).times(it.quantity)),
    new Decimal(0),
  );
  const cost = items.reduce(
    (acc, it) => acc.plus(new Decimal(it.unitCost.toString()).times(it.quantity)),
    new Decimal(0),
  );
  const paid = sumPaid(payments);
  const cappedPaid = paid.greaterThan(total) ? total : paid;
  const cashed = cappedPaid.greaterThan(0) ? cappedPaid : new Decimal(0);
  const due = total.greaterThan(paid) ? total.minus(paid) : new Decimal(0);
  return {
    total: total.toFixed(2),
    cashed: cashed.toFixed(2),
    due: due.toFixed(2),
    cost: cost.toFixed(2),
    net: cashed.minus(cost).toFixed(2),
  };
}

/**
 * Finances des commandes confirmées (READY/DELIVERED) **non encore finalisées en vente**
 * (`sale: null`) — évite tout double comptage avec `Sale`.
 *
 * Logique cash : on compte l'encaissé réel (acomptes + soldes − remboursements),
 * le coût d'achat complet (sunk), la marge = encaissé − coût. Le reste dû est exposé à part.
 */
export async function confirmedOrdersFinancials(
  since?: Date | null,
): Promise<ConfirmedOrdersFinancials> {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["READY", "DELIVERED"] },
      sale: null,
      ...(since ? { orderedAt: { gte: since } } : {}),
    },
    orderBy: [{ status: "asc" }, { orderedAt: "desc" }],
    select: {
      id: true,
      customerName: true,
      status: true,
      orderedAt: true,
      customer: { select: { fullName: true } },
      items: { select: { unitPrice: true, quantity: true, unitCost: true } },
      payments: { select: { type: true, amount: true } },
    },
  });

  let totalCashed = new Decimal(0);
  let totalCost = new Decimal(0);
  let totalDue = new Decimal(0);

  const rows: OrderComptaRow[] = orders.map((o) => {
    const m = orderComptaMath(o.items as LineForCost[], o.payments);
    totalCashed = totalCashed.plus(new Decimal(m.cashed));
    totalCost = totalCost.plus(new Decimal(m.cost));
    totalDue = totalDue.plus(new Decimal(m.due));

    return {
      id: o.id,
      customerName: o.customer?.fullName ?? o.customerName ?? "Anonyme",
      status: o.status,
      orderedAt: o.orderedAt.toISOString(),
      total: m.total,
      cashed: m.cashed,
      due: m.due,
      cost: m.cost,
      itemCount: o.items.length,
    };
  });

  return {
    totals: {
      cashed: totalCashed.toFixed(2),
      cost: totalCost.toFixed(2),
      due: totalDue.toFixed(2),
      count: rows.length,
    },
    rows,
  };
}
