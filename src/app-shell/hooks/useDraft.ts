"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  notifyDraftChange,
  readDraft,
  removeDraft,
  storageKey,
  subscribeDraft,
  writeDraft,
  type Draft,
} from "./draft-store";

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Lit le brouillon, avec un instantané stable tant que le stockage ne change pas
 * (`useSyncExternalStore` exige la même référence entre deux lectures identiques).
 */
function useStoredDraft<T>(key: string): Draft<T> | null {
  const cache = useRef<{ raw: string | null; draft: Draft<T> | null }>({ raw: null, draft: null });
  const subscribe = useCallback((onChange: () => void) => subscribeDraft(key, onChange), [key]);
  const getSnapshot = useCallback(() => {
    const storage = browserStorage();
    if (!storage) return null;
    let raw: string | null = null;
    try {
      raw = storage.getItem(storageKey(key));
    } catch {
      return null;
    }
    if (raw !== cache.current.raw) cache.current = { raw, draft: raw === null ? null : readDraft<T>(storage, key) };
    return cache.current.draft;
  }, [key]);
  // Au rendu serveur et à l'hydratation : pas de brouillon, l'écran est identique des deux côtés.
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export type UseDraftOptions<T> = {
  /** Valeur d'un formulaire neuf. */
  initial: T;
  /** Un brouillon « vide » n'est pas gardé : il s'efface (et le point de la tab bar disparaît). */
  isEmpty?: (value: T) => boolean;
};

/**
 * Brouillon persistant d'un formulaire (04 §3.7) : sauvé à chaque changement, restauré à
 * l'ouverture, effacé au succès (`useAction({ draft })`), expiré après 24 h.
 */
export function useDraft<T>(key: string, { initial, isEmpty }: UseDraftOptions<T>) {
  const stored = useStoredDraft<T>(key);
  const [fresh] = useState(() => initial);
  const value = stored ? stored.value : fresh;

  const set = useCallback(
    (next: T | ((previous: T) => T)) => {
      const storage = browserStorage();
      if (!storage) return;
      const resolved =
        typeof next === "function" ? (next as (previous: T) => T)(readDraft<T>(storage, key)?.value ?? fresh) : next;
      if (isEmpty?.(resolved)) removeDraft(storage, key);
      else writeDraft(storage, key, resolved);
      notifyDraftChange(key);
    },
    [fresh, isEmpty, key],
  );

  const clear = useCallback(() => {
    const storage = browserStorage();
    if (!storage) return;
    removeDraft(storage, key);
    notifyDraftChange(key);
  }, [key]);

  return useMemo(
    () => ({ value, set, clear, restored: stored !== null, savedAt: stored?.savedAt ?? null }),
    [value, set, clear, stored],
  );
}

/** Présence d'un brouillon non vide, sans le lire en détail : le point de l'onglet Vendre (06 §1.5). */
export function useDraftPresence(key: string): boolean {
  return useStoredDraft<unknown>(key) !== null;
}
