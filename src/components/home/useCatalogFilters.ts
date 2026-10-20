"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { categories, type Category } from "@/lib/data";

export type SortKey = "default" | "name" | "brand";
/** Colonnes sur téléphone ; +1 à 768 px, +2 à 1024 px (04-PLAN-EXECUTION § B.5). */
export type Density = 1 | 2 | 3;

/** Taille d'une page de la grille : « Charger la suite » en ajoute autant (`?n=`). */
export const PAGE_SIZE = 24;

export interface CatalogFilters {
  /** Recherche libre. */
  query: string;
  category: Category;
  sort: SortKey;
  /** Marque unique, ouverte depuis une carte de gamme. */
  brandSlug: string;
  /** Sélection multiple, venue du panneau de filtres. */
  brandSlugs: ReadonlySet<string>;
  /** Nombre de parfums affichés (`?n=`), multiple de `PAGE_SIZE`. */
  n: number;
  density: Density;
}

const EMPTY_FILTERS: CatalogFilters = {
  query: "",
  category: "Tout voir",
  sort: "default",
  brandSlug: "",
  brandSlugs: new Set(),
  n: PAGE_SIZE,
  density: 2,
};

export function readFilters(params: URLSearchParams): CatalogFilters {
  const rawCategory = params.get("cat") ?? "";
  const rawSort = params.get("sort") ?? "";
  const rawBrands = params.get("brands")?.trim() ?? "";
  const rawDensity = params.get("densite");

  return {
    query: params.get("q")?.trim() ?? "",
    category: categories.includes(rawCategory as Category)
      ? (rawCategory as Category)
      : "Tout voir",
    sort: rawSort === "name" || rawSort === "brand" ? rawSort : "default",
    brandSlug: params.get("maison")?.trim() ?? "",
    brandSlugs: new Set(rawBrands ? rawBrands.split(",").filter(Boolean) : []),
    n: readCount(params.get("n")),
    density: rawDensity === "1" || rawDensity === "3" ? Number(rawDensity) as Density : 2,
  };
}

/** `?n=` : arrondi à la page supérieure, borné (une adresse trafiquée ne rend pas 10 000 cartes). */
function readCount(raw: string | null): number {
  const value = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(value) || value <= PAGE_SIZE) return PAGE_SIZE;
  return Math.min(Math.ceil(value / PAGE_SIZE) * PAGE_SIZE, 40 * PAGE_SIZE);
}

export function writeFilters(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.category !== "Tout voir") params.set("cat", filters.category);
  if (filters.sort !== "default") params.set("sort", filters.sort);
  if (filters.brandSlug) params.set("maison", filters.brandSlug);
  if (filters.brandSlugs.size > 0) {
    params.set("brands", [...filters.brandSlugs].join(","));
  }
  if (filters.n > PAGE_SIZE) params.set("n", String(filters.n));
  if (filters.density !== 2) params.set("densite", String(filters.density));
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

  /** Changer ce qu'on regarde (recherche, tri, marques…) repart de la première page ; la densité et `n`, non. */
  const update = useCallback((patch: Partial<CatalogFilters>) => {
    const keepsPage = Object.keys(patch).every((key) => key === "n" || key === "density");
    setFilters((current) => ({ ...current, ...(keepsPage ? {} : { n: PAGE_SIZE }), ...patch }));
  }, []);

  /** Choisir une catégorie annule les filtres de marque : ils se contredisent. */
  const selectCategory = useCallback((category: Category) => {
    setFilters((current) => ({
      ...current,
      category,
      brandSlug: "",
      brandSlugs: new Set(),
      n: PAGE_SIZE,
    }));
  }, []);

  /** « Tout effacer » vide les filtres, pas la densité choisie. */
  const reset = useCallback(() => setFilters((current) => ({ ...EMPTY_FILTERS, density: current.density })), []);

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
