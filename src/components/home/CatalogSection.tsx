"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { PerfumeCard } from "@/components/features/PerfumeCard";
import { PerfumeDialog } from "@/components/features/PerfumeDialog";
import { buttonClass } from "@/components/ui/Button";
import { OPEN_CATALOG_FILTERS_EVENT } from "@/components/layout/Navbar";
import {
  compareSearchRelevance,
  findExternalPerfumeHint,
  fuzzySearchMatch,
  getPerfumesByIds,
  suggestSimilarPerfumes,
  type Category,
  type Perfume,
} from "@/lib/data";
import { inCategory } from "@/lib/catalog/perfumePresentation";
import type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";
import { brandSlug } from "@/lib/slugify";
import { CatalogEmptyState } from "./CatalogEmptyState";
import { CatalogToolbar } from "./CatalogToolbar";
import { PAGE_SIZE, useCatalogFilters, writeFilters, type Density } from "./useCatalogFilters";
import { useExtendedSearch } from "./useExtendedSearch";

/** Le panneau de filtres n'est chargé qu'à la première ouverture. */
const CatalogFilterDrawer = dynamic(
  () => import("./CatalogFilterDrawer").then((m) => m.CatalogFilterDrawer),
  { ssr: false }
);

interface CatalogSectionProps {
  catalogPerfumes: Perfume[];
  browseBrands: CatalogBrowseBrand[];
}

function slugOf(perfume: Perfume): string {
  return perfume.brandSlug ?? brandSlug(perfume.brand);
}

const byName = (a: Perfume, b: Perfume) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
const byBrand = (a: Perfume, b: Perfume) =>
  a.brand.localeCompare(b.brand, "fr", { sensitivity: "base" }) || byName(a, b);

/** Initiale sans accent (« É » → « E ») ; un chiffre ou un signe → « # ». */
function initialOf(brand: string): string {
  const letter = brand.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : "#";
}

/** Colonnes par densité : téléphone, puis +1 à 768 px, +2 à 1024 px (04-PLAN-EXECUTION § B.5). */
const GRID: Record<Density, string> = {
  1: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  2: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  3: "grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
};

/** Largeur affichée d'un visuel, pour que le chargeur choisisse vignette (640) ou original. */
const SIZES: Record<Density, string> = {
  1: "(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw",
  2: "(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw",
  3: "(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 20vw",
};

