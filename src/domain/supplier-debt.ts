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
