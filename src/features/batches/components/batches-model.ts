/**
 * Libellés des écrans des lots (06 E05, E06, E21, S12, S13) : légendes de ligne, compteurs, textes de
 * confirmation. Purs et testés — un écran ne fabrique jamais une phrase à la volée dans son JSX.
 *
 * Règle tenue partout ici : **une ligne sans donnée vraie est omise, pas inventée**. Un lot sans date
 * d'arrivée dit quand il a été créé ; un document sans article ne compte pas d'articles.
 */
import type { BatchDocumentRowDTO, BatchExpenseRowDTO, BatchRowDTO } from "@/contracts/batches";
import { eur, eurFromWire, formatEur } from "@/domain/money";
import { periodLabel } from "@/domain/periods";
import { Noun, PASSING_CUSTOMER, documentTitle } from "@/features/documents/components/document-model";
import { formatDate } from "@/ui/patterns/date-format";

/**
 * « septembre », ou « septembre 2025 » si ce n'est pas l'année en cours — l'année de Paris, comme
 * partout ailleurs (04 §6.5), jamais celle du fuseau du navigateur.
 */
function monthLabel(date: Date, now: Date): string {
  const sameYear = periodLabel("year", date) === periodLabel("year", now);
  return periodLabel("month", date, { withYear: !sameYear });
}

export const hasDue = (row: Pick<BatchDocumentRowDTO, "due">) => eur.compare(eurFromWire(row.due), eur.zero) > 0;

/** Nom affiché d'une ligne : nom vivant, nom saisi, sinon « Client de passage » (06 §1.7). */
export const rowName = (row: Pick<BatchDocumentRowDTO, "customerName">) =>
  row.customerName?.trim() ? row.customerName : PASSING_CUSTOMER;

/**
 * « Sauvage, Libre +2 » : les premiers parfums, puis ce qui reste. Rien du tout si le document n'a
 * aucune ligne — « 0 article » n'apprend rien à personne.
 */
export function itemsLabel(row: Pick<BatchDocumentRowDTO, "items" | "lineCount">): string | null {
  if (row.items.length === 0) return null;
  const rest = row.lineCount - row.items.length;
  return rest > 0 ? `${row.items.join(", ")} +${rest}` : row.items.join(", ");
}

/**
 * E05 zone 0 — « Commande du 12 sept. · Sauvage, Libre +2 · En attente ». Le statut ne s'écrit que
 * s'il apprend quelque chose (05 §5.3 : un état ne s'affiche que s'il est anormal) : une commande en
 * attente n'est pas encore engagée, une commande livrée est finie — les deux changent ce qu'on peut
 * lui imputer. Une commande simplement confirmée est le cas ordinaire : elle ne se dit pas.
 */
export function unbatchedCaption(row: BatchDocumentRowDTO, now: Date = new Date()): string {
  const parts = [documentTitle(row.origin, row.orderedAt, now)];
  const items = itemsLabel(row);
  if (items) parts.push(items);
  if (row.status === "PENDING") parts.push("En attente");
  else if (row.origin === "ORDER" && row.status === "DELIVERED") parts.push("Livrée");
  return parts.join(" · ");
}

/**
 * E06 zone 3 — « Commande du 12 sept. · livrée ». Une commande en attente porte « En attente » : son
 * total n'entre ni dans « À encaisser » ni dans « Coûts d'achat » tant qu'elle n'est pas engagée
 * (écart du 17/09/2026), et la fiche doit le dire plutôt que de laisser croire à un oubli.
 */
export function batchDocumentCaption(row: BatchDocumentRowDTO, now: Date = new Date()): string {
  const title = documentTitle(row.origin, row.orderedAt, now);
  switch (row.status) {
    case "PENDING":
      return `${title} · En attente`;
    case "DELIVERED":
      return row.deliveredAt ? `${title} · livrée ${formatDate(new Date(row.deliveredAt), "short", now)}` : `${title} · livrée`;
    case "CANCELLED":
      return row.cancelledAt ? `${title} · annulée ${formatDate(new Date(row.cancelledAt), "short", now)}` : `${title} · annulée`;
    default:
      return title;
  }
}

/** Nom accessible d'une ligne de document : ce que VoiceOver annonce avant d'ouvrir la fiche. */
export const documentRowLabel = (row: BatchDocumentRowDTO, now: Date = new Date()) =>
  `${rowName(row)}, ${documentTitle(row.origin, row.orderedAt, now)}`;

/**
 * E05 zone 1 — « arrivée prévue 3 oct. · 12 documents », ou « créé en septembre · 12 documents » quand
 * aucune arrivée n'est prévue. Le mois est écrit en entier, et daté dès qu'il n'est pas de cette
 * année : « créé en sept. » seul ne dit pas de quel septembre il s'agit (écart assumé avec 06 E05).
 */
export function batchLegend(batch: Pick<BatchRowDTO, "expectedAt" | "createdAt" | "documentCount">, now: Date = new Date()): string {
  const when = batch.expectedAt
    ? `arrivée prévue ${formatDate(new Date(batch.expectedAt), "short", now)}`
    : `créé en ${monthLabel(new Date(batch.createdAt), now)}`;
  return batch.documentCount === 0
    ? when
    : `${when} · ${batch.documentCount} document${batch.documentCount > 1 ? "s" : ""}`;
}

