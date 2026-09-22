/**
 * Tirer pour rafraîchir (05 §4.3) : mécanique du geste, sans DOM. Conservée de l'existant (seuil
 * 64 px, résistance, plafond) avec sa correction : la fin suit le rafraîchissement réel, et
 * l'indicateur reste au moins 300 ms pour ne pas clignoter sur un réseau rapide.
 */

export const PULL_THRESHOLD_PX = 64;
export const PULL_MAX_PX = 96;
export const PULL_RESISTANCE = 0.5;
export const REFRESH_MIN_VISIBLE_MS = 300;
/** Au-delà, l'indicateur se retire même si la réponse n'est pas arrivée : il ne ment pas indéfiniment. */
export const REFRESH_GIVE_UP_MS = 15_000;

/** Distance affichée pour un déplacement du doigt vers le bas (px). */
export function pullDistance(deltaY: number): number {
  if (deltaY <= 0) return 0;
  return Math.min(PULL_MAX_PX, deltaY * PULL_RESISTANCE);
}

export function isPullReady(distance: number): boolean {
  return distance >= PULL_THRESHOLD_PX;
}

/** Attente restante avant de retirer l'indicateur, rafraîchissement terminé. */
export function remainingVisibleMs(startedAt: number, now: number): number {
  return Math.max(0, REFRESH_MIN_VISIBLE_MS - (now - startedAt));
}
