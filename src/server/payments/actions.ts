"use server";
import "server-only";
import {
  collectAllInput,
  correctPaymentInput,
  recordPaymentInput,
  refundInput,
  voidPaymentInput,
} from "@/contracts/payments";
import { defineAction } from "@/server/core/define-action";
import { inTransaction } from "@/server/db/transaction";
import * as documentsWriter from "@/server/documents/writer";
import * as paymentsWriter from "@/server/payments/writer";

/**
 * Actions du module encaissements (04 §3.4). T7 et « Tout encaisser » écrivent aussi le document (confirmation
 * automatique) : leur corps vit dans `documents/writer.ts`, qui compose les pièces de `payments/writer.ts`.
 */

/**
 * T7 — Acompte, solde, encaissement depuis Encaisser : UNE action pour tout encaissement (fin de la dualité
 * `collectAction` / `recordPaymentAction`, 01 §4.2). Renvoie le jeton de T4b (« Annuler » du toast).
 */
export const recordPaymentAction = defineAction("payments.record", recordPaymentInput, (input) =>
  inTransaction((tx) => documentsWriter.recordPayment(tx, input)),
);

/** A-5 — « Tout encaisser » d'un client : un T7 par document, du plus ancien au plus récent, tout ou rien. */
export const collectAllAction = defineAction("payments.collectAll", collectAllInput, (input) =>
  inTransaction((tx) => documentsWriter.collectAll(tx, input)),
);

/** T8 — Annuler un paiement (contre-passation datée comme l'original). Ne change jamais le statut. */
export const voidPaymentAction = defineAction("payments.void", voidPaymentInput, (input) =>
  inTransaction((tx) => paymentsWriter.voidPayment(tx, input)),
);

/** T8 — Corriger montant, date ou poche : annuler + nouveau paiement, une transaction. */
export const correctPaymentAction = defineAction("payments.correct", correctPaymentInput, (input) =>
  inTransaction((tx) => paymentsWriter.correctPayment(tx, input)),
);

/** T8 — Rembourser (sortie datée du jour), plafonné au payé d'un document annulé, au trop-perçu sinon. */
export const refundAction = defineAction("payments.refund", refundInput, (input) =>
  inTransaction((tx) => paymentsWriter.refund(tx, input)),
);
