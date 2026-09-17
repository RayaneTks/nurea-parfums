/**
 * Contrat des lots, partie lot (04 §3.4 ; écrans E05, E06, E21, S11). Les dépenses de lot
 * (`addBatchExpenseAction`, `deleteBatchExpenseAction`) arrivent avec le moteur de l'argent (J6).
 */
import { z } from "zod";
import "./zod-fr";
import { entityId, optionalDate, optionalText } from "./fields";

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