/** E06 en-tête — « Ouvert · arrivée prévue 3 oct. », « Clos · créé en septembre ». */
export function batchStatusLine(
  batch: { status: "OPEN" | "CLOSED"; expectedAt: string | null },
  createdAt: string,
  now: Date = new Date(),
): string {
  const state = batch.status === "OPEN" ? "Ouvert" : "Clos";
  return batch.expectedAt
    ? `${state} · arrivée prévue ${formatDate(new Date(batch.expectedAt), "short", now)}`
    : `${state} · créé en ${monthLabel(new Date(createdAt), now)}`;
}

/** E06 zone 4 — « 12 sept. · Banque », complété de la note quand il y en a une. */
export function expenseCaption(expense: BatchExpenseRowDTO, now: Date = new Date()): string {
  const parts = [formatDate(new Date(expense.occurredAt), "short", now), expense.pocketName];
  if (expense.notes?.trim()) parts.push(expense.notes.trim());
  return parts.join(" · ");
}

/**
 * « 100 affichés sur 132 » : une liste tronquée le dit, toujours (06 E05 zone 0 : « jamais tronqué en
 * silence »). `null` quand tout est là — il n'y a alors rien à avouer.
 */
export function truncationNotice(shown: number, total: number): string | null {
  return total > shown ? `${shown} affichés sur ${total}` : null;
}

/** « À rattacher · 4 » : le compte réel, pages comprises, jamais le nombre de lignes affichées. */
export const unbatchedTitle = "À rattacher";

/**
 * La vérité sur la clôture (06 E06) : ce qu'elle interdit, ce qu'elle laisse passer, et qu'elle se défait.
 */
export function closeConfirmation(name: string): { title: string; description: string } {
  return {
    title: `Clôturer « ${name} » ?`,
    description:
      "Plus aucune vente ni commande ne pourra y être rattachée. Les dépenses tardives restent possibles. Tu pourras le rouvrir.",
  };
}

export function reopenConfirmation(name: string): { title: string; description: string } {
  return {
    title: `Rouvrir « ${name} » ?`,
    description: "Des ventes et des commandes pourront y être rattachées à nouveau.",
  };
}

/** La suppression d'une dépense dit où l'argent revient, et à quelle date (06 PC-10). */
export function expenseDeletionConfirmation(expense: BatchExpenseRowDTO, now: Date = new Date()): { title: string; description: string } {
  return {
    title: `Supprimer « ${expense.label} » ?`,
    description: `${formatEur(eurFromWire(expense.amount))} reviennent dans ${expense.pocketName} à la date de la dépense, le ${formatDate(new Date(expense.occurredAt), "short", now)}.`,
  };
}

/** Le CTA de S12 nomme ce qu'il va écrire : « Ajouter 45 € · Banque ». */
export function expenseCta(amountText: string | null, pocketName: string | null): string {
  if (!amountText) return "Saisir le montant";
  return pocketName ? `Ajouter ${amountText} · ${pocketName}` : `Ajouter ${amountText}`;
}

/**
 * Le toast de S13 dit ce qui a été APPLIQUÉ, pas ce qui a été demandé (06 S13). T13 est tout-ou-rien
 * (04 §4, T13) : un document qui a bougé entre-temps fait refuser l'enregistrement entier, avec sa
 * raison — il n'y a donc jamais de « ignoré » à annoncer ici. Ce qui peut différer, c'est le nombre
 * de documents réellement ÉCRITS : ceux qui étaient déjà dans l'état demandé ne comptent pas, et
 * « mis à jour » ne s'écrit jamais quand rien ne l'a été.
 */
export function assignToast(counts: { attached: number; detached: number; applied: number }): string {
  const { attached, detached, applied } = counts;
  const asked = attached + detached;
  if (applied === 0) return "Aucun changement : tout était déjà à jour.";
  if (applied < asked) {
    return `${applied} document${applied > 1 ? "s" : ""} enregistré${applied > 1 ? "s" : ""} · ${asked - applied} déjà à jour`;
  }
  const done: string[] = [];
  if (attached > 0) done.push(`${attached} document${attached > 1 ? "s" : ""} rattaché${attached > 1 ? "s" : ""}`);
  if (detached > 0) done.push(`${detached} retiré${detached > 1 ? "s" : ""} du lot`);
  return done.join(" · ");
}

/** « Enregistrer (3 changements) », ou l'invitation quand rien n'a bougé. */
export function assignCta(changes: number): string {
  if (changes === 0) return "Aucun changement";
  return `Enregistrer (${changes} changement${changes > 1 ? "s" : ""})`;
}

/** Titre de S12 hors de E06 : « Dépense · Commande de mars » (06 S12 « Ouverture »). */
export const expenseSheetTitle = (batchName: string) => `Dépense · ${batchName}`;

/** Nom accessible du menu d'une dépense : « Actions : Transport du 12 sept. ». */
export const expenseMenuLabel = (expense: BatchExpenseRowDTO, now: Date = new Date()) =>
  `Actions : ${expense.label} du ${formatDate(new Date(expense.occurredAt), "short", now)}`;

/** Nom d'un document pour un lot, quand seul son genre importe : « Commande », « Vente ». */
export const documentNoun = Noun;