export const CatalogSection = ({
  catalogPerfumes,
  browseBrands,
}: CatalogSectionProps) => {
  const { filters, update, selectCategory, reset, hasNarrowingFilters, hasAnyFilter } =
    useCatalogFilters();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openedPerfume, setOpenedPerfume] = useState<Perfume | null>(null);

  /* La barre de navigation n'a pas de lien direct vers cet état : elle diffuse. */
  useEffect(() => {
    const open = () => setDrawerOpen(true);
    window.addEventListener(OPEN_CATALOG_FILTERS_EVENT, open);
    return () => window.removeEventListener(OPEN_CATALOG_FILTERS_EVENT, open);
  }, []);

  const matching = useMemo(
    () =>
      catalogPerfumes.filter((perfume) => {
        const slug = slugOf(perfume);
        return (
          fuzzySearchMatch(perfume, filters.query) &&
          inCategory(perfume, filters.category) &&
          (filters.brandSlug === "" || slug === filters.brandSlug) &&
          (filters.brandSlugs.size === 0 || filters.brandSlugs.has(slug))
        );
      }),
    [catalogPerfumes, filters]
  );

  const sorted = useMemo(() => {
    const list = [...matching];
    if (filters.sort === "name") return list.sort(byName);
    if (filters.sort === "brand") return list.sort(byBrand);
    /* Sans tri explicite, une recherche classe par pertinence. */
    if (filters.query.trim()) {
      return list.sort((a, b) => compareSearchRelevance(a, b, filters.query.trim()));
    }
    return list;
  }, [matching, filters.sort, filters.query]);

  /*
   * La grille rend les `n` premiers parfums (`?n=`, par 24) : 193 cartes d'un coup faisaient 332
   * images et 2 300 nœuds. Pour les moteurs, « Charger la suite » est un vrai lien (`?n=48`) et
   * chaque parfum a sa page indexable (`/parfums/<marque>/<nom>-<id>`, sitemap).
   */
  const visible = sorted.slice(0, filters.n);
  const remaining = sorted.length - visible.length;

  /* Rail A→Z : l'initiale de chaque marque présente, dans l'ordre « Marque A–Z ». */
  const brandOrder = useMemo(() => [...matching].sort(byBrand), [matching]);
  const letters = useMemo(() => [...new Set(brandOrder.map((p) => initialOf(p.brand)))], [brandOrder]);

  /* Après « Charger la suite » ou une lettre du rail : focus sur la carte visée, une fois rendue. */
  const [focusRequest, setFocusRequest] = useState<{ index: number; scroll: boolean } | null>(null);
  useEffect(() => {
    if (!focusRequest) return;
    const target = document.querySelector<HTMLElement>(`#collection [data-index="${focusRequest.index}"] .card-open`);
    if (target && focusRequest.scroll) target.closest("li")?.scrollIntoView({ block: "center" });
    target?.focus({ preventScroll: true });
    setFocusRequest(null);
  }, [focusRequest]);

  const loadMore = () => {
    setFocusRequest({ index: filters.n, scroll: false });
    update({ n: filters.n + PAGE_SIZE });
  };

  const jumpToLetter = (letter: string) => {
    const index = brandOrder.findIndex((p) => initialOf(p.brand) === letter);
    if (index < 0) return;
    update({ sort: "brand", n: Math.max(filters.n, Math.ceil((index + 1) / PAGE_SIZE) * PAGE_SIZE) });
    setFocusRequest({ index, scroll: true });
  };

  /* La recherche élargie ne part que si le catalogue local n'a rien donné. */
  const extendedSearch = useExtendedSearch(filters.query, sorted.length === 0);

  const externalHint = useMemo(
    () => (filters.query.trim() ? findExternalPerfumeHint(filters.query) : null),
    [filters.query]
  );

  const apiSuggestion =
    extendedSearch.status === "done" &&
    extendedSearch.response.type === "external_suggestion"
      ? extendedSearch.response.suggestion
      : null;

  /* Une suggestion externe peut viser une marque déjà présente. */
  const suggestedBrandInCatalog = useMemo(() => {
    const brand = apiSuggestion?.brand?.trim();
    if (!brand || brand === "—") return null;
    return browseBrands.find((b) => b.name.toLowerCase() === brand.toLowerCase())?.name ?? null;
  }, [apiSuggestion, browseBrands]);

  const inspirations = useMemo(() => {
    if (sorted.length > 0) return [];
    const query = filters.query.trim();
    if (!query) return catalogPerfumes.slice(0, 6);

    const candidates = [
      ...(externalHint
        ? getPerfumesByIds(externalHint.similarCatalogIds, catalogPerfumes)
        : []),
      ...suggestSimilarPerfumes(query, catalogPerfumes, 6),
    ];

    const seen = new Set<number>();
    const merged: Perfume[] = [];
    for (const perfume of candidates) {
      if (merged.length >= 6) break;
      if (seen.has(perfume.id)) continue;
      seen.add(perfume.id);
      merged.push(perfume);
    }
    return merged;
  }, [sorted.length, filters.query, catalogPerfumes, externalHint]);

  const resultLabel = useMemo(() => {
    const count = sorted.length;
    if (count === 0) return "0 résultat";
    return `${count} parfum${count > 1 ? "s" : ""}`;
  }, [sorted]);

  const brandName = useMemo(
    () =>
      browseBrands.find((b) => b.slug === filters.brandSlug)?.name ??
      filters.brandSlug,
    [browseBrands, filters.brandSlug]
  );

  /**
   * Restreindre la grille depuis le bas de page laisserait le visiteur sous
   * une liste devenue plus courte, donc face au vide. On ramène le catalogue
   * en vue — sauf s'il y est déjà, auquel cas bouger serait gratuit.
   */
  const revealCatalogTop = useCallback(() => {
    const anchor = document.getElementById("collection");
    if (!anchor || anchor.getBoundingClientRect().top >= 0) return;
    anchor.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const changeCategory = useCallback(
    (category: Category) => {
      selectCategory(category);
      revealCatalogTop();
    },
    [selectCategory, revealCatalogTop]
  );

  const openPerfume = (perfume: Perfume) => setOpenedPerfume(perfume);

  const applyBrandFilter = useCallback(
    (slugs: Set<string>) => {
      update({ brandSlugs: slugs, brandSlug: "", category: "Tout voir" });
      setDrawerOpen(false);
      revealCatalogTop();
    },
    [update, revealCatalogTop]
  );

  return (
    <>
      <CatalogFilterDrawer
        open={drawerOpen}
        brands={browseBrands}
        selected={filters.brandSlugs}
        onApply={applyBrandFilter}
        onClose={() => setDrawerOpen(false)}
      />

      {openedPerfume && (
        <PerfumeDialog
          perfume={openedPerfume}
          onClose={() => setOpenedPerfume(null)}
        />
      )}

      <section id="collection" aria-labelledby="catalogue-titre" className="page-x flex scroll-mt-32 flex-col gap-6 pb-16 md:scroll-mt-20">
        <header className="flex flex-col gap-3 pt-12">
          <h2 id="catalogue-titre" className="t-title">Le catalogue</h2>
          <p className="t-body t-measure">
            Notre sélection des plus grandes marques, pour homme et pour femme. Les prix se donnent
            en direct : écrivez-nous sur Snapchat pour commander.
          </p>
        </header>

        <CatalogToolbar
          category={filters.category}
          sort={filters.sort}
          density={filters.density}
          resultLabel={resultLabel}
          brandCount={filters.brandSlugs.size}
          onCategoryChange={changeCategory}
          onSortChange={(sort) => update({ sort })}
          onDensityChange={(density) => update({ density })}
          onOpenBrands={() => setDrawerOpen(true)}
        />

        {hasAnyFilter && (
          <div className="flex flex-wrap items-center gap-2">
            {filters.query.trim() !== "" && (
              <FilterChip label={`« ${filters.query.trim()} »`} onRemove={() => update({ query: "" })} />
            )}
            {filters.category !== "Tout voir" && (
              <FilterChip label={filters.category} onRemove={() => changeCategory("Tout voir")} />
            )}
            {filters.brandSlug !== "" && <FilterChip label={brandName} onRemove={() => update({ brandSlug: "" })} />}
            {filters.brandSlugs.size > 0 && (
              <FilterChip
                label={`${filters.brandSlugs.size} marque${filters.brandSlugs.size > 1 ? "s" : ""}`}
                onRemove={() => update({ brandSlugs: new Set() })}
              />
            )}
            {filters.sort !== "default" && <FilterChip label="Tri choisi" onRemove={() => update({ sort: "default" })} />}
            <button type="button" onClick={reset} className={buttonClass("link", "ml-auto px-2")}>
              Tout effacer
            </button>
          </div>
        )}

        {/* Rail A→Z : dès trois colonnes (768 px), parcourir sans filtrer. */}
        {sorted.length > PAGE_SIZE && letters.length > 1 && (
          <nav aria-label="Marques de A à Z" className="hidden md:block">
            <ul className="flex flex-wrap gap-1">
              {letters.map((letter) => (
                <li key={letter}>
                  <button
                    type="button"
                    onClick={() => jumpToLetter(letter)}
                    aria-label={`Marques en ${letter}`}
                    className="press flex h-11 w-11 items-center justify-center rounded-sm text-fg-2 transition-[background-color,color,transform] duration-dur-2 ease-soft mouse-hover:bg-surface-1 mouse-hover:text-fg-1"
                  >
                    {letter}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {visible.length > 0 ? (
          <>
            <ul className={`grid gap-3 md:gap-4 ${GRID[filters.density]}`}>
              {visible.map((perfume, index) => (
                <li key={perfume.id} data-index={index} className="flex min-w-0">
                  <PerfumeCard
                    perfume={perfume}
                    onOpen={openPerfume}
                    sizes={SIZES[filters.density]}
                    imagePriority={index === 0}
                  />
                </li>
              ))}
            </ul>

            {remaining > 0 && (
              <div className="flex flex-col items-center gap-2 pt-4">
                {/* Un vrai lien : sans JavaScript, et pour les moteurs, il mène à la page suivante. */}
                <a
                  href={`?${writeFilters({ ...filters, n: filters.n + PAGE_SIZE })}`}
                  onClick={(event) => {
                    event.preventDefault();
                    loadMore();
                  }}
                  className={buttonClass("outline")}
                >
                  Charger la suite
                </a>
                <p className="t-caption">
                  {visible.length} sur {sorted.length} parfums
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-12">
            <CatalogEmptyState
              query={filters.query}
              suggestedBrandInCatalog={suggestedBrandInCatalog}
              externalHint={externalHint}
              extendedSearch={extendedSearch}
            />

            {inspirations.length > 0 && (
              <section aria-labelledby="catalogue-pistes" className="flex flex-col gap-4">
                <h3 id="catalogue-pistes" className="t-subtitle">
                  {filters.query.trim() ? "Pistes au catalogue" : "Inspirations"}
                </h3>
                <ul className={`grid gap-3 md:gap-4 ${GRID[filters.density]}`}>
                  {inspirations.map((perfume) => (
                    <li key={perfume.id} className="flex min-w-0">
                      <PerfumeCard perfume={perfume} onOpen={openPerfume} sizes={SIZES[filters.density]} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        <div className="flex justify-center pt-8">
          <a href="#main-content" className={buttonClass("link")}>
            Haut de page
          </a>
        </div>
      </section>
    </>
  );
};

const FilterChip = ({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) => (
  <button
    type="button"
    onClick={onRemove}
    aria-label={`Retirer le filtre ${label}`}
    className="press inline-flex h-11 max-w-full items-center gap-2 rounded-sm bg-surface-2 px-3 text-fg-1 transition-[background-color,transform] duration-dur-2 ease-soft mouse-hover:bg-surface-1"
  >
    <span className="min-w-0 truncate">{label}</span>
    <X size={16} strokeWidth={1.5} aria-hidden className="shrink-0" />
  </button>
);
