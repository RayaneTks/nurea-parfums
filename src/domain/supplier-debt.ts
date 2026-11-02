/**
 * Carnet fournisseur (docs/admin/dettes-fournisseur.md) : un seul compte avec le fournisseur, en dinars.
 *
 * Reste à payer = Σ dettes − Σ versements. Dérivé, jamais stocké, comme le dû d'un client. Un versement
 * n'est rattaché à aucune dette : le gérant paie ce qu'il veut, quand il veut, et le reste suit. Négatif,
 * c'est une avance ; on l'affiche telle quelle. Aucun chiffre de la gestion (Encaissé, Marge nette,
 * Trésorerie) ne lit ce carnet.
 */
import { dzd, type Dzd } from "./money";

export const SUPPLIER_ENTRY_KINDS = ["DEBT", "PAYMENT"] as const;
export type SupplierEntryKind = (typeof SUPPLIER_ENTRY_KINDS)[number];

/** `due` : il reste à payer ; `settled` : rien à payer ; `advance` : le fournisseur doit (avance versée). */
export type SupplierBalanceState = "due" | "settled" | "advance";

export function supplierRemaining(entries: Iterable<{ kind: SupplierEntryKind; amountDzd: Dzd }>): Dzd {
  const debts: Dzd[] = [];
  const payments: Dzd[] = [];
  for (const entry of entries) (entry.kind === "DEBT" ? debts : payments).push(entry.amountDzd);
  return dzd.sub(dzd.sum(debts), dzd.sum(payments));
}

export function supplierBalanceState(remaining: Dzd): SupplierBalanceState {
  const sign = dzd.compare(remaining, dzd.zero);
  return sign > 0 ? "due" : sign < 0 ? "advance" : "settled";
}

export type SupplierAllocationEntry = {
  id: string;
  kind: SupplierEntryKind;
  amountDzd: Dzd;
  /** ISO 8601. */
  occurredAt: string;
  /** Versement lié à une dette par « Marquer remboursée » : hors répartition, il paie cette dette-là. */
  settlesEntryId: string | null;
  /** Dette remboursée par un versement lié : hors répartition. */
  settled: boolean;
};

export type SupplierDebtAllocation = {
  /** Ce que les versements libres ont déjà payé sur cette dette. */
  paid: Dzd;
  remaining: Dzd;
  /** Date où elle a été payée en entier ; null tant qu'il en reste. ISO 8601. */
  paidAt: string | null;
  payments: { id: string; amount: Dzd }[];
};

export type SupplierPaymentAllocation = {
  debts: { id: string; amount: Dzd }[];
  /** La part qu'aucune dette n'a encore prise : l'avance. */
  unallocated: Dzd;
};

export type SupplierAllocation = {
  debts: Map<string, SupplierDebtAllocation>;
  payments: Map<string, SupplierPaymentAllocation>;
};

/**
 * Les versements libres paient les dettes, de la plus ancienne à la plus récente (gérant, 02/11/2026). Dérivé
 * à chaque lecture, rien n'est stocké : supprimer ou corriger une ligne recalcule tout. Un versement en trop
 * reste en avance et paiera la prochaine dette. La somme des restes moins la somme des avances vaut toujours
 * `supplierRemaining`. `oldestFirst` : lignes triées de la plus ancienne à la plus récente.
 */
export function allocateSupplierPayments(oldestFirst: readonly SupplierAllocationEntry[]): SupplierAllocation {
  const debts = oldestFirst.filter((entry) => entry.kind === "DEBT" && !entry.settled);
  const payments = oldestFirst.filter((entry) => entry.kind === "PAYMENT" && !entry.settlesEntryId);

  const debtAllocations = new Map<string, SupplierDebtAllocation>(
    debts.map((debt) => [debt.id, { paid: dzd.zero, remaining: debt.amountDzd, paidAt: null, payments: [] }]),
  );
  const paymentAllocations = new Map<string, SupplierPaymentAllocation>();

  let debtIndex = 0;
  for (const payment of payments) {
    const allocation: SupplierPaymentAllocation = { debts: [], unallocated: payment.amountDzd };
    paymentAllocations.set(payment.id, allocation);
    while (debtIndex < debts.length && dzd.compare(allocation.unallocated, dzd.zero) > 0) {
      const debt = debts[debtIndex] as SupplierAllocationEntry;
      const owed = debtAllocations.get(debt.id) as SupplierDebtAllocation;
      const amount = dzd.min(allocation.unallocated, owed.remaining);
      allocation.unallocated = dzd.sub(allocation.unallocated, amount);
      allocation.debts.push({ id: debt.id, amount });
      owed.paid = dzd.sum([owed.paid, amount]);
      owed.remaining = dzd.sub(owed.remaining, amount);
      owed.payments.push({ id: payment.id, amount });
      if (dzd.compare(owed.remaining, dzd.zero) === 0) {
        // Une avance paie la dette notée après elle : la date est alors celle de la dette.
        owed.paidAt = Date.parse(payment.occurredAt) > Date.parse(debt.occurredAt) ? payment.occurredAt : debt.occurredAt;
        debtIndex += 1;
      }
    }
  }
  return { debts: debtAllocations, payments: paymentAllocations };
}
