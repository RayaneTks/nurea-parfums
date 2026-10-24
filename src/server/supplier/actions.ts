"use server";
import "server-only";
import {
  deleteSupplierEntryInput,
  recordSupplierEntryInput,
  setSupplierRateInput,
  updateSupplierEntryInput,
} from "@/contracts/supplier";
import { defineAction } from "@/server/core/define-action";
import { inTransaction } from "@/server/db/transaction";
import * as settingsWriter from "@/server/settings/writer";
import * as supplierWriter from "@/server/supplier/writer";

/** Noter une dette (à la main S23, depuis le sélecteur S25) ou un versement (S24). */
export const recordSupplierEntryAction = defineAction("supplier.record", recordSupplierEntryInput, (input) =>
  inTransaction((tx) => supplierWriter.recordEntry(tx, input)),
);

/** Corriger une ligne du carnet (S22). */
export const updateSupplierEntryAction = defineAction("supplier.update", updateSupplierEntryInput, (input) =>
  inTransaction((tx) => supplierWriter.updateEntry(tx, input)),
);

/** Supprimer une ligne du carnet (S22, après le filet « Annuler » de l'écran). */
export const deleteSupplierEntryAction = defineAction("supplier.delete", deleteSupplierEntryInput, (input) =>
  inTransaction((tx) => supplierWriter.deleteEntry(tx, input.id)),
);

/** Changer le taux de lecture du carnet (E22) ; le taux proposé à la vente ne bouge pas. */
export const setSupplierRateAction = defineAction("supplier.setRate", setSupplierRateInput, (input) =>
  inTransaction((tx) => settingsWriter.setSupplierRate(tx, input.rate)),
);
