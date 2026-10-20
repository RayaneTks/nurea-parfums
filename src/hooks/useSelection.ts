"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parseSelection, readSelectionRaw, subscribeSelection } from "@/lib/selection";

/**
 * Les identifiants de « Ma sélection », dans l'ordre d'ajout. Rendu serveur = liste vide : la liste
 * vit sur l'appareil et arrive à l'hydratation. La chaîne brute sert d'instantané (stable entre deux
 * lectures), le tableau n'est reconstruit que lorsqu'elle change.
 */
export function useSelectionIds(): number[] {
  const raw = useSyncExternalStore(subscribeSelection, readSelectionRaw, () => "[]");
  return useMemo(() => parseSelection(raw), [raw]);
}
