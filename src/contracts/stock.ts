/**
 * Contrat des flacons en stock (docs/admin/desistements.md ; écran « En stock » sous Catalogue).
 *
 * Un flacon naît du désistement d'une commande confirmée et reste disponible tant qu'aucune vente ne le
 * reprend. Distinct du compteur `Perfume.stock`, que Nuréa ne suit pas.
 */
import { z } from "zod";
import "./zod-fr";
import type { MoneyString } from "@/domain/money";
import { entityId } from "./fields";

export const removeStockBottleInput = z.object({ id: entityId });
export type RemoveStockBottleInput = z.input<typeof removeStockBottleInput>;

export type StockBottleDTO = {
  id: string;
  perfumeId: number | null;
  perfumeName: string;
  brandName: string | null;
  imageUrl: string | null;
  volumeMl: number | null;
  /** Prix prévu : celui de la commande désistée. */
  plannedPriceEur: MoneyString;
  /** Coût d'achat en euros, repris à la revente ; null = inconnu. */
  unitCostEur: MoneyString | null;
  /** Coût d'achat en dinars et son taux (chaînes décimales exactes), repris tels quels sur la ligne de revente. */
  unitCostDzd: string | null;
  exchangeRate: string | null;
  /** Nom du client désisté, copié au désistement. */
  sourceCustomer: string | null;
  sourceDocumentId: string | null;
  /** Date de la commande d'origine (ISO) ; null si elle a été supprimée depuis. */
  sourceOrderedAt: string | null;
  /** Entrée en stock (ISO). */
  createdAt: string;
};
