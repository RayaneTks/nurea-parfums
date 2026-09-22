"use server";
import "server-only";
import {
  adjustInput,
  archivePocketInput,
  createPocketInput,
  deletePocketInput,
  reverseMovementInput,
  supplierPaymentInput,
  transferInput,
  updatePocketInput,
} from "@/contracts/treasury";
import { defineAction } from "@/server/core/define-action";
import { inTransaction } from "@/server/db/transaction";
import * as treasuryWriter from "@/server/treasury/writer";

/** Actions du module trésorerie (04 §3.4) : poches (S14, S16, S21) et mouvements manuels (S15, E04). */

/** Créer une poche (S16), éventuellement proposée par défaut. */
export const createPocketAction = defineAction("treasury.createPocket", createPocketInput, (input) =>
  inTransaction((tx) => treasuryWriter.createPocket(tx, input)),
);

/** Renommer, changer de nature, réordonner (S14, S21). */
export const updatePocketAction = defineAction("treasury.updatePocket", updatePocketInput, (input) =>
  inTransaction((tx) => treasuryWriter.updatePocket(tx, input)),
);

/** T15 — Archiver une poche à solde nul (hors « Non attribué »). */
export const archivePocketAction = defineAction("treasury.archivePocket", archivePocketInput, (input) =>
  inTransaction((tx) => treasuryWriter.archivePocket(tx, input.id)),
);

/** Supprimer une poche non système sans aucun mouvement (poche créée par erreur). */
export const deletePocketAction = defineAction("treasury.deletePocket", deletePocketInput, (input) =>
  inTransaction((tx) => treasuryWriter.deletePocket(tx, input.id)),
);

/** T11 — Transfert entre poches, ou « Répartir le non attribué ». */
export const transferAction = defineAction("treasury.transfer", transferInput, (input) =>
  inTransaction((tx) => treasuryWriter.transfer(tx, input)),
);

/** Ajustement signé (raison exigée). */
export const adjustAction = defineAction("treasury.adjust", adjustInput, (input) =>
  inTransaction((tx) => treasuryWriter.adjust(tx, input)),
);

/** Paiement fournisseur : sort de la Trésorerie sans toucher la Marge nette. */
export const recordSupplierPaymentAction = defineAction("treasury.supplierPayment", supplierPaymentInput, (input) =>
  inTransaction((tx) => treasuryWriter.recordSupplierPayment(tx, input)),
);

/** T12 — Annuler un mouvement manuel (les deux jambes d'un transfert). */
export const reverseMovementAction = defineAction("treasury.reverseMovement", reverseMovementInput, (input) =>
  inTransaction((tx) => treasuryWriter.reverseMovement(tx, input.movementId)),
);
