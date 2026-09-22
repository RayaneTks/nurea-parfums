import type { PocketSummary } from "@/contracts/treasury";
import { parseRateInput, rateFromDb, toDb } from "@/domain/money";

/**
 * Modèles purs de E08 — Réglages (06 E08, 02 §5 N2 et N3). Aucune dépendance React : ce qui décide
 * de ce que l'écran affiche et de ce qu'il envoie se teste sans navigateur.
 */

/** Poche proposée à l'encaissement, telle que la rangée l'écrit : `null` ⇒ « Non attribué » (N2). */
export const UNASSIGNED_LABEL = "Non attribué";

/**
 * Nom de la poche proposée. Le réglage vaut `null` quand aucune poche n'est choisie : c'est « Non
 * attribué » qui est proposée — on l'écrit, on ne laisse jamais la rangée vide.
 */
export function defaultPocketLabel(pockets: readonly PocketSummary[], defaultPocketId: string | null): string {
  if (defaultPocketId === null) return pockets.find((pocket) => pocket.isSystem)?.name ?? UNASSIGNED_LABEL;
  return pockets.find((pocket) => pocket.id === defaultPocketId)?.name ?? UNASSIGNED_LABEL;
}

/** Poches qu'on peut proposer par défaut, dans l'ordre choisi (S21) : « Non attribué » n'en est pas une (06 S07). */
export function selectablePockets(pockets: readonly PocketSummary[]): PocketSummary[] {
  return pockets.filter((pocket) => !pocket.isSystem && !pocket.archived);
}

/**
 * L'ordre des poches ne veut dire quelque chose qu'à partir de deux poches rangées : à une seule, la
 * rangée « Ordre des poches » n'est pas une option, c'est du bruit (05 §5.3).
 */
export function canOrderPockets(pockets: readonly PocketSummary[]): boolean {
  return selectablePockets(pockets).length >= 2;
}

/** Le taux en base (« 277.0000 », « 245.5000 ») tel qu'on le SAISIT : « 277 », « 245,5 ». */
export function rateToInputText(stored: string): string {
  return toDb(rateFromDb(stored)).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1").replace(".", ",");
}

/**
 * Le taux saisi, sous la forme de la base, ou `null` s'il est illisible ou nul. Même lecture que le
 * contrat (`parseRateInput`) : l'écran ne valide jamais autrement que le serveur.
 */
export function rateToStored(text: string): string | null {
  const rate = parseRateInput(text);
  return rate === null ? null : toDb(rate);
}

/** Vrai si la saisie dit le même taux que celui enregistré : rien à envoyer. */
export function sameRate(text: string, stored: string): boolean {
  const parsed = rateToStored(text);
  return parsed !== null && parsed === toDb(rateFromDb(stored));
}
