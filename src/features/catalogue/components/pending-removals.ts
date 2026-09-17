"use client";

import { useSyncExternalStore } from "react";

/**
 * Suppressions différées en cours (06 §4.3 : `ConfirmDialog` puis 5 s avec « Annuler »).
 *
 * Pendant ces 5 secondes l'écriture n'est pas partie : la liste du catalogue, où l'on vient d'être
 * renvoyé, montrerait encore la fiche qu'on vient de supprimer. Ce petit registre de session la masque
 * aussitôt ; « Annuler » ou un échec de l'écriture la rendent. Il vit hors des composants : il survit à la
 * navigation qui suit la confirmation.
 */

export type RemovalKey = `parfum:${number}` | `marque:${string}`;

let pending = new Set<RemovalKey>();
const listeners = new Set<() => void>();

function emit(next: Set<RemovalKey>) {
  pending = next;
  for (const listener of listeners) listener();
}

export const pendingRemovals = {
  add(key: RemovalKey) {
    emit(new Set(pending).add(key));
  },
  remove(key: RemovalKey) {
    if (!pending.has(key)) return;
    const next = new Set(pending);
    next.delete(key);
    emit(next);
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: ReadonlySet<RemovalKey> = new Set<RemovalKey>();

/** Clés en attente de suppression (« parfum:12 », « marque:br_1 »). */
export function usePendingRemovals(): ReadonlySet<RemovalKey> {
  return useSyncExternalStore(
    subscribe,
    () => pending,
    () => EMPTY,
  );
}
