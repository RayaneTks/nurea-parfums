"use server";
import "server-only";
import {
  assignDocumentsToBatchInput,
  changeDocumentStatusInput,
  createDocumentInput,
  deleteDocumentInput,
  setLineDeliveredInput,
  updateDocumentInput,
} from "@/contracts/documents";
import { defineAction } from "@/server/core/define-action";
import { inTransaction } from "@/server/db/transaction";
import * as documentsWriter from "@/server/documents/writer";

/**
 * Actions du module documents (04 §3.4). Chacune ouvre UNE transaction autour du corps écrit par le
 * writer (03 §4.3) ; session, validation, traduction des erreurs et invalidation sont portées par
 * `defineAction`. Paiements à la création, annulation (T5), défaire un geste (T4b) et actions composées
 * qui encaissent : J6.
 */

/** T1 — Vendre (vente directe) ou prendre une commande, lot dès la création (N9), client créé en ligne. */
export const createDocumentAction = defineAction("documents.create", createDocumentInput, (input) =>
  inTransaction((tx) => documentsWriter.createDocument(tx, input)),
);

/** T2 — Modifier les lignes en place, le client, la livraison prévue, les notes. */
export const updateDocumentAction = defineAction("documents.update", updateDocumentInput, (input) =>
  inTransaction((tx) => documentsWriter.updateDocument(tx, input)),
);

/** T3 — Pointer une livraison (valeur absolue, bornée). */
export const setLineDeliveredAction = defineAction("documents.setLineDelivered", setLineDeliveredInput, (input) =>
  inTransaction((tx) => documentsWriter.setLineDelivered(tx, input)),
);

/** T4 — Livrer, revenir, confirmer, réactiver (réserves confirmées par `confirm: true`). */
export const changeDocumentStatusAction = defineAction("documents.changeStatus", changeDocumentStatusInput, (input) =>
  inTransaction((tx) => documentsWriter.changeDocumentStatus(tx, input)),
);

/** T6 — Supprimer un document sans paiement (undo 5 s côté shell). */
export const deleteDocumentAction = defineAction("documents.delete", deleteDocumentInput, (input) =>
  inTransaction((tx) => documentsWriter.deleteDocument(tx, input.documentId)),
);

/** T13 — Rattacher, retirer ou déplacer des documents entre lots (unitaire ou en masse). */
export const assignDocumentsToBatchAction = defineAction(
  "documents.assignToBatch",
  assignDocumentsToBatchInput,
  (input) => inTransaction((tx) => documentsWriter.assignDocumentsToBatch(tx, input)),
);
