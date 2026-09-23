"use server";
import "server-only";
import {
  assignDocumentsToBatchInput,
  attachLineToCatalogueInput,
  cancelDocumentInput,
  changeDocumentStatusInput,
  createDocumentInput,
  deleteDocumentInput,
  deliverAndCollectInput,
  revertDocumentChangeInput,
  setLineDeliveredInput,
  updateDocumentInput,
} from "@/contracts/documents";
import { defineAction, withNotice } from "@/server/core/define-action";
import { inTransaction } from "@/server/db/transaction";
import * as documentsWriter from "@/server/documents/writer";

/**
 * Actions du module documents (04 §3.4). Chacune ouvre UNE transaction autour du corps écrit par le
 * writer (03 §4.3) ; session, validation, traduction des erreurs et invalidation sont portées par
 * `defineAction`.
 */

/**
 * T1 — Vendre (vente directe + « Reçu maintenant », N1) ou prendre une commande (+ acompte), lot dès la
 * création (N9), client créé en ligne.
 */
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

/** T4 — Livrer, revenir, confirmer, réactiver (réserves confirmées par `confirm: true`). Renvoie le jeton de T4b. */
/** Recolle une vente passée au parfum entré au catalogue depuis (ni argent ni stock touchés). */
export const attachLineToCatalogueAction = defineAction("documents.attachLineToCatalogue", attachLineToCatalogueInput, (input) =>
  inTransaction((tx) => documentsWriter.attachLineToCatalogue(tx, input)),
);

export const changeDocumentStatusAction = defineAction("documents.changeStatus", changeDocumentStatusInput, (input) =>
  inTransaction((tx) => documentsWriter.changeDocumentStatus(tx, input)),
);

/**
 * T4b — « Annuler » du toast après livrer, « Livrer et encaisser », changer de statut ou encaisser : état
 * d'avant rétabli et paiements du geste contre-passés, en une transaction ; `CONFLICT` si le document a changé.
 */
export const revertDocumentChangeAction = defineAction("documents.revertChange", revertDocumentChangeInput, (input) =>
  inTransaction(async (tx) => {
    const { result, notice } = await documentsWriter.revertDocumentChange(tx, input.token);
    return notice ? withNotice(result, notice) : result;
  }),
);

/** T5 — Annuler un document, avec les remboursements choisis (S03). */
export const cancelDocumentAction = defineAction("documents.cancel", cancelDocumentInput, (input) =>
  inTransaction((tx) => documentsWriter.cancelDocument(tx, input)),
);

/** A-5 — « Encaisser et livrer » (S02 variante Livrer) : T7 puis T4 en une transaction. Renvoie le jeton de T4b. */
export const deliverAndCollectAction = defineAction("documents.deliverAndCollect", deliverAndCollectInput, (input) =>
  inTransaction((tx) => documentsWriter.deliverAndCollect(tx, input)),
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
