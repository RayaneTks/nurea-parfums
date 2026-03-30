"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Search, X } from "lucide-react";
import { PerfumeCard } from "@/components/features/PerfumeCard";
import { CatalogSkeleton } from "@/components/features/PerfumeCardSkeleton";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  categories,
  fuzzySearchMatch,
  suggestSimilarPerfumes,
  findExternalPerfumeHint,
  getPerfumesByIds,
  compareSearchRelevance,
  normalizeForFuzzy,
  EXTERNAL_SEARCH_FALLBACK_MESSAGE,
  type Category,
  type ExternalPerfumeHint,
  type Perfume,
} from "@/lib/data";
import { formatExternalSuggestionDisplay } from "@/lib/search/formatExternalSuggestionDisplay";
import type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";
import { brandSlug } from "@/lib/slugify";
import type {
  ExternalPerfumeSuggestion,
  PerfumeSearchResponse,
} from "@/lib/search/perfumeSearchTypes";

// Lazy load the drawer
const CatalogFilterDrawer = dynamic(
  () => import("./CatalogFilterDrawer").then((mod) => mod.CatalogFilterDrawer),
  { ssr: false }
);

type SearchFallbackState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "success"; data: PerfumeSearchResponse };

function ExternalSearchFootnote({ hint }: { hint: ExternalPerfumeHint }) {
  const mode = hint.footnote ?? "default";
  if (mode === "none") return null;
  if (mode === "legacy-offline") {
    return (
      <p className="mt-3 text-[12px] leading-relaxed text-[var(--nurea-text-subtle)]">
        Ce parfum ou cette Marque n&apos;est pas présenté en fiche sur le Catalogue Nuréa Parfums. Écrivez-nous : la Marque confirme commandes et alternatives possibles.
      </p>
    );
  }
  return (
    <p className="mt-3 text-[12px] leading-relaxed text-[var(--nurea-text-subtle)]">
      Pour un conseil ou une commande précise, passez par la page Contact : nous reprenons l&apos;échange avec vous.
    </p>
  );
}

type SortKey = "default" | "name" | "brand";

const CATALOG_SEARCH_ID = "catalog-search";

function categoryFromSearchParams(p: URLSearchParams): Category {
  const raw = p.get("cat");
  if (!raw) return "Tout voir";
  try {
    const decoded = decodeURIComponent(raw);
    return categories.includes(decoded as Category)
      ? (decoded as Category)
      : "Tout voir";
  } catch {
    return "Tout voir";
  }
}

function sortFromSearchParams(p: URLSearchParams): SortKey {
  const s = p.get("sort");
  if (s === "name" || s === "brand") return s;
  return "default";
}

type CatalogSectionProps = {
  catalogPerfumes: Perfume[];
  browseBrands: CatalogBrowseBrand[];
};

function resolveBrandSlug(p: Perfume): string {
  return p.brandSlug ?? brandSlug(p.brand);
}

