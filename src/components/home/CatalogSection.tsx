"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { PerfumeCard } from "@/components/features/PerfumeCard";
import { PerfumeDialog } from "@/components/features/PerfumeDialog";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Button, buttonClass } from "@/components/ui/Button";
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
import { isCompleteRange } from "@/lib/catalog/perfumePresentation";
import type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";
import { brandSlug } from "@/lib/slugify";
import { CatalogEmptyState } from "./CatalogEmptyState";
import { CatalogToolbar } from "./CatalogToolbar";
import { useCatalogFilters } from "./useCatalogFilters";
import { useExtendedSearch } from "./useExtendedSearch";

/** Le panneau de filtres n'est chargé qu'à la première ouverture. */
const CatalogFilterDrawer = dynamic(
  () => import("./CatalogFilterDrawer").then((m) => m.CatalogFilterDrawer),
  { ssr: false }
);

/** Au-delà, la grille est tronquée jusqu'à demande explicite. */
const INITIAL_VISIBLE = 12;

interface CatalogSectionProps {
  catalogPerfumes: Perfume[];
  browseBrands: CatalogBrowseBrand[];
}

function slugOf(perfume: Perfume): string {
  return perfume.brandSlug ?? brandSlug(perfume.brand);
}

export const CatalogSection = ({
  catalogPerfumes,
  browseBrands,
}: CatalogSectionProps) => {
  const { filters, update, selectCategory, reset, hasNarrowingFilters, hasAnyFilter } =
    useCatalogFilters();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openedPerfume, setOpenedPerfume] = useState<Perfume | null>(null);
  const [showAll, setShowAll] = useState(false);

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
          (filters.category === "Tout voir" ||
            perfume.category === filters.category) &&
          (filters.brandSlug === "" || slug === filters.brandSlug) &&
          (filters.brandSlugs.size === 0 || filters.brandSlugs.has(slug))
        );
      }),
    [catalogPerfumes, filters]
  );

  const sorted = useMemo(() => {
    const list = [...matching];
    const byName = (a: Perfume, b: Perfume) =>
      a.name.localeCompare(b.name, "fr", { sensitivity: "base" });

    if (filters.sort === "name") return list.sort(byName);
    if (filters.sort === "brand") {
      return list.sort(
        (a, b) =>
          a.brand.localeCompare(b.brand, "fr", { sensitivity: "base" }) ||
          byName(a, b)
      );
    }
    /* Sans tri explicite, une recherche classe par pertinence. */
    if (filters.query.trim()) {
      return list.sort((a, b) => compareSearchRelevance(a, b, filters.query.trim()));
    }
    return list;
  }, [matching, filters.sort, filters.query]);

  /*
   * La grille rend TOUTES les fiches ; seule leur visibilité est tronquée.
   *
   * Elle n'en écrivait que douze dans le DOM, les autres n'apparaissant qu'au
   * clic sur « Voir les N références ». Or Google n'interagit pas avec la
   * page : son robot ne clique pas. Le catalogue déclarait donc douze noms de
   * parfum sur quatre-vingt-dix-neuf, et les quatre-vingt-sept autres étaient
   * hors de portée de toute recherche, quelles que soient les autres
   * optimisations.
   *
   * Le contenu masqué en CSS reste indexé — c'est le cas documenté des onglets
   * et des accordéons ; c'est le contenu ABSENT du DOM qui ne l'est pas. Les
   * images restent en chargement paresseux, donc aucune requête réseau
   * supplémentaire à l'affichage.
   */
  const truncated = !hasNarrowingFilters && !showAll && sorted.length > INITIAL_VISIBLE;
  const cutoff = truncated ? INITIAL_VISIBLE : sorted.length;

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

  /* La suggestion externe vise parfois une marque déjà présente : on le dit,
     et on remonte sa gamme en tête des pistes proposées. */
  const suggestedRange = useMemo(() => {
    const brand = apiSuggestion?.brand?.trim();
    if (!brand || brand === "—") return null;
    return (
      catalogPerfumes.find(
        (p) => isCompleteRange(p) && p.brand.toLowerCase() === brand.toLowerCase()
      ) ?? null
    );
  }, [apiSuggestion, catalogPerfumes]);

  const inspirations = useMemo(() => {
    if (sorted.length > 0) return [];
    const query = filters.query.trim();
    if (!query) return catalogPerfumes.slice(0, 6);

    const candidates = [
      ...(suggestedRange ? [suggestedRange] : []),
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
  }, [sorted.length, filters.query, catalogPerfumes, suggestedRange, externalHint]);

  const resultLabel = useMemo(() => {
    const count = sorted.length;
    if (count === 0) return "0 résultat";
    const ranges = sorted.some(isCompleteRange);
    const singles = sorted.some((p) => !isCompleteRange(p));
    if (ranges && !singles) return `${count} marque${count > 1 ? "s" : ""}`;
    if (singles && !ranges) return `${count} parfum${count > 1 ? "s" : ""}`;
    return `${count} résultat${count > 1 ? "s" : ""}`;
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
      setShowAll(false);
      revealCatalogTop();
    },
    [selectCategory, revealCatalogTop]
  );

  /* Une fiche « gamme » représente une marque : elle restreint la grille au
     lieu d'ouvrir un détail, qui n'aurait aucune référence à présenter. */
  const openPerfume = useCallback(
    (perfume: Perfume) => {
      if (isCompleteRange(perfume)) {
        update({ brandSlug: slugOf(perfume), brandSlugs: new Set() });
        setShowAll(false);
        revealCatalogTop();
        return;
      }
      setOpenedPerfume(perfume);
    },
    [update, revealCatalogTop]
  );

  const applyBrandFilter = useCallback(
    (slugs: Set<string>) => {
      update({ brandSlugs: slugs, brandSlug: "", category: "Tout voir" });
      setDrawerOpen(false);
      setShowAll(false);
      revealCatalogTop();
    },
    [update, revealCatalogTop]
  );

  const captionFor = useCallback(
    (perfume: Perfume) => {
      if (!isCompleteRange(perfume)) return undefined;
      const count = browseBrands.find(
        (b) => b.slug === slugOf(perfume)
      )?.publishedCount;
      return count ? `Gamme complète · ${count} référence${count > 1 ? "s" : ""}` : "Gamme complète";
    },
    [browseBrands]
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

      <section
        id="collection"
        className="nurea-page scroll-mt-[calc(env(safe-area-inset-top,0px)+3.5rem)] pb-18 md:scroll-mt-[calc(env(safe-area-inset-top,0px)+4.25rem)]"
      >
        <ScrollReveal className="py-12 md:py-18">
          <p className="nurea-label">Catalogue</p>
          <h2 className="nurea-section-title mt-4 text-nurea-text">Le catalogue</h2>
          <p className="nurea-body nurea-prose mt-4">
            Notre sélection des plus grandes marques, pour homme et pour femme.
            Les prix se donnent en direct : écrivez-nous sur Snapchat pour
            commander.
          </p>
        </ScrollReveal>

        <CatalogToolbar
          query={filters.query}
          category={filters.category}
          sort={filters.sort}
          resultLabel={resultLabel}
          onQueryChange={(query) => update({ query })}
          onCategoryChange={changeCategory}
          onSortChange={(sort) => update({ sort })}
        />

        {hasAnyFilter && (
          <div className="flex flex-wrap items-center gap-2 py-6">
            <span className="nurea-caption mr-2">Filtres</span>
            {filters.query.trim() !== "" && (
              <FilterChip
                label={`« ${filters.query.trim()} »`}
                onRemove={() => update({ query: "" })}
              />
            )}
            {filters.category !== "Tout voir" && (
              <FilterChip
                label={filters.category}
                onRemove={() => changeCategory("Tout voir")}
              />
            )}
            {filters.brandSlug !== "" && (
              <FilterChip
                label={brandName}
                onRemove={() => update({ brandSlug: "" })}
              />
            )}
            {filters.brandSlugs.size > 0 && (
              <FilterChip
                label={`${filters.brandSlugs.size} marque${filters.brandSlugs.size > 1 ? "s" : ""}`}
                onRemove={() => update({ brandSlugs: new Set() })}
              />
            )}
            {filters.sort !== "default" && (
              <FilterChip
                label="Tri personnalisé"
                onRemove={() => update({ sort: "default" })}
              />
            )}
            <button
              type="button"
              onClick={reset}
              className="nurea-label ml-auto h-11 px-2 transition-colors duration-nurea ease-out hover:text-nurea-text"
            >
              Tout effacer
            </button>
          </div>
        )}

        {sorted.length > 0 ? (
          <>
            <div className="nurea-catalogue-grid pt-6">
              {sorted.map((perfume, index) => (
                /*
                 * `display: contents` efface l'enveloppe de la mise en page :
                 * la fiche reste l'élément de grille, exactement comme avant.
                 * Masquer la fiche elle-même aurait exigé de battre le `flex`
                 * de sa classe, donc un `!important`.
                 */
                <div
                  key={perfume.id}
                  className={index < cutoff ? "contents" : "hidden"}
                >
                  <PerfumeCard
                    perfume={perfume}
                    caption={captionFor(perfume)}
                    onOpen={openPerfume}
                    imagePriority={index < 4}
                  />
                </div>
              ))}
            </div>

            {truncated && (
              <div className="flex justify-center pt-12">
                <Button variant="outline" onClick={() => setShowAll(true)}>
                  Voir les {sorted.length} références
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="pt-6">
            <CatalogEmptyState
              query={filters.query}
              suggestedBrandInCatalog={suggestedRange?.brand ?? null}
              externalHint={externalHint}
              extendedSearch={extendedSearch}
            />

            {inspirations.length > 0 && (
              <div className="pt-12">
                <p className="nurea-label mb-6">
                  {filters.query.trim() ? "Pistes au catalogue" : "Inspirations"}
                </p>
                <div className="nurea-catalogue-grid">
                  {inspirations.map((perfume) => (
                    <PerfumeCard
                      key={perfume.id}
                      perfume={perfume}
                      caption={captionFor(perfume)}
                      onOpen={openPerfume}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-center pt-18">
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
    className="inline-flex h-11 max-w-full items-center gap-2 border border-nurea-border px-3 text-sm text-nurea-muted transition-colors duration-nurea ease-out hover:bg-nurea-surface-hover hover:text-nurea-text"
  >
    <span className="min-w-0 truncate">{label}</span>
    <X size={14} strokeWidth={1.5} aria-hidden className="shrink-0" />
  </button>
);
