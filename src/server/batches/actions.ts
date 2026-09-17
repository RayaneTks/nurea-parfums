"use server";
import "server-only";
import { createBatchInput, deleteBatchInput, setBatchStatusInput, updateBatchInput } from "@/contracts/batches";
import * as batchesWriter from "@/server/batches/writer";
import { defineAction } from "@/server/core/define-action";
import { inTransaction } from "@/server/db/transaction";

/** Créer un lot (E21, création en ligne S11). */
export const createBatchAction = defineAction("batches.create", createBatchInput, (input) =>
  inTransaction((tx) => batchesWriter.createBatch(tx, input)),
);

/** Renommer, date d'arrivée prévue, notes (E06). */
export const updateBatchAction = defineAction("batches.update", updateBatchInput, (input) =>
  inTransaction((tx) => batchesWriter.updateBatch(tx, input)),
);

/** Clôturer / rouvrir (E06). */
export const setBatchStatusAction = defineAction("batches.setStatus", setBatchStatusInput, (input) =>
  inTransaction((tx) => batchesWriter.setBatchStatus(tx, input)),
);

/** Supprimer un lot vide de toute histoire (E06). */
export const deleteBatchAction = defineAction("batches.delete", deleteBatchInput, (input) =>
  inTransaction((tx) => batchesWriter.deleteBatch(tx, input.id)),
);
