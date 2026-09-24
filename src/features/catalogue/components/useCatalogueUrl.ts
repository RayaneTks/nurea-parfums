"use client";

import { useCallback } from "react";
import { useUrlState } from "@/app-shell/hooks/useUrlState";
import { readEnum, type UrlPatch } from "@/app-shell/hooks/url-patch";
import {
  CATALOGUE_TABS,
  RANGE_FILTERS,
  STOCK_FILTERS,
  VISIBILITY_FILTERS,
  type CatalogueTab,
  type RangeFilter,
  type StockFilter,
  type VisibilityFilter,
} from "./catalogue-model";

/** Paramètres qui filtrent la liste (06 §1.2) ; `tab` n'en fait pas partie pour « Effacer les filtres ». */
export const FILTER_KEYS = ["q", "stock", "visibilite", "gamme"] as const;

/**
 * L'état de l'écran Catalogue dans l'URL (`?tab=`, `?q=`, `?stock=`, `?visibilite=`, `?gamme=`), lu par
 * `useUrlState` — donc sous `<Suspense>` dans la page (04 §3.7).
 *
 * Écriture par `history.replaceState` : la liste se filtre sur l'instantané déjà chargé, un aller-retour
 * serveur à chaque lettre tapée ferait attendre la recherche sur un réseau 4G. Next synchronise
 * `useSearchParams` (et la mémoire d'onglet du shell) avec cette écriture.
 */
export function useCatalogueUrl() {
  const state = useUrlState();
  const tab = readEnum<CatalogueTab>(state.get("tab"), CATALOGUE_TABS, "parfums");
  const query = state.get("q") ?? "";
  const stock = state.get("stock") === null ? null : readEnum<StockFilter | "">(state.get("stock"), STOCK_FILTERS, "") || null;
  const visibility = readEnum<VisibilityFilter | "">(state.get("visibilite"), VISIBILITY_FILTERS, "") || null;
  const complete = readEnum<RangeFilter | "">(state.get("gamme"), RANGE_FILTERS, "") === "complete";
  const { hrefWith } = state;

  const write = useCallback(
    (patch: UrlPatch) => {
      const href = hrefWith(patch, { tab: "parfums" });
      window.history.replaceState(null, "", href);
    },
    [hrefWith],
  );

  return { tab, query, stock, visibility, complete, write };
}
