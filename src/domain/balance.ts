import Decimal from "decimal.js-light";
import type { PaymentTypeValue } from "@/schemas/payment";

export type BalanceLineItem = {
  unitPrice: string | number;
  quantity: number;
};

export type BalancePaymentRow = {
  type: PaymentTypeValue;
  amount: string | number;
};

export type BalanceResult = {
  total: string;       // total commande €
  depositPaid: string; // somme DEPOSIT
  balancePaid: string; // somme BALANCE
  refunded: string;    // somme REFUND
  totalPaid: string;   // DEPOSIT + BALANCE - REFUND
  due: string;         // total - totalPaid
};

/**
 * Pure: prend items + payments, calcule balance d'une commande.
 *
 * `BalancePaymentRow.amount` est toujours positif. La direction du flux est portée par
 * `type` :
 * - DEPOSIT, BALANCE → flux entrant (ajoute à totalPaid).
 * - REFUND → flux sortant (soustrait à totalPaid).
 *
 * Utilisé par `computeOrderBalance` (server) et `topClient` calculations.
 */
export function computeBalance(
  items: readonly BalanceLineItem[],
  payments: readonly BalancePaymentRow[],
): BalanceResult {
  const total = items.reduce<Decimal>(
    (acc, it) => acc.plus(new Decimal(String(it.unitPrice)).times(it.quantity)),
    new Decimal(0),
  );

  let deposit = new Decimal(0);
  let balance = new Decimal(0);
  let refund = new Decimal(0);
  for (const p of payments) {
    const amt = new Decimal(String(p.amount));
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
