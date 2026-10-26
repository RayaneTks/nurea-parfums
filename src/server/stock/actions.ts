"use server";
import "server-only";
import { removeStockBottleInput } from "@/contracts/stock";
import { defineAction } from "@/server/core/define-action";
import { inTransaction } from "@/server/db/transaction";
import * as stockWriter from "@/server/stock/writer";

/** « Retirer du stock » un flacon (cassé, gardé, offert hors vente), après le filet « Annuler » de l'écran. */
export const removeStockBottleAction = defineAction("stock.remove", removeStockBottleInput, (input) =>
  inTransaction((tx) => stockWriter.removeStockBottle(tx, input.id)),
);