export const CatalogSection = ({ catalogPerfumes, browseBrands }: CatalogSectionProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get("q")?.trim() ?? ""
  );
  const [selectedCategory, setSelectedCategory] = useState<Category>(() =>
    categoryFromSearchParams(searchParams)
  );
  const [sortKey, setSortKey] = useState<SortKey>(() =>
    sortFromSearchParams(searchParams)
  );
  const [maisonSlug, setMaisonSlug] = useState(
    () => searchParams.get("maison")?.trim() ?? ""
  );
  const [selectedBrandSlugs, setSelectedBrandSlugs] = useState<Set<string>>(() => {
    const raw = searchParams.get("brands")?.trim();
    return raw ? new Set(raw.split(",").filter(Boolean)) : new Set();
  });
  const [activeItem, setActiveItem] = useState<number | null>(null);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showFullCatalog, setShowFullCatalog] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const catalogScrollSkipRef = useRef(true);

  const [searchFallback, setSearchFallback] = useState<SearchFallbackState>({
    kind: "idle",
  });

  useEffect(() => {
    setMounted(true);
    
    // Listen for open-catalog-browse event (from Navbar)
    const handleOpenBrowse = () => {
      setBrowseOpen(true);
      scrollToCatalogTop();
    };
    window.addEventListener('open-catalog-browse', handleOpenBrowse);
    return () => window.removeEventListener('open-catalog-browse', handleOpenBrowse);
  }, []);

  // Sync state from URL only on initial mount or popstate (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSearchTerm(params.get("q")?.trim() ?? "");
      setSelectedCategory(categoryFromSearchParams(params));
      setSortKey(sortFromSearchParams(params));
      setMaisonSlug(params.get("maison")?.trim() ?? "");
      const brandsRaw = params.get("brands")?.trim();
      setSelectedBrandSlugs(brandsRaw ? new Set(brandsRaw.split(",").filter(Boolean)) : new Set());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Update URL side-effect (Debounced)
  useEffect(() => {
    if (!mounted) return;
    const t = window.setTimeout(() => {
      const next = new URLSearchParams();
      const q = searchTerm.trim();
      if (q) next.set("q", q);
      if (selectedCategory !== "Tout voir") next.set("cat", selectedCategory);
      if (sortKey !== "default") next.set("sort", sortKey);
      const m = maisonSlug.trim();
      if (m) next.set("maison", m);
      if (selectedBrandSlugs.size > 0) next.set("brands", [...selectedBrandSlugs].join(","));

      const qs = next.toString();
      const currentQs = window.location.search.replace(/^\?/, "");

      if (qs !== currentQs) {
        const href = qs ? `${pathname}?${qs}` : pathname;
        window.history.replaceState(null, "", href);
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [
    searchTerm,
    selectedCategory,
    sortKey,
    maisonSlug,
    selectedBrandSlugs,
    pathname,
    mounted
  ]);

  const maisonDisplayName = useMemo(() => {
    const s = maisonSlug.trim();
    if (!s) return "";
    return browseBrands.find((b) => b.slug === s)?.name ?? s;
  }, [browseBrands, maisonSlug]);

  const filteredPerfumes = useMemo(
    () =>
      catalogPerfumes.filter((perfume) => {
        const matchSearch = fuzzySearchMatch(perfume, searchTerm);
        const matchCategory =
          selectedCategory === "Tout voir" ||
          perfume.category === selectedCategory;
        const slug = resolveBrandSlug(perfume);
        const matchMaison = !maisonSlug.trim() || slug === maisonSlug.trim();
        const matchBrands =
          selectedBrandSlugs.size === 0 || selectedBrandSlugs.has(slug);
        return matchSearch && matchCategory && matchMaison && matchBrands;
      }),
    [
      catalogPerfumes,
      searchTerm,
      selectedCategory,
      maisonSlug,
      selectedBrandSlugs,
    ]
  );

  const resultLabel = useMemo(() => {
    const count = filteredPerfumes.length;
    if (count === 0) return "0 résultat";

    const hasRanges = filteredPerfumes.some(p => p.category === "Gammes Complètes");
    const hasPerfumes = filteredPerfumes.some(p => p.category === "Sélections Individuelles" || p.category === "Nouveautés");

    if (hasRanges && !hasPerfumes) {
      return `${count} marque${count > 1 ? "s" : ""}`;
    }
    if (!hasRanges && hasPerfumes) {
      return `${count} parfum${count > 1 ? "s" : ""}`;
    }
    return `${count} résultat${count > 1 ? "s" : ""}`;
  }, [filteredPerfumes]);

  const sortedPerfumes = useMemo(() => {
    const list = [...filteredPerfumes];
    const q = searchTerm.trim();
    if (q && sortKey === "default") {
      list.sort((a, b) => compareSearchRelevance(a, b, q));
    } else if (sortKey === "name") {
      list.sort((a, b) =>
        a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
      );
    } else if (sortKey === "brand") {
      list.sort((a, b) => {
        const byBrand = a.brand.localeCompare(b.brand, "fr", {
          sensitivity: "base",
        });
        return byBrand !== 0
          ? byBrand
          : a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
      });
    }
    return list;
  }, [filteredPerfumes, sortKey, searchTerm]);

  const hasCollectionFilters =
    searchTerm.trim() !== "" ||
    selectedCategory !== "Tout voir" ||
    maisonSlug.trim() !== "" ||
    selectedBrandSlugs.size > 0;
  const hasActiveFilters = hasCollectionFilters || sortKey !== "default";

  const shouldTruncateCatalog = !hasCollectionFilters && !showFullCatalog && sortedPerfumes.length > 12;        
  const displayedPerfumes = shouldTruncateCatalog
    ? sortedPerfumes.slice(0, 12)
    : sortedPerfumes;

  const scrollToCatalogTop = useCallback((instant = false) => {
    const el = document.getElementById("collection");
    if (!el) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          const offset = 85;
          const bodyRect = document.body.getBoundingClientRect().top;
          const elementRect = el.getBoundingClientRect().top;
          const elementPosition = elementRect - bodyRect;
          const offsetPosition = elementPosition - offset;

          window.scrollTo({
            top: offsetPosition,
            behavior: instant ? "auto" : "smooth"
          });
        }, 60);
      });
    });
  }, []);

  const handleCategoryChange = (category: Category) => {
    if (category === selectedCategory) return;
    setActiveItem(null);
    setSelectedCategory(category);
    setSelectedBrandSlugs(new Set());
    setMaisonSlug("");

    if (window.scrollY > 400) {
      scrollToCatalogTop();
    }
  };

  useEffect(() => {
    if (catalogScrollSkipRef.current) {
      catalogScrollSkipRef.current = false;
      return;
    }
    setActiveItem(null);
  }, [sortKey]);

  useEffect(() => {
    setActiveItem(null);
  }, [searchTerm]);

  const handleResetFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedCategory("Tout voir");
    setSortKey("default");
    setMaisonSlug("");
    setSelectedBrandSlugs(new Set());
    setShowFullCatalog(false);
    scrollToCatalogTop();
  }, [scrollToCatalogTop]);

  const externalHint = useMemo(
    () => (searchTerm.trim() ? findExternalPerfumeHint(searchTerm) : null),
    [searchTerm]
  );

  const apiSuggestion =
    searchFallback.kind === "success" &&
    searchFallback.data.type === "external_suggestion"
      ? searchFallback.data.suggestion
      : null;

  const apiSuggestionBrandRangeMatch = useMemo(() => {
    if (!apiSuggestion) return null;
    const brand = (apiSuggestion.brand ?? "").trim();
    if (!brand || brand === "—") return null;
    return (
      catalogPerfumes.find(
        (p) =>
          p.category === "Gammes Complètes" &&
          p.brand.toLowerCase() === brand.toLowerCase()
      ) ?? null
    );
  }, [apiSuggestion, catalogPerfumes]);

  const showExtendedSearchLoading =
    searchTerm.trim().length >= 3 &&
    sortedPerfumes.length === 0 &&
    searchFallback.kind === "loading";

  const inspirationWhenEmpty = useMemo(() => {
    if (!searchTerm.trim()) return catalogPerfumes.slice(0, 6);
    if (apiSuggestion) {
      const base = apiSuggestionBrandRangeMatch
        ? [apiSuggestionBrandRangeMatch]
        : [];
      const label = formatExternalSuggestionDisplay(apiSuggestion, searchTerm.trim());
      const suggestions = suggestSimilarPerfumes(label, catalogPerfumes, 6);
      const merged: Perfume[] = [];
      const seen = new Set<number>();
      for (const p of [...base, ...suggestions]) {
        if (merged.length >= 6) break;
        if (!seen.has(p.id)) {
          seen.add(p.id);
          merged.push(p);
        }
      }
      return merged;
    }
    if (externalHint) {
      const fromHint = getPerfumesByIds(
        externalHint.similarCatalogIds,
        catalogPerfumes
      );
      const rest = suggestSimilarPerfumes(searchTerm, catalogPerfumes, 6);
      const merged: Perfume[] = [];
      const seen = new Set<number>();
      for (const p of [...fromHint, ...rest]) {
        if (merged.length >= 6) break;
        if (!seen.has(p.id)) {
          seen.add(p.id);
          merged.push(p);
        }
      }
      return merged;
    }
    return [];
  }, [
    searchTerm,
    externalHint,
    apiSuggestion,
    apiSuggestionBrandRangeMatch,
    catalogPerfumes,
  ]);

  const handleFilterApply = useCallback((brands: Set<string>) => {
    setSelectedBrandSlugs(brands);
    setMaisonSlug("");
    setSelectedCategory("Tout voir");
    setBrowseOpen(false);
    scrollToCatalogTop();
  }, [scrollToCatalogTop]);

  const handleResetPanelFilters = useCallback(() => {
    setMaisonSlug("");
    setSelectedBrandSlugs(new Set());
  }, []);

  const getDrawerResultCount = useCallback(
    (brands: Set<string>) =>
      catalogPerfumes.filter((perfume) => {
        const slug = resolveBrandSlug(perfume);
        return brands.size === 0 || brands.has(slug);
      }).length,
    [catalogPerfumes],
  );

  // Sync scroll visibility with intelligent threshold and tolerance
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let accumulatedScroll = 0;
    const TOLERANCE = 60; // Pixels avant de déclencher le hide/show

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;
      const direction = delta > 0 ? "down" : "up";
      
      const catalogEl = document.getElementById("collection");
      const catalogTop = catalogEl?.offsetTop ?? 400;
      const stickyThreshold = catalogTop + 100;
      
      const isInCatalog = currentScrollY > stickyThreshold;
      
      if (isInCatalog) {
        if ((direction === "down" && accumulatedScroll >= 0) || (direction === "up" && accumulatedScroll <= 0)) {
          accumulatedScroll += delta;
        } else {
          accumulatedScroll = delta;
        }

        if (direction === "down" && Math.abs(accumulatedScroll) > TOLERANCE) {
          setIsHeaderVisible(false);
        } else if (direction === "up" && Math.abs(accumulatedScroll) > TOLERANCE) {
          setIsHeaderVisible(true);
        }
      } else {
        setIsHeaderVisible(true);
        accumulatedScroll = 0;
      }
      
      setShowScrollTop(currentScrollY > 1000);
      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <CatalogFilterDrawer
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        brands={browseBrands}
        mounted={mounted}
        selectedBrandSlugs={selectedBrandSlugs}
        getResultCount={getDrawerResultCount}
        onApply={handleFilterApply}
        onReset={handleResetPanelFilters}
      />

      <main
        id="collection"
        className="mx-auto w-full max-w-[1200px] flex-grow scroll-mt-[calc(env(safe-area-inset-top,0px)+3.5rem)] px-4 py-12 pb-safe-bottom md:scroll-mt-[calc(env(safe-area-inset-top,0px)+4.25rem)] md:px-10 md:py-24 min-h-[800px]"
      >
        <ScrollReveal className="mb-8 md:mb-12">
          <div>
            <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--nurea-accent)] md:text-[12px]">
              Catalogue
            </span>
            <h2 className="font-serif text-[clamp(24px,5vw,36px)] leading-tight text-[var(--nurea-text)]">      
              Le Catalogue
            </h2>
            <span className="mt-1.5 block text-[11px] tracking-[0.1em] text-[var(--nurea-text-muted)]">
              {resultLabel}
            </span>
            <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-[var(--nurea-text-muted)]">
              Découvrez notre sélection des plus grandes marques de parfums. Qualité garantie et meilleurs prix : contactez-nous sur Snapchat ou WhatsApp pour passer commande.
            </p>
          </div>
        </ScrollReveal>

        <div className={`sticky z-30 -mx-4 mb-4 border-b border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-4 pt-4 pb-3 transition-transform duration-500 ease-out-expo [top:calc(env(safe-area-inset-top,0px)+3.5rem)] md:mx-0 md:mb-3 md:px-0 md:top-[calc(env(safe-area-inset-top,0px)+4.25rem)] ${
          isHeaderVisible ? "translate-y-0" : "-translate-y-[calc(100%+env(safe-area-inset-top,0px)+4.25rem)]"  
        }`}>
          <ScrollReveal className="mb-0" delay={80}>
            <div className="relative mb-3 flex items-center">
              <label htmlFor={CATALOG_SEARCH_ID} className="sr-only">
                Rechercher une marque ou un parfum
              </label>

              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--nurea-text-muted)] z-10"
                strokeWidth={1.5}
                aria-hidden
              />
              <input
                id={CATALOG_SEARCH_ID}
                ref={searchInputRef}
                type="search"
                name="q"
                autoComplete="off"
                enterKeyHint="search"
                inputMode="search"
                placeholder="Rechercher une marque, un parfum..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full min-h-[48px] border-b border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)]/50 py-3 pl-10 pr-11 text-base leading-snug text-[var(--nurea-text)] transition-colors duration-300 placeholder:text-[var(--nurea-text-subtle)] focus:border-[var(--nurea-accent)] focus:bg-[var(--nurea-surface)] focus:outline-none touch-manipulation md:min-h-[52px] md:text-[15px] rounded-t-sm"
              />
              {searchTerm.trim() !== "" && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-0 top-0 bottom-0 flex w-12 items-center justify-center text-[var(--nurea-text-muted)] transition-colors hover:text-[var(--nurea-accent)] active:scale-95 z-10"
                  aria-label="Effacer la recherche"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              )}
            </div>

            <div className="no-scrollbar flex gap-0.5 overflow-x-auto border-b border-[var(--nurea-border)]/80 pb-px tap-highlight-transparent">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`relative shrink-0 min-h-[44px] px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-nurea-label transition-all duration-300 touch-manipulation md:px-4 md:py-3 md:text-[12px] active-scale ${
                    selectedCategory === category
                      ? "text-[var(--nurea-accent)]"
                      : "text-[var(--nurea-text-muted)] hover:text-[var(--nurea-text)]"
                  }`}
                >
                  {category}
                  <span
                    className={`absolute bottom-0 left-0 h-[2px] w-full origin-left bg-[var(--nurea-accent)] transition-transform duration-300 ${
                      selectedCategory === category
                        ? "scale-x-100"
                        : "scale-x-0"
                    }`}
                  />
                </button>
              ))}
            </div>
          </ScrollReveal>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3 md:mb-8">
          <label className="flex w-full max-w-[280px] items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)]">
            <span className="shrink-0">Trier par</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              aria-label="Trier le catalogue"
              className="min-h-[40px] min-w-0 flex-1 cursor-pointer border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] px-3 py-2 text-base font-medium normal-case tracking-normal text-[var(--nurea-text)] focus:border-[var(--nurea-accent)] focus:outline-none touch-manipulation md:text-[11px] rounded-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239A7E8E%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_16px_center] bg-no-repeat pr-10"
            >
              <option value="default">Ordre du catalogue</option>
              <option value="name">Nom (A-Z)</option>
              <option value="brand">Marque (A-Z)</option>
            </select>
          </label>
        </div>

        {hasActiveFilters && (
          <div className="mb-6 flex flex-wrap items-center gap-2 animate-fade-in-up">
            <span className="mr-1 text-[10px] uppercase tracking-nurea-wide text-[var(--nurea-text-muted)]">    
              Filtres :
            </span>
            {searchTerm.trim() !== "" && (
              <FilterChip
                label={`« ${searchTerm.trim()} »`}
                onRemove={() => setSearchTerm("")}
              />
            )}
            {selectedCategory !== "Tout voir" && (
              <FilterChip
                label={selectedCategory}
                onRemove={() => handleCategoryChange("Tout voir")}
              />
            )}
            {maisonSlug.trim() !== "" && (
              <FilterChip
                label={`Marque : ${maisonDisplayName}`}
                onRemove={() => setMaisonSlug("")}
              />
            )}
            {selectedBrandSlugs.size > 0 && (
              <FilterChip
                label={`${selectedBrandSlugs.size} marque${selectedBrandSlugs.size > 1 ? "s" : ""}`}
                onRemove={() => setSelectedBrandSlugs(new Set())}
              />
            )}
            {sortKey !== "default" && (
              <FilterChip
                label="Tri personnalisé"
                onRemove={() => setSortKey("default")}
              />
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="ml-auto min-h-[40px] px-2 text-[10px] font-bold uppercase tracking-nurea-label text-[var(--nurea-accent)] transition-colors hover:opacity-80 active-scale touch-manipulation md:ml-2"
            >
              Tout effacer
            </button>
          </div>
        )}

        {(!mounted || displayedPerfumes.length === 0) ? (
          <div className="py-16 md:py-20">
            {!mounted ? (
              <div className="mt-8">
                <CatalogSkeleton />
              </div>
            ) : (
              <div className="mx-auto max-w-xl text-center">
                {searchTerm.trim() !== "" ? (
                  <>
                    {showExtendedSearchLoading ? (
                      <>
                        <p className="mb-3 font-serif text-xl text-[var(--nurea-text)] md:text-2xl">
                          Recherche en cours...
                        </p>
                        <p className="mb-2 text-[13px] leading-relaxed text-[var(--nurea-text-muted)]">
                          Nous vérifions également nos stocks étendus.
                        </p>
                      </>
                    ) : apiSuggestion ? (
                      <div
                        data-testid="external-api-suggestion"
                        className="rounded-sm border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] px-5 py-6 text-left md:px-8 md:py-8"
                      >
                        <p className="mb-3 font-serif text-xl text-[var(--nurea-text)] md:text-2xl">
                          Vous cherchez «{" "}
                          {formatExternalSuggestionDisplay(
                            apiSuggestion,
                            searchTerm.trim()
                          )}
                          »{apiSuggestion.brand && apiSuggestion.brand !== "—"
                            ? ` de ${apiSuggestion.brand}`
                            : ""}{" "}
                          ?
                        </p>
                        <p className="mb-4 text-[13px] leading-relaxed text-[var(--nurea-text-muted)]">
                          {apiSuggestionBrandRangeMatch ? (
                            <>
                              Bonne nouvelle : la gamme complète {apiSuggestionBrandRangeMatch.brand} est déjà au catalogue. Ce parfum peut être demandé directement via la page Contact.
                            </>
                          ) : (
                            <>
                              Cette référence n&apos;est pas encore en ligne. Nuréa Parfums peut confirmer une disponibilité ou vous proposer une alternative : contactez-nous.
                            </>
                          )}
                        </p>
                        <button
                          type="button"
                          disabled
                          title="Fonction à venir"
                          className="w-full border border-[var(--nurea-border)] bg-transparent px-4 py-3 text-[10px] font-medium uppercase tracking-nurea-label text-[var(--nurea-text-muted)] opacity-60 md:w-auto md:min-w-[240px]"
                        >
                          Ajouter ce parfum au catalogue
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="mb-3 font-serif text-xl text-[var(--nurea-text)] md:text-2xl">
                          {externalHint
                            ? `Vous cherchez « ${externalHint.displayName} » ?`
                            : `Aucun résultat pour « ${searchTerm.trim()} »`}
                        </p>
                        <p className="mb-2 text-[13px] leading-relaxed text-[var(--nurea-text-muted)]">
                          {externalHint
                            ? externalHint.caption
                            : searchFallback.kind === "error"
                              ? "Le service de recherche élargie est momentanément indisponible. Vous pouvez reformuler ou nous écrire directement."
                              : EXTERNAL_SEARCH_FALLBACK_MESSAGE}
                        </p>
                        {externalHint ? (
                          <ExternalSearchFootnote hint={externalHint} />
                        ) : null}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mb-3 font-serif text-xl text-[var(--nurea-text)] md:text-2xl">
                      Aucune création ne correspond à ces filtres
                    </p>
                    <p className="mb-2 text-[13px] text-[var(--nurea-text-muted)]">
                      Élargissez la recherche ou explorez nos suggestions ci-dessous.
                    </p>
                  </>
                )}
                <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href="/contact"
                    className="btn-nurea text-[10px] md:text-[11px] active-scale"
                  >
                    Nous contacter
                  </Link>
                </div>
              </div>
            )}
            {mounted && inspirationWhenEmpty.length > 0 && (
              <div className="mt-12">
              <p className="mb-5 text-center text-[10px] uppercase tracking-[0.28em] text-[var(--nurea-text-muted)]">
                {searchTerm.trim() !== ""
                  ? "Pistes dans notre Catalogue"
                  : "Inspirations"}
              </p>                <div className="catalogue-grid stagger-grid">
                  {inspirationWhenEmpty.map((perfume, index) => (
                    <PerfumeCard
                      key={perfume.id}
                      perfume={perfume}
                      activeItem={activeItem}
                      setActiveItem={setActiveItem}
                      featured={perfume.category === "Gammes Complètes"}
                      imagePriority={index < 4}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="catalogue-grid stagger-grid w-full">
              {displayedPerfumes.map((perfume, index) => (
                <PerfumeCard
                  key={perfume.id}
                  perfume={perfume}
                  activeItem={activeItem}
                  setActiveItem={setActiveItem}
                  featured={perfume.category === "Gammes Complètes"}
                  imagePriority={index < 4}
                />
              ))}
            </div>

            {shouldTruncateCatalog && (
              <div className="mt-16 w-full flex justify-center animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[var(--nurea-accent)] to-[var(--nurea-cuivre)] rounded opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
                  <button
                    onClick={() => setShowFullCatalog(true)}
                    className="relative btn-nurea bg-[var(--nurea-surface)] border-[var(--nurea-border)] text-[var(--nurea-text)] px-8 py-4 tracking-[0.2em] text-[11px] md:text-[12px] group-hover:bg-[var(--nurea-accent-subtle)] group-hover:border-[var(--nurea-accent)] active-scale"
                  >
                    Voir tout le Catalogue ({sortedPerfumes.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Scroll to Top FAB */}
      <div className={`fixed bottom-[calc(20px+env(safe-area-inset-bottom,0px))] right-4 z-[90] transition-all duration-500 md:hidden ${showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"}`}>
        <button
          onClick={scrollToTop}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--nurea-accent)] text-white shadow-2xl active-scale tap-highlight-transparent"
          aria-label="Retour en haut"
        >
          <ArrowLeft size={20} className="rotate-90" />
        </button>
      </div>
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
    className="inline-flex min-h-[44px] max-w-full items-center gap-2 rounded-sm border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] px-3 py-2 text-left text-[10px] text-[var(--nurea-text)] transition-colors hover:border-[var(--nurea-accent)] active-scale tap-highlight-transparent shadow-sm"
    aria-label={`Retirer le filtre ${label}`}
  >
    <span className="min-w-0 flex-1 truncate">{label}</span>
    <X
      size={14}
      strokeWidth={1.5}
      className="shrink-0 text-[var(--nurea-text-muted)]"
      aria-hidden
    />
  </button>
);
