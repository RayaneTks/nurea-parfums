import { prisma } from "@/lib/db/prisma";
import type { PaymentTypeValue } from "@/schemas/payment";
import { computeBalance, type BalanceResult } from "@/domain/balance";

export type OrderBalance = BalanceResult;

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
 * Charge tous les payments + items, calcule balance via `computeBalance` (pur, P10).
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

  return computeBalance(
    order.items.map((it) => ({ unitPrice: it.unitPrice.toString(), quantity: it.quantity })),
    order.payments.map((p) => ({ type: p.type, amount: p.amount.toString() })),
  );
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
