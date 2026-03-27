"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { CatalogFilterDrawer } from "@/components/home/CatalogFilterDrawer";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/features/Hero";
import { FeaturedSection } from "@/components/features/FeaturedSection";
import { PerfumeCard } from "@/components/features/PerfumeCard";
import { Footer } from "@/components/layout/Footer";
import { Separator } from "@/components/ui/Separator";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  categories,
  fuzzySearchMatch,
  suggestSimilarPerfumes,
  findExternalPerfumeHint,
  getPerfumesByIds,
  compareSearchRelevance,
  EXTERNAL_SEARCH_FALLBACK_MESSAGE,
  type Category,
  type ExternalPerfumeHint,
  type Perfume,
} from "@/lib/data";
import { formatExternalSuggestionDisplay } from "@/lib/formatExternalSuggestionDisplay";
import type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";
import { brandSlug } from "@/lib/slugify";
import type {
  ExternalPerfumeSuggestion,
  PerfumeSearchResponse,
} from "@/lib/perfumeSearchTypes";

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
        Ce parfum ou cette maison n&apos;est pas présenté en fiche sur la
        vitrine. Écrivez-nous : la maison confirme commandes et alternatives
        possibles.
      </p>
    );
  }
  return (
    <p className="mt-3 text-[12px] leading-relaxed text-[var(--nurea-text-subtle)]">
      Pour un conseil ou une commande précise, passez par la page Contact :
      nous reprenons l&apos;échange avec vous.
    </p>
  );
}

const FEATURED_IDS = [9, 10];

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

type HomePageClientProps = {
  catalogPerfumes: Perfume[];
  browseBrands: CatalogBrowseBrand[];
};

function resolveBrandSlug(p: Perfume): string {
  return p.brandSlug ?? brandSlug(p.brand);
}

