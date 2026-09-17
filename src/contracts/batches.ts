/**
 * Contrat des lots (04 §3.4 ; écrans E05, E06, E21, S11, S12) : le lot lui-même (J5) et ses dépenses
 * (T9, T10 — J6).
 */
import { z } from "zod";
import "./zod-fr";
import type { MoneyString } from "@/domain/money";
import { entityId, optionalDate, optionalText } from "./fields";
import { pocketChoice, positiveAmount, recordId, valueDate } from "./treasury";

export const BATCH_STATUSES = ["OPEN", "CLOSED"] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

const batchName = z
  .string()
  .trim()
  .min(2, "Donne un nom au lot (2 caractères au moins).")
  .max(120, "Raccourcis ce nom : 120 caractères au plus.");

export const createBatchInput = z.object({
  /** Facultatif : fourni par le formulaire (E21, S11), il rend un renvoi sans doublon (04 §3.6). */
  id: entityId.optional(),
  name: batchName,
  expectedAt: optionalDate,
  notes: optionalText(2000),
});

/** Renommer, dater, annoter : un champ absent n'est pas touché, une date ou une note vidée est effacée. */
export const updateBatchInput = z.object({
  id: entityId,
  name: batchName.optional(),
  expectedAt: optionalDate,
  notes: optionalText(2000),
});

/** Clôturer / rouvrir : valeur cible, idempotente. */
export const setBatchStatusInput = z.object({
  id: entityId,
  status: z.enum(BATCH_STATUSES),
});

export const deleteBatchInput = z.object({ id: entityId });

export type CreateBatchInput = z.input<typeof createBatchInput>;
export type CreateBatchData = z.output<typeof createBatchInput>;
export type UpdateBatchInput = z.input<typeof updateBatchInput>;
export type UpdateBatchData = z.output<typeof updateBatchInput>;
export type SetBatchStatusInput = z.input<typeof setBatchStatusInput>;
export type SetBatchStatusData = z.output<typeof setBatchStatusInput>;
export type DeleteBatchInput = z.input<typeof deleteBatchInput>;

export type BatchSummary = {
  id: string;
  name: string;
  status: BatchStatus;
  /** ISO 8601. */
  expectedAt: string | null;
  notes: string | null;
};

export type BatchDeletion = { id: string; deleted: boolean };

// ── Dépenses (T9, T10) ─────────────────────────────────────────────────────────

/**
 * T9 — ajouter une dépense (S12) : libellé, montant, poche, date (jamais dans le futur), notes. Un lot clos
 * accepte encore ses dépenses tardives (03 `BatchStatus`). L'identifiant vient du formulaire (04 §3.6).
 */
export const addBatchExpenseInput = z.object({
  id: entityId,
  batchId: entityId,
  label: z
    .string({ required_error: "Indique le libellé de la dépense (Transport, Douane…)." })
    .trim()
    .min(2, "Indique le libellé de la dépense (Transport, Douane…).")
    .max(120, "Raccourcis ce libellé : 120 caractères au plus."),
  amount: positiveAmount,
  pocketId: pocketChoice,
  occurredAt: valueDate,
  notes: optionalText(2000),
});

/** T10 — supprimer une dépense : son mouvement est contre-passé à sa date (03 §4.4). */
export const deleteBatchExpenseInput = z.object({ id: recordId });

export type AddBatchExpenseInput = z.input<typeof addBatchExpenseInput>;
export type AddBatchExpenseData = z.output<typeof addBatchExpenseInput>;
export type DeleteBatchExpenseInput = z.input<typeof deleteBatchExpenseInput>;

export type BatchExpenseSummary = {
  id: string;
  batchId: string;
  label: string;
  notes: string | null;
  /** Montant de la dépense, positif (son mouvement est négatif). */
  amount: MoneyString;
  pocketId: string;
  /** ISO 8601 : date de valeur. */
  occurredAt: string;
  movementId: string;
};

/** `deleted: false` : la dépense était déjà supprimée (renvoi après coupure), rien n'a été écrit. */
export type BatchExpenseDeletion = { id: string; deleted: boolean };
