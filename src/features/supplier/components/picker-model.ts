import type {
  SupplierItemInput,
  SupplierNotedDTO,
  SupplierPickerBatchDTO,
  SupplierPickerDocumentDTO,
} from "@/contracts/supplier";
import { foldText, searchTerms } from "@/contracts/search";
import { dzd, dzdFromDb, formatDzd, type Dzd } from "@/domain/money";
import { PASSING_CUSTOMER, documentTitle } from "@/features/documents/components/document-model";
import { formatDate } from "@/ui/patterns/date-format";

/**
 * S25 — le sélecteur d'une dette (docs/admin/dettes-fournisseur.md). Modèle pur : ce qui est coché est un
 * ensemble de DOCUMENTS ; cocher un lot coche ses documents. Le total est la somme des coûts des documents
 * cochés, au centime (le serveur recalcule chaque élément à l'écriture, par la même requête).
 */

export type Picked = ReadonlySet<string>;

export const docsOfBatch = (documents: readonly SupplierPickerDocumentDTO[], batchId: string) =>
  documents.filter((doc) => doc.batchId === batchId);

/** `all` : tous les documents du lot sont cochés ; `some` : une partie ; `none` : aucun. */
export function batchState(documents: readonly SupplierPickerDocumentDTO[], batchId: string, picked: Picked): "all" | "some" | "none" {
  const docs = docsOfBatch(documents, batchId);
  const count = docs.filter((doc) => picked.has(doc.id)).length;
  return count === 0 ? "none" : count === docs.length ? "all" : "some";
}

/** Un lot coché en entier se décoche en entier ; sinon, il se coche en entier. */
export function toggleBatch(documents: readonly SupplierPickerDocumentDTO[], batchId: string, picked: Picked): Set<string> {
  const docs = docsOfBatch(documents, batchId);
  const next = new Set(picked);
  const all = docs.length > 0 && docs.every((doc) => picked.has(doc.id));
  for (const doc of docs) {
    if (all) next.delete(doc.id);
    else next.add(doc.id);
  }
  return next;
}

export function toggleDocument(id: string, picked: Picked): Set<string> {
  const next = new Set(picked);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/**
 * Les éléments envoyés : un lot entièrement coché part comme UN lot (S22 le relira « Lot de mars »), le
 * reste document par document. Un lot dont la liste ne porte pas tous les documents (liste tronquée) part
 * document par document : on n'écrit jamais un lot pour des documents qu'on n'a pas vus.
 */
export function pickedItems(
  documents: readonly SupplierPickerDocumentDTO[],
  batches: readonly SupplierPickerBatchDTO[],
  picked: Picked,
): SupplierItemInput[] {
  const items: SupplierItemInput[] = [];
  const covered = new Set<string>();
  for (const batch of batches) {
    const docs = docsOfBatch(documents, batch.id);
    if (docs.length === 0 || docs.length !== batch.documentCount || !docs.every((doc) => picked.has(doc.id))) continue;
    items.push({ kind: "batch", batchId: batch.id });
    for (const doc of docs) covered.add(doc.id);
  }
  for (const doc of documents) {
    if (picked.has(doc.id) && !covered.has(doc.id)) items.push({ kind: "document", documentId: doc.id });
  }
  return items;
}

export type PickedSummary = { count: number; totalDzd: Dzd; missingLines: number };

/** Le bandeau : nombre d'éléments envoyés, Σ des coûts cochés, lignes sans coût comptées à part. */
export function pickedSummary(
  documents: readonly SupplierPickerDocumentDTO[],
  batches: readonly SupplierPickerBatchDTO[],
  picked: Picked,
): PickedSummary {
  const chosen = documents.filter((doc) => picked.has(doc.id));
  return {
    count: pickedItems(documents, batches, picked).length,
    totalDzd: dzd.sum(chosen.map((doc) => dzdFromDb(doc.costDzd))),
    missingLines: chosen.reduce((sum, doc) => sum + doc.missingLines, 0),
  };
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** « 3 éléments · 92 700 DA ». */
export function summaryLine(summary: PickedSummary): string {
  return `${plural(summary.count, "élément", "éléments")} · ${formatDzd(summary.totalDzd)}`;
}

/** « dont 2 lignes sans coût » ; rien quand toutes les lignes ont un coût. */
export function missingLabel(missingLines: number): string | null {
  return missingLines > 0 ? `dont ${plural(missingLines, "ligne sans coût", "lignes sans coût")}` : null;
}

/** Nom d'une dette déjà notée : son nom, à défaut « Dette du 4 oct. ». */
export function notedName(noted: SupplierNotedDTO, now: Date = new Date()): string {
  return noted.label?.trim() || defaultDebtLabel(new Date(noted.occurredAt), now);
}

/** Nom proposé pour la dette : « Dette du 24 oct. ». */
export function defaultDebtLabel(day: Date = new Date(), now: Date = new Date()): string {
  return `Dette du ${formatDate(day, "short", now)}`;
}

export const documentName = (doc: Pick<SupplierPickerDocumentDTO, "customerName">) =>
  doc.customerName?.trim() ? doc.customerName : PASSING_CUSTOMER;

/** « Commande du 12 oct. · Sauvage, Libre · En attente · Lot de mars ». */
export function documentCaption(doc: SupplierPickerDocumentDTO, batchName: string | null, now: Date = new Date()): string {
  const parts = [documentTitle(doc.origin, doc.orderedAt, now)];
  if (doc.items.length > 0) parts.push(doc.items.join(", "));
  if (doc.status === "PENDING") parts.push("En attente");
  if (batchName) parts.push(batchName);
  return parts.join(" · ");
}

/** « 12 documents » et, s'il y a lieu, « 2 lignes sans coût ». */
export function batchCaption(batch: SupplierPickerBatchDTO): string {
  const parts = [plural(batch.documentCount, "document", "documents")];
  if (batch.status === "CLOSED") parts.push("Clos");
  if (batch.missingLines > 0) parts.push(plural(batch.missingLines, "ligne sans coût", "lignes sans coût"));
  return parts.join(" · ");
}

/** Recherche sur l'appareil : client, parfums, type et date, nom du lot. */
export function matchDocuments(
  documents: readonly SupplierPickerDocumentDTO[],
  batchNames: ReadonlyMap<string, string>,
  query: string,
): SupplierPickerDocumentDTO[] {
  const terms = searchTerms(query);
  if (terms.length === 0) return [...documents];
  return documents.filter((doc) => {
    const batchName = doc.batchId ? (batchNames.get(doc.batchId) ?? "") : "";
    const hay = foldText([documentName(doc), documentCaption(doc, batchName), ...doc.items].join(" "));
    return terms.every((term) => hay.includes(term));
  });
}

export function matchBatches(batches: readonly SupplierPickerBatchDTO[], query: string): SupplierPickerBatchDTO[] {
  const terms = searchTerms(query);
  if (terms.length === 0) return [...batches];
  return batches.filter((batch) => {
    const hay = foldText(batch.name);
    return terms.every((term) => hay.includes(term));
  });
}
