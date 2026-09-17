/**
 * Jumeau TypeScript de la vue SQL `DocumentBalance` (03 §5.1, 04 §6.4) : total, coût, payé
 * et dû d'UN document, calculés en mémoire pour l'aperçu d'un formulaire, le plafond
 * d'encaissement avant envoi et les réserves. C'est le seul calcul d'argent hors SQL ;
 * tout chiffre agrégé (Encaissé, À encaisser, Marge nette…) se lit dans `src/server/chiffres`.
 *
 * Parité, vérifiée par `tests/db/chiffres-parity.test.ts` au centime :
 *   vue.total ↔ total · vue.cost ↔ knownCost · vue.paid ↔ paid · vue.due ↔ due · vue.hasUnknownCost ↔ hasUnknownCost
 * `cost` n'a pas de colonne : il vaut null dès qu'un coût manque, parce qu'un document
 * affiche alors « Marge avant dépenses : coût à compléter » et jamais une marge gonflée par
 * un 0 (06 S01). La vue, elle, compte ces coûts 0 : c'est la règle de la Marge nette (03 §5.4).
 */
import { eur, type Eur } from "./money";
import { isEngaged, type DocumentStatus } from "./document-status";
import { parisDaysBetween } from "./periods";

export type BalanceLine = {
  quantity: number;
  unitPriceEur: Eur;
  /** null = coût inconnu (« Coût à compléter »). */
  unitCostEur: Eur | null;
};

/** Un paiement vu par son mouvement : montant SIGNÉ (+ acompte ou solde, − remboursement). */
export type BalancePayment = { amount: Eur };

export type DocumentBalance = {
  /** Σ quantité × prix unitaire. « Total ». */
  total: Eur;
  /** Σ quantité × coût unitaire, ou null si une ligne a un coût inconnu. */
  cost: Eur | null;
  /** Σ des coûts connus, inconnus comptés 0 (= colonne `cost` de la vue). */
  knownCost: Eur;
  hasUnknownCost: boolean;
  /** Payé net. « Payé ». */
  paid: Eur;
  /** max(0 ; total − payé), plafonné PAR document : un trop-perçu n'efface jamais la dette d'un autre. */
  due: Eur;
  /** max(0 ; payé − total). « Trop-perçu » ; reste dans l'Encaissé et la Trésorerie. */
  overpaid: Eur;
  /** total − cost, null si un coût manque. « Marge avant dépenses » : jamais sommée, jamais « Marge nette ». */
  marginBeforeExpenses: Eur | null;
};

export function documentBalance(
  lines: readonly BalanceLine[],
  payments: readonly BalancePayment[],
): DocumentBalance {
  const total = eur.sum(lines.map((l) => eur.times(l.unitPriceEur, l.quantity)));
  const knownCost = eur.sum(
    lines.map((l) => (l.unitCostEur === null ? eur.zero : eur.times(l.unitCostEur, l.quantity))),
  );
  const hasUnknownCost = lines.some((l) => l.unitCostEur === null);
  const paid = eur.sum(payments.map((p) => p.amount));
  const cost = hasUnknownCost ? null : knownCost;
  return {
    total,
    cost,
    knownCost,
    hasUnknownCost,
    paid,
    due: eur.clampZero(eur.sub(total, paid)),
    overpaid: eur.clampZero(eur.sub(paid, total)),
    marginBeforeExpenses: cost === null ? null : eur.sub(total, cost),
  };
}

/** Âge au-delà duquel une créance est « ancienne » (03 §5.8). */
export const OLD_RECEIVABLE_DAYS = 30;

/** « depuis N j » : jours calendaires Europe/Paris écoulés depuis l'engagement. */
export function receivableAgeDays(confirmedAt: Date, now: Date = new Date()): number {
  return parisDaysBetween(confirmedAt, now);
}

/**
 * Créance ancienne (03 §5.8) : document engagé, dû > 0, engagé il y a plus de 30 jours
 * calendaires. Jumeau de `creancesAnciennes()` pour un document déjà chargé.
 */
export function isOldReceivable(
  doc: { status: DocumentStatus; confirmedAt: Date | null; due: Eur },
  now: Date = new Date(),
): boolean {
  if (!isEngaged(doc.status) || doc.confirmedAt === null) return false;
  if (eur.compare(doc.due, eur.zero) <= 0) return false;
  return receivableAgeDays(doc.confirmedAt, now) > OLD_RECEIVABLE_DAYS;
}
