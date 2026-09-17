import "server-only";
import type {
  BatchDeletion,
  BatchSummary,
  CreateBatchData,
  SetBatchStatusData,
  UpdateBatchData,
} from "@/contracts/batches";
import { DomainError } from "@/domain/errors";
import type { Tx } from "@/server/db/transaction";

/**
 * Seul fichier qui écrit `Batch` et `BatchExpense` (03 §4.2, 04 §4.3).
 *
 * PARTIEL (J5) : le lot lui-même — créer, renommer, dater, annoter, clôturer, rouvrir, supprimer un
 * lot vide. Les dépenses (T9, T10) arrivent avec le moteur de l'argent (J6). Le rattachement des
 * documents (T13) écrit `SaleDocument` : il appartient au writer `documents`.
 */

export const BATCH_NOT_FOUND = "Ce lot n'existe plus. Il a peut-être été supprimé depuis un autre écran.";

const SELECT = { id: true, name: true, status: true, expectedAt: true, notes: true } as const;

type BatchRow = { id: string; name: string; status: "OPEN" | "CLOSED"; expectedAt: Date | null; notes: string | null };

function summary(row: BatchRow): BatchSummary {
  return { ...row, expectedAt: row.expectedAt?.toISOString() ?? null };
}

/** Créer (E21, S11). Un id déjà connu rend le lot existant (04 §3.6). */
export async function createBatch(tx: Tx, input: CreateBatchData): Promise<BatchSummary> {
  if (input.id) {
    const existing = await tx.db.batch.findUnique({ where: { id: input.id }, select: SELECT });
    if (existing) return summary(existing);
  }
  const created = await tx.db.batch.create({
    data: {
      ...(input.id ? { id: input.id } : {}),
      name: input.name,
      expectedAt: input.expectedAt ?? null,
      notes: input.notes ?? null,
    },
    select: SELECT,
  });
  return summary(created);
}

/** Renommer, dater, annoter (E06) ; un appel sans changement rend le lot tel quel. */
export async function updateBatch(tx: Tx, input: UpdateBatchData): Promise<BatchSummary> {
  const current = await tx.db.batch.findUnique({ where: { id: input.id }, select: SELECT });
  if (!current) throw new DomainError("NOT_FOUND", BATCH_NOT_FOUND);
  const data = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.expectedAt !== undefined ? { expectedAt: input.expectedAt } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  };
  if (Object.keys(data).length === 0) return summary(current);
  return summary(await tx.db.batch.update({ where: { id: input.id }, data, select: SELECT }));
}

/**
 * Clôturer ou rouvrir (valeur cible, idempotent). Verrou exclusif du lot : un rattachement (T13, verrou
 * partagé) en cours termine avant, et aucun ne se glisse après la clôture.
 */
export async function setBatchStatus(tx: Tx, input: SetBatchStatusData): Promise<BatchSummary> {
  const { batches } = await tx.lock({ batches: { update: [input.id] } });
  if (batches.length === 0) throw new DomainError("NOT_FOUND", BATCH_NOT_FOUND);
  const current = await tx.db.batch.findUniqueOrThrow({ where: { id: input.id }, select: SELECT });
  if (current.status === input.status) return summary(current);
  return summary(await tx.db.batch.update({ where: { id: input.id }, data: { status: input.status }, select: SELECT }));
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Pourquoi un lot ne se supprime pas (06 E06), ou null s'il est vide de toute histoire. */
export function batchDeletionRefusal(counts: { documents: number; expenses: number; activeExpenses: number }): string | null {
  const { documents, expenses, activeExpenses } = counts;
  if (documents > 0 && activeExpenses > 0) {
    return `Impossible : ${plural(documents, "document", "documents")} et ${plural(activeExpenses, "dépense", "dépenses")} rattachés. Clôture-le plutôt.`;
  }
  if (documents > 0) {
    return `Impossible : ${plural(documents, "document rattaché", "documents rattachés")}. Clôture-le plutôt.`;
  }
  if (activeExpenses > 0) {
    return `Impossible : ${plural(activeExpenses, "dépense rattachée", "dépenses rattachées")}. Clôture-le plutôt.`;
  }
  if (expenses > 0) return "Impossible : ce lot a un historique de dépenses. Clôture-le plutôt.";
  return null;
}

/**
 * Supprimer un lot créé par erreur (02 §4.4, 03 §4.4) : refusé dès qu'un document est rattaché ou
 * qu'une dépense a été saisie, même supprimée depuis (sa pièce contre-passée reste au journal). Les clés
 * `Restrict` doublent la règle en base. Un lot déjà absent est un succès (renvoi après coupure).
 */
export async function deleteBatch(tx: Tx, id: string): Promise<BatchDeletion> {
  const { batches } = await tx.lock({ batches: { update: [id] } });
  if (batches.length === 0) return { id, deleted: false };
  const documents = await tx.db.saleDocument.count({ where: { batchId: id } });
  const expenses = await tx.db.batchExpense.findMany({
    where: { batchId: id },
    select: { movement: { select: { reversedBy: { select: { id: true } } } } },
  });
  const refusal = batchDeletionRefusal({
    documents,
    expenses: expenses.length,
    activeExpenses: expenses.filter((expense) => expense.movement.reversedBy === null).length,
  });
  if (refusal) throw new DomainError("CONFLICT", refusal);
  await tx.db.batch.delete({ where: { id }, select: { id: true } });
  return { id, deleted: true };
}
