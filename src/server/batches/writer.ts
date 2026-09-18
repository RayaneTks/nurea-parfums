import "server-only";
import type {
  AddBatchExpenseData,
  BatchDeletion,
  BatchExpenseDeletion,
  BatchExpenseSummary,
  BatchSummary,
  CreateBatchData,
  SetBatchStatusData,
  UpdateBatchData,
  UpdateBatchExpenseData,
} from "@/contracts/batches";
import { futureDateMessage, valueDateOf } from "@/contracts/treasury";
import { DomainError } from "@/domain/errors";
import { eur, eurFromDb, eurFromWire, toWire } from "@/domain/money";
import { batchDeletionRefusal } from "@/server/batches/refusal";
import type { Tx } from "@/server/db/transaction";
import * as settingsWriter from "@/server/settings/writer";
import * as movements from "@/server/treasury/movements";
import * as treasuryWriter from "@/server/treasury/writer";

/**
 * Seul fichier qui écrit `Batch` et `BatchExpense` (03 §4.2, 04 §4.3).
 *
 * Le lot lui-même (J5) — créer, renommer, dater, annoter, clôturer, rouvrir, supprimer un lot vide — et ses
 * dépenses (J6) : T9 ajouter (la pièce ici, son euro par `treasury/movements.ts`, même transaction), T10
 * supprimer (contre-passation du mouvement, la pièce reste). Le rattachement des documents (T13) écrit
 * `SaleDocument` : il appartient au writer `documents`.
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

// ── Dépenses (T9, T10) ─────────────────────────────────────────────────────────

const EXPENSE_NOT_FOUND = "Cette dépense n'existe plus. Recharge le lot pour voir sa version à jour.";

const EXPENSE_SELECT = {
  id: true,
  batchId: true,
  label: true,
  notes: true,
  movement: { select: { id: true, pocketId: true, amount: true, occurredAt: true, reversedBy: { select: { id: true } } } },
} as const;

type ExpenseRow = {
  id: string;
  batchId: string;
  label: string;
  notes: string | null;
  movement: { id: string; pocketId: string; amount: { toString(): string }; occurredAt: Date; reversedBy: { id: string } | null };
};

function expenseSummary(row: ExpenseRow): BatchExpenseSummary {
  return {
    id: row.id,
    batchId: row.batchId,
    label: row.label,
    notes: row.notes,
    // Le mouvement d'une dépense sort (−) : la dépense se lit en positif.
    amount: toWire(eur.neg(eurFromDb(row.movement.amount))),
    pocketId: row.movement.pocketId,
    occurredAt: row.movement.occurredAt.toISOString(),
    movementId: row.movement.id,
  };
}

function findExpense(tx: Tx, id: string): Promise<ExpenseRow | null> {
  return tx.db.batchExpense.findUnique({ where: { id }, select: EXPENSE_SELECT });
}

/**
 * T9 — ajouter une dépense (S12) : la pièce et son mouvement `EXPENSE` négatif dans la même transaction,
 * datable mais jamais dans le futur. Un lot clos accepte ses dépenses tardives. Verrous : lot en partage (sa
 * suppression attend), poche EXCLUSIVEMENT (une sortie : « Non attribué » jamais négatif). La poche choisie
 * devient la poche proposée (N2). Double envoi du même identifiant : la dépense existante (04 §3.6).
 */
export async function addBatchExpense(tx: Tx, input: AddBatchExpenseData): Promise<BatchExpenseSummary> {
  const early = await findExpense(tx, input.id);
  if (early) return expenseSummary(early);

  const pocketId = await treasuryWriter.resolvePocketId(tx, input.pocketId);
  const { batches } = await tx.lock({ batches: { share: [input.batchId] }, pockets: { update: [pocketId] } });
  if (batches.length === 0) throw new DomainError("NOT_FOUND", BATCH_NOT_FOUND);
  const replay = await findExpense(tx, input.id);
  if (replay) return expenseSummary(replay);

  const occurredAt = valueDateOf(input.occurredAt, tx.now);
  if (occurredAt === null) throw new DomainError("VALIDATION", futureDateMessage("dépense"), "occurredAt");
  const movement = await movements.insertMovement(tx, {
    pocketId,
    kind: "EXPENSE",
    direction: "out",
    amount: eurFromWire(input.amount),
    occurredAt,
    label: input.label,
  });
  const created = await tx.db.batchExpense.create({
    data: { id: input.id, batchId: input.batchId, label: input.label, notes: input.notes ?? null, movementId: movement.id },
    select: EXPENSE_SELECT,
  });
  await settingsWriter.rememberPocket(tx, pocketId);
  return expenseSummary(created);
}

/**
 * Modifier une dépense (06 E06 zone 4, S12 en modification) : SEULS le libellé et les notes — le trigger
 * `batch_expense_append_only` refuse tout le reste, et la sheet le dit avant qu'on essaie. Le libellé du
 * mouvement suit : sans cela le journal (E04) garderait l'ancien nom de la même dépense.
 * Un appel sans changement rend la dépense telle quelle ; une dépense supprimée ne se renomme plus.
 */
export async function updateBatchExpense(tx: Tx, input: UpdateBatchExpenseData): Promise<BatchExpenseSummary> {
  const found = await findExpense(tx, input.id);
  if (!found) throw new DomainError("NOT_FOUND", EXPENSE_NOT_FOUND);
  await tx.lock({ batches: { share: [found.batchId] } });
  const current = (await findExpense(tx, input.id)) as ExpenseRow;
  if (current.movement.reversedBy !== null) {
    throw new DomainError("CONFLICT", "Cette dépense a été supprimée : elle ne se modifie plus.");
  }
  const data = {
    ...(input.label !== undefined ? { label: input.label } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  };
  if (Object.keys(data).length === 0) return expenseSummary(current);
  const updated = await tx.db.batchExpense.update({ where: { id: input.id }, data, select: EXPENSE_SELECT });
  if (input.label !== undefined && input.label !== current.label) {
    await movements.setMovementLabel(tx, current.movement.id, input.label);
  }
  return expenseSummary(updated);
}

/**
 * T10 — supprimer une dépense (E06) : son mouvement est contre-passé à sa date (03 §4.4) ; la pièce reste,
 * annulée (dérivé : son mouvement a un `reversedBy`), hors des listes et de la Marge nette. Déjà supprimée :
 * succès sans écriture (renvoi après coupure). L'entrée d'argent n'exige qu'un verrou partagé de la poche.
 */
export async function deleteBatchExpense(tx: Tx, id: string): Promise<BatchExpenseDeletion> {
  const found = await findExpense(tx, id);
  if (!found) throw new DomainError("NOT_FOUND", EXPENSE_NOT_FOUND);
  await tx.lock({ batches: { share: [found.batchId] }, pockets: { share: [found.movement.pocketId] } });
  const expense = (await findExpense(tx, id)) as ExpenseRow;
  if (expense.movement.reversedBy !== null) return { id, deleted: false };
  await movements.insertReversal(tx, expense.movement.id);
  return { id, deleted: true };
}
