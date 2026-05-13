import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js-light";
import type { PaymentTypeValue } from "@/schemas/payment";

export type OrderBalance = {
  total: string;           // total commande €
  depositPaid: string;     // somme DEPOSIT (toutes transactions)
  balancePaid: string;     // somme BALANCE
  refunded: string;        // somme REFUND
  totalPaid: string;       // DEPOSIT + BALANCE - REFUND
  due: string;             // total - totalPaid (peut être négatif si trop-perçu)
};

export type PaymentRow = {
  id: string;
  type: PaymentTypeValue;
  amount: string;
  paidAt: string;
  method: string | null;
  note: string | null;
  recordedById: string | null;
};

/**
 * Charge tous les payments + items, calcule balance.
 */
export async function computeOrderBalance(orderId: string): Promise<OrderBalance | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      items: { select: { unitPrice: true, quantity: true } },
      payments: { select: { type: true, amount: true } },
    },
  });
  if (!order) return null;

  const total = order.items.reduce<Decimal>(
    (acc, it) => acc.plus(new Decimal(it.unitPrice.toString()).times(it.quantity)),
    new Decimal(0),
  );

  let deposit = new Decimal(0);
  let balance = new Decimal(0);
  let refund = new Decimal(0);
  for (const p of order.payments) {
    const amt = new Decimal(p.amount.toString());
    if (p.type === "DEPOSIT") deposit = deposit.plus(amt);
    else if (p.type === "BALANCE") balance = balance.plus(amt);
    else if (p.type === "REFUND") refund = refund.plus(amt);
  }
  const totalPaid = deposit.plus(balance).minus(refund);
  const due = total.minus(totalPaid);

  return {
    total: total.toFixed(2),
    depositPaid: deposit.toFixed(2),
    balancePaid: balance.toFixed(2),
    refunded: refund.toFixed(2),
    totalPaid: totalPaid.toFixed(2),
    due: due.toFixed(2),
  };
}

export async function listPaymentsForOrder(orderId: string): Promise<PaymentRow[]> {
  const rows = await prisma.paymentTransaction.findMany({
    where: { orderId },
    orderBy: { paidAt: "desc" },
    select: {
      id: true,
      type: true,
      amount: true,
      paidAt: true,
      method: true,
      note: true,
      recordedById: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    amount: r.amount.toString(),
    paidAt: r.paidAt.toISOString(),
    method: r.method,
    note: r.note,
    recordedById: r.recordedById,
  }));
}