export const HomePageClient = ({ catalogPerfumes, browseBrands }: HomePageClientProps) => {
  const router = useRouter();
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
  const [scrolled, setScrolled] = useState(false);
  const [activeItem, setActiveItem] = useState<number | null>(null);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const paramsStringRef = useRef<string | null>(null);
  const catalogScrollSkipRef = useRef(true);

  const [searchFallback, setSearchFallback] = useState<SearchFallbackState>({
    kind: "idle",
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const curr = searchParams.toString();
    if (paramsStringRef.current === null) {
      paramsStringRef.current = curr;
      return;
    }
    if (paramsStringRef.current === curr) return;
    paramsStringRef.current = curr;
    setSearchTerm(searchParams.get("q")?.trim() ?? "");
    setSelectedCategory(categoryFromSearchParams(searchParams));
    setSortKey(sortFromSearchParams(searchParams));
    setMaisonSlug(searchParams.get("maison")?.trim() ?? "");
    const brandsRaw = searchParams.get("brands")?.trim();
    setSelectedBrandSlugs(brandsRaw ? new Set(brandsRaw.split(",").filter(Boolean)) : new Set());
  }, [searchParams]);

  useEffect(() => {
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
      const href = qs ? `${pathname}?${qs}` : pathname;
      if (qs === searchParams.toString()) return;
      router.replace(href, { scroll: false });
    }, 280);
    return () => window.clearTimeout(t);
  }, [
    searchTerm,
    selectedCategory,
    sortKey,
    maisonSlug,
    selectedBrandSlugs,
    pathname,
    router,
    searchParams,
  ]);

  const featuredPerfumes = useMemo(
    () => catalogPerfumes.filter((p) => FEATURED_IDS.includes(p.id)),
    [catalogPerfumes]
  );

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

  useEffect(() => {
    const q = searchTerm.trim();
    const noLocal = filteredPerfumes.length === 0;

    if (q.length < 3 || !noLocal) {
      setSearchFallback({ kind: "idle" });
      return;
    }

    setSearchFallback({ kind: "loading" });

    const ac = new AbortController();
    const debounceId = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q });
        if (selectedCategory !== "Tout voir") {
          params.set("cat", selectedCategory);
        }
        const res = await fetch(`/api/perfume-search?${params}`, {
          signal: ac.signal,
        });
        if (!res.ok) {
          if (!ac.signal.aborted) setSearchFallback({ kind: "error" });
          return;
        }
        const data = (await res.json()) as PerfumeSearchResponse;
        if (ac.signal.aborted) return;
        setSearchFallback({ kind: "success", data });
      } catch {
        if (!ac.signal.aborted) setSearchFallback({ kind: "error" });
      }
    }, 400);

    return () => {
      window.clearTimeout(debounceId);
      ac.abort();
    };
  }, [searchTerm, selectedCategory, filteredPerfumes.length]);

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
  const showFeatured = !hasCollectionFilters;

  const scrollCatalogIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById("collection")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  }, []);

  useEffect(() => {
    if (catalogScrollSkipRef.current) {
      catalogScrollSkipRef.current = false;
      return;
    }
    setActiveItem(null);
    scrollCatalogIntoView();
  }, [selectedCategory, sortKey, scrollCatalogIntoView]);

  useEffect(() => {
    setActiveItem(null);
  }, [searchTerm]);

  const handleResetFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedCategory("Tout voir");
    setSortKey("default");
    setMaisonSlug("");
    setSelectedBrandSlugs(new Set());
  }, []);

  const externalHint = useMemo(
    () => (searchTerm.trim() ? findExternalPerfumeHint(searchTerm) : null),
    [searchTerm]
  );

  const apiSuggestion =
    searchFallback.kind === "success" &&
    searchFallback.data.type === "external_suggestion"
      ? searchFallback.data.suggestion
      : null;

  const showExtendedSearchLoading =
    searchTerm.trim().length >= 3 &&
    sortedPerfumes.length === 0 &&
    searchFallback.kind === "loading";

  const inspirationWhenEmpty = useMemo(() => {
    if (!searchTerm.trim()) return catalogPerfumes.slice(0, 6);
    if (apiSuggestion) {
      const label = formatExternalSuggestionDisplay(
        apiSuggestion,
        searchTerm.trim()
      );
      return suggestSimilarPerfumes(label, catalogPerfumes, 6);
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
  }, [searchTerm, externalHint, apiSuggestion, catalogPerfumes]);

  const openBrowse = useCallback(() => {
    setBrowseOpen(true);
    scrollCatalogIntoView();
  }, [scrollCatalogIntoView]);

  const handleResetPanelFilters = useCallback(() => {
    setMaisonSlug("");
    setSelectedBrandSlugs(new Set());
  }, []);

  const handleFilterApply = useCallback((brands: Set<string>) => {
    setSelectedBrandSlugs(brands);
    setMaisonSlug("");
    setSelectedCategory("Tout voir");
    setBrowseOpen(false);
  }, []);

  const getDrawerResultCount = useCallback(
    (brands: Set<string>) =>
      catalogPerfumes.filter((perfume) => {
        const slug = resolveBrandSlug(perfume);
        return brands.size === 0 || brands.has(slug);
      }).length,
    [catalogPerfumes],
  );

  return (
    <div
      id="main-content"
      className="grain flex min-h-screen flex-col bg-[var(--nurea-bg)] text-[var(--nurea-text)]"
    >
      <Navbar scrolled={scrolled} onOpenBrowse={openBrowse} />

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

      <Hero />
      <Separator variant="copper" withMonogram />

      {showFeatured && (
        <div>
          <FeaturedSection perfumes={featuredPerfumes} />
          <Separator variant="bordeaux" />
        </div>
      )}

      <main
        id="collection"
        className="mx-auto w-full max-w-[1200px] flex-grow scroll-mt-[calc(env(safe-area-inset-top,0px)+3.75rem)] px-4 py-12 pb-[max(3.5rem,env(safe-area-inset-bottom,0px))] md:scroll-mt-[calc(env(safe-area-inset-top,0px)+4.5rem)] md:px-10 md:py-24"
      >
        <ScrollReveal className="mb-8 md:mb-12">
          <div>
            <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--nurea-accent)] md:text-[12px]">
              Catalogue
            </span>
            <h2 className="font-serif text-[clamp(24px,5vw,36px)] leading-tight text-[var(--nurea-text)]">
              La Collection
            </h2>
            <span className="mt-1.5 block text-[11px] tracking-[0.1em] text-[var(--nurea-text-muted)]">
              {filteredPerfumes.length} création
              {filteredPerfumes.length !== 1 ? "s" : ""}
            </span>
            <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-[var(--nurea-text-muted)]">
              Maisons et références en vitrine : pour une disponibilité, un
              arrivage ou un avis, écrivez à la maison Nurea Parfums via la page
              Contact.
            </p>
          </div>
        </ScrollReveal>

        <div className="sticky z-30 -mx-4 mb-4 border-b border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-4 pb-3 [top:calc(env(safe-area-inset-top,0px)+3.625rem)] md:mx-0 md:mb-3 md:px-0 md:top-[calc(env(safe-area-inset-top,0px)+4.25rem)]">
          <ScrollReveal className="mb-0" delay={80}>
            <div className="relative mb-3">
              <label htmlFor={CATALOG_SEARCH_ID} className="sr-only">
                Rechercher un parfum, une maison, une marque ou un mot-clé
              </label>
              <p className="mb-2 text-[11px] text-[var(--nurea-text-subtle)] md:hidden">
                L’icône « Filtrer » en haut à droite ouvre les filtres marque
                et type ; ce champ reste votre recherche libre.
              </p>
              <Search
                size={18}
                className="pointer-events-none absolute left-0 top-1/2 z-[1] -translate-y-1/2 text-[var(--nurea-text-muted)]"
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
                placeholder="Maison, parfum, gamme, note…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full min-h-[48px] border-b border-[var(--nurea-border-hover)] bg-transparent py-3 pl-9 pr-11 text-base leading-snug text-[var(--nurea-text)] transition-colors duration-300 placeholder:text-[var(--nurea-text-subtle)] focus:border-[var(--nurea-accent)] focus:outline-none touch-manipulation md:min-h-[52px] md:text-[15px]"
              />
              {searchTerm.trim() !== "" && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-0 top-1/2 z-[1] flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[var(--nurea-text-muted)] transition-colors hover:text-[var(--nurea-accent)] active:scale-95"
                  aria-label="Effacer la recherche"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              )}
            </div>

            <div className="no-scrollbar flex gap-0.5 overflow-x-auto border-b border-[var(--nurea-border)]/80 pb-px">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setSelectedBrandSlugs(new Set());
                  }}
                  className={`relative shrink-0 min-h-[44px] px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-nurea-label transition-all duration-300 touch-manipulation md:px-4 md:py-3 md:text-[12px] ${
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
          <label className="flex min-w-[min(100%,220px)] flex-1 items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)]">
            Trier
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              aria-label="Trier le catalogue"
              className="min-h-[44px] min-w-0 flex-1 border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] px-3 py-2 text-base font-medium normal-case tracking-normal text-[var(--nurea-text)] focus:border-[var(--nurea-accent)] focus:outline-none touch-manipulation md:text-[11px]"
            >
              <option value="default">Ordre du catalogue</option>
              <option value="name">Nom (A-Z)</option>
              <option value="brand">Marque (A-Z)</option>
            </select>
          </label>
        </div>

        {hasActiveFilters && (
          <div className="mb-6 flex flex-wrap items-center gap-1.5 animate-fade-in-up">
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
                onRemove={() => setSelectedCategory("Tout voir")}
              />
            )}
            {maisonSlug.trim() !== "" && (
              <FilterChip
                label={`Maison : ${maisonDisplayName}`}
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
              className="ml-1 min-h-[44px] px-1 text-[10px] uppercase tracking-nurea-label text-[var(--nurea-text-muted)] transition-colors hover:text-[var(--nurea-accent)] touch-manipulation"
            >
              Tout effacer
            </button>
          </div>
        )}

        {sortedPerfumes.length === 0 ? (
          <div className="py-16 md:py-20">
            <div className="mx-auto max-w-xl text-center">
              {searchTerm.trim() !== "" ? (
                <>
                  {showExtendedSearchLoading ? (
                    <>
                      <p className="mb-3 font-serif text-xl text-[var(--nurea-text)] md:text-2xl">
                        Recherche en cours…
                      </p>
                      <p className="mb-2 text-[13px] leading-relaxed text-[var(--nurea-text-muted)]">
                        Nous vérifions également des sources au-delà du catalogue
                        affiché.
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
                        » ?
                      </p>
                      <p className="mb-4 text-[13px] leading-relaxed text-[var(--nurea-text-muted)]">
                        Cette référence n&apos;est pas encore en fiche ici.
                        La maison Nurea Parfums peut confirmer une disponibilité,
                        un arrivage ou une alternative : contactez-nous.
                      </p>
                      <button
                        type="button"
                        disabled
                        title="Fonction à venir"
                        className="w-full border border-[var(--nurea-border)] bg-transparent px-4 py-3 text-[10px] font-medium uppercase tracking-nurea-label text-[var(--nurea-text-muted)] opacity-60 md:w-auto md:min-w-[240px]"
                      >
                        Ajouter ce parfum au catalogue
                      </button>
                      <span className="sr-only">
                        Identifiant externe : {apiSuggestion.externalId}
                      </span>
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
                    Élargissez la recherche ou explorez nos suggestions
                    ci-dessous.
                  </p>
                </>
              )}
              <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/contact"
                  className="btn-nurea text-[10px] md:text-[11px]"
                >
                  Nous contacter
                </Link>
              </div>
            </div>
            {inspirationWhenEmpty.length > 0 && (
              <div className="mt-12">
                <p className="mb-5 text-center text-[10px] uppercase tracking-[0.28em] text-[var(--nurea-text-muted)]">
                  {searchTerm.trim() !== ""
                    ? "Pistes dans notre sélection"
                    : "Inspirations"}
                </p>
                <div className="catalogue-grid stagger-grid">
                  {inspirationWhenEmpty.map((perfume, index) => (
                    <PerfumeCard
                      key={perfume.id}
                      perfume={perfume}
                      activeItem={activeItem}
                      setActiveItem={setActiveItem}
                      featured={perfume.category === "Gammes Complètes"}
                      imagePriority={index < 6}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="catalogue-grid stagger-grid">
            {sortedPerfumes.map((perfume, index) => (
              <PerfumeCard
                key={perfume.id}
                perfume={perfume}
                activeItem={activeItem}
                setActiveItem={setActiveItem}
                featured={perfume.category === "Gammes Complètes"}
                imagePriority={index < 6}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
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
    className="inline-flex min-h-[44px] max-w-full items-center gap-2 rounded-sm border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] px-3 py-2 text-left text-[10px] text-[var(--nurea-text)] transition-colors hover:border-[var(--nurea-accent)] active:scale-[0.99]"
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
