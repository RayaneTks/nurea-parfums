/**
 * Lecture du stock d'un parfum et réserve de plancher (03 §4.7, 04 §11).
 *
 * `Perfume.stock` est un compteur physique, tous volumes confondus :
 * `null` = non suivi (aucune écriture automatique, aucun badge, aucune alerte) ;
 * `0` = rupture. `null` ferme les « fausses alertes massives » de l'existant, où un
 * parfum jamais inventorié s'affichait en rupture (01 §2.3 n°10).
 */
import { NeedsConfirmation } from "./errors";

/** Seuil d'alerte « Stock bas », en unités (valeur de l'existant). */
export const LOW_STOCK_THRESHOLD = 3;

export type StockStatus = "untracked" | "out" | "low" | "ok";

export function stockStatus(stock: number | null, threshold = LOW_STOCK_THRESHOLD): StockStatus {
  if (stock === null) return "untracked";
  // ≤ 0 plutôt que = 0 : une ligne reprise à −2 (avant le CHECK) reste une rupture, pas « ok ».
  if (stock <= 0) return "out";
  if (stock <= threshold) return "low";
  return "ok";
}

/** Libellés d'écran (06 §1.7) ; « Non suivi » ne s'affiche que sur la fiche, jamais en badge. */
export function stockLabel(status: StockStatus): string {
  switch (status) {
    case "untracked":
      return "Non suivi";
    case "out":
      return "Rupture";
    case "low":
      return "Stock bas";
    case "ok":
      return "En stock";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * Effet d'un delta de quantités livrées sur le stock d'UN parfum (déjà agrégé par parfum,
 * lu sous verrou par `applyDeliveredDeltas`). `deliveredDelta` > 0 : des unités sortent ;
 * < 0 : elles reviennent (annulation, retour arrière).
 *
 * Jamais négatif en silence (CHECK `perfume_stock_ck`) : si le delta dépasse le stock, la
 * réserve est rendue et `next` vaut déjà la valeur confirmée, 0. À l'appelant de lever
 * `NeedsConfirmation` tant que la réserve n'est pas confirmée.
 */
export function applyDeliveredDelta(input: {
  stock: number | null;
  deliveredDelta: number;
  perfumeName: string;
}): { next: number | null; reserve: string | null } {
  const { stock, deliveredDelta, perfumeName } = input;
  if (!Number.isSafeInteger(deliveredDelta)) {
    throw new RangeError(`applyDeliveredDelta: delta entier attendu, reçu ${deliveredDelta}`);
  }
  if (stock === null) return { next: null, reserve: null };
  const next = stock - deliveredDelta;
  if (next >= 0) return { next, reserve: null };
  return {
    next: 0,
    reserve:
      stock <= 0
        ? `${perfumeName} est en rupture : la fiche restera à 0.`
        : `Stock de ${perfumeName} à ${stock} : la fiche passera à 0.`,
  };
}

/** Dialogue d'un geste dont seules des réserves de stock restent à confirmer (06 S18). */
export function insufficientStock(reserves: readonly string[]): NeedsConfirmation {
  return new NeedsConfirmation("Stock insuffisant", reserves, "Continuer");
}
