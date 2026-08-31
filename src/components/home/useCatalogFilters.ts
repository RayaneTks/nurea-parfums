"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { categories, type Category } from "@/lib/data";

export type SortKey = "default" | "name" | "brand";

export interface CatalogFilters {
  /** Recherche libre. */
  query: string;
  category: Category;
  sort: SortKey;
  /** Marque unique, ouverte depuis une fiche « gamme complète ». */
  brandSlug: string;
  /** Sélection multiple, venue du panneau de filtres. */
  brandSlugs: ReadonlySet<string>;
}

const EMPTY_FILTERS: CatalogFilters = {
  query: "",
  category: "Tout voir",
  sort: "default",
  brandSlug: "",
  brandSlugs: new Set(),
};

function readFilters(params: URLSearchParams): CatalogFilters {
  const rawCategory = params.get("cat") ?? "";
  const rawSort = params.get("sort") ?? "";
  const rawBrands = params.get("brands")?.trim() ?? "";

  return {
    query: params.get("q")?.trim() ?? "",
    category: categories.includes(rawCategory as Category)
      ? (rawCategory as Category)
      : "Tout voir",
    sort: rawSort === "name" || rawSort === "brand" ? rawSort : "default",
    brandSlug: params.get("maison")?.trim() ?? "",
    brandSlugs: new Set(rawBrands ? rawBrands.split(",").filter(Boolean) : []),
  };
}

function writeFilters(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.category !== "Tout voir") params.set("cat", filters.category);
  if (filters.sort !== "default") params.set("sort", filters.sort);
  if (filters.brandSlug) params.set("maison", filters.brandSlug);
  if (filters.brandSlugs.size > 0) {
    params.set("brands", [...filters.brandSlugs].join(","));
  }
  return params.toString();
}

/**
 * État des filtres du catalogue, miroir de la barre d'adresse.
 *
 * L'URL est la forme partageable de l'écran : une recherche, une catégorie ou
 * une marque se transmet par simple copier-coller, et le bouton « précédent »
 * du navigateur revient à l'état précédent plutôt que de quitter la page.
 *
 * L'écriture est différée et passe par `replaceState` : taper dans le champ de
 * recherche ne doit pas empiler une entrée d'historique par caractère.
 */
export function useCatalogFilters() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<CatalogFilters>(() =>
    readFilters(new URLSearchParams(searchParams.toString()))
  );

  /* Retour / suivant du navigateur : on relit l'URL, sans la réécrire. */
  useEffect(() => {
    const onPopState = () => {
      setFilters(readFilters(new URLSearchParams(window.location.search)));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const serialized = useMemo(() => writeFilters(filters), [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (serialized === window.location.search.replace(/^\?/, "")) return;
      window.history.replaceState(
        null,
        "",
        serialized ? `${pathname}?${serialized}` : pathname
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [serialized, pathname]);

  const update = useCallback((patch: Partial<CatalogFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);

  /** Choisir une catégorie annule les filtres de marque : ils se contredisent. */
  const selectCategory = useCallback((category: Category) => {
    setFilters((current) => ({
      ...current,
      category,
      brandSlug: "",
      brandSlugs: new Set(),
    }));
  }, []);

  const reset = useCallback(() => setFilters(EMPTY_FILTERS), []);

  /** Le tri seul ne restreint rien : il ne compte pas comme un filtre actif. */
  const hasNarrowingFilters =
    filters.query !== "" ||
    filters.category !== "Tout voir" ||
    filters.brandSlug !== "" ||
    filters.brandSlugs.size > 0;

  return {
    filters,
    update,
    selectCategory,
    reset,
    hasNarrowingFilters,
    hasAnyFilter: hasNarrowingFilters || filters.sort !== "default",
  };
}
