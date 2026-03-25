"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/features/Hero";
import { FeaturedSection } from "@/components/features/FeaturedSection";
import { PerfumeCard } from "@/components/features/PerfumeCard";
import { Footer } from "@/components/layout/Footer";
import { Separator } from "@/components/ui/Separator";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  categories,
  mockPerfumes,
  fuzzySearchMatch,
  suggestSimilarPerfumes,
  findExternalPerfumeHint,
  getPerfumesByIds,
  compareSearchRelevance,
  EXTERNAL_SEARCH_FALLBACK_MESSAGE,
  CONTACT,
  type Category,
  type ExternalPerfumeHint,
} from "@/lib/data";

function ExternalSearchFootnote({ hint }: { hint: ExternalPerfumeHint }) {
  const mode = hint.footnote ?? "default";
  if (mode === "none") return null;
  if (mode === "legacy-offline") {
    return (
      <p className="text-[12px] leading-relaxed text-[var(--nurea-text-subtle)] mt-3">
        Ce parfum ou cette maison n&apos;est pas présenté en fiche individuelle
        sur notre vitrine en ligne — la conciergerie peut vérifier une commande
        ou une alternative proche.
      </p>
    );
  }
  return (
    <p className="text-[12px] leading-relaxed text-[var(--nurea-text-subtle)] mt-3">
      Un conseil ou une commande précise : nos canaux ci-dessous complètent ce
      que vous voyez dans le catalogue.
    </p>
  );
}

/* Parfums signature pour la section featured editorial */
const FEATURED_IDS = [9, 10]; // Baccarat Rouge 540 & Aventus

type SortKey = "default" | "name" | "brand";

const CATALOG_SEARCH_ID = "catalog-search";

function categoryFromSearchParams(p: URLSearchParams): Category {
  const raw = p.get("cat");
  if (!raw) return "Tout voir";
  try {
    const decoded = decodeURIComponent(raw);
    return categories.includes(decoded as Category) ? (decoded as Category) : "Tout voir";
  } catch {
    return "Tout voir";
  }
}

function sortFromSearchParams(p: URLSearchParams): SortKey {
  const s = p.get("sort");
  if (s === "name" || s === "brand") return s;
  return "default";
}

export const HomePageClient = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("q")?.trim() ?? "");
  const [selectedCategory, setSelectedCategory] = useState<Category>(() =>
    categoryFromSearchParams(searchParams)
  );
  const [sortKey, setSortKey] = useState<SortKey>(() => sortFromSearchParams(searchParams));
  const [scrolled, setScrolled] = useState(false);
  const [activeItem, setActiveItem] = useState<number | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const paramsStringRef = useRef<string | null>(null);
  const catalogScrollSkipRef = useRef(true);
  const searchScrollSkipRef = useRef(true);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /** Navigation interne / retour navigateur : réapplique l’URL sans scroll forcé vers le hero. */
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
  }, [searchParams]);

  /** URL reflète filtres + tri (replace, sans scroll) — partageable et cohérent avec le bouton retour. */
  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = new URLSearchParams();
      const q = searchTerm.trim();
      if (q) next.set("q", q);
      if (selectedCategory !== "Tout voir") next.set("cat", selectedCategory);
      if (sortKey !== "default") next.set("sort", sortKey);
      const qs = next.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      if (qs === searchParams.toString()) return;
      router.replace(href, { scroll: false });
    }, 280);
    return () => window.clearTimeout(t);
  }, [searchTerm, selectedCategory, sortKey, pathname, router, searchParams]);

  const featuredPerfumes = useMemo(
    () => mockPerfumes.filter((p) => FEATURED_IDS.includes(p.id)),
    []
  );

  const filteredPerfumes = useMemo(() => {
    return mockPerfumes.filter((perfume) => {
      const matchSearch = fuzzySearchMatch(perfume, searchTerm);
      const matchCategory =
        selectedCategory === "Tout voir" || perfume.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [searchTerm, selectedCategory]);

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
    searchTerm.trim() !== "" || selectedCategory !== "Tout voir";

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

  /** Filtre / tri / recherche : ramener la vue en haut du catalogue (première ligne de cartes). */
  useEffect(() => {
    if (catalogScrollSkipRef.current) {
      catalogScrollSkipRef.current = false;
      return;
    }
    setActiveItem(null);
    scrollCatalogIntoView();
  }, [selectedCategory, sortKey, scrollCatalogIntoView]);

  useEffect(() => {
    if (searchScrollSkipRef.current) {
      searchScrollSkipRef.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      setActiveItem(null);
      scrollCatalogIntoView();
    }, 420);
    return () => window.clearTimeout(id);
  }, [searchTerm, scrollCatalogIntoView]);

  const handleResetFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedCategory("Tout voir");
    setSortKey("default");
  }, []);

  const externalHint = useMemo(
    () => (searchTerm.trim() ? findExternalPerfumeHint(searchTerm) : null),
    [searchTerm]
  );

  const inspirationWhenEmpty = useMemo(() => {
    if (!searchTerm.trim()) return mockPerfumes.slice(0, 6);
    if (externalHint) {
      const fromHint = getPerfumesByIds(
        externalHint.similarCatalogIds,
        mockPerfumes
      );
      const rest = suggestSimilarPerfumes(searchTerm, mockPerfumes, 6);
      const merged: typeof mockPerfumes = [];
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
  }, [searchTerm, externalHint]);

  const conciergeWhatsappHref = useMemo(() => {
    const num = CONTACT.whatsapp.match(/wa\.me\/(\d+)/)?.[1] ?? "";
    const label =
      externalHint?.displayName ?? (searchTerm.trim() || "un parfum");
    const msg = `Bonjour, je cherche « ${label} ». Pouvez-vous me le procurer ou me proposer une alternative ?`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  }, [searchTerm, externalHint]);

  const focusCatalogSearch = useCallback(() => {
    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    });
  }, []);

  return (
    <div id="main-content" className="grain flex min-h-screen flex-col bg-[var(--nurea-bg)] text-[var(--nurea-text)]">
      <Navbar scrolled={scrolled} onOpenSearch={focusCatalogSearch} />

      {/* HERO */}
      <Hero />

      {/* SEPARATOR */}
      <Separator variant="copper" withMonogram />

      {/* FEATURED EDITORIAL */}
      {showFeatured && <FeaturedSection perfumes={featuredPerfumes} />}

      {/* SEPARATOR */}
      {showFeatured && <Separator variant="bordeaux" />}

      {/* LA COLLECTION */}
      <main
        id="collection"
        className="scroll-mt-[calc(env(safe-area-inset-top,0px)+3.75rem)] md:scroll-mt-[calc(env(safe-area-inset-top,0px)+4.5rem)] w-full flex-grow max-w-[1200px] mx-auto px-4 md:px-10 py-16 pb-[max(3.5rem,env(safe-area-inset-bottom,0px))] md:py-24"
      >
        {/* Header */}
        <ScrollReveal className="mb-8 md:mb-12">
          <div>
            <span className="block mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--nurea-accent)] md:text-[12px]">
              Catalogue
            </span>
            <h2 className="font-serif text-[clamp(24px,5vw,36px)] text-[var(--nurea-text)] leading-tight">
              La Collection
            </h2>
            <span className="mt-1.5 block text-[11px] tracking-[0.1em] text-[var(--nurea-text-muted)]">
              {filteredPerfumes.length} création
              {filteredPerfumes.length !== 1 ? "s" : ""}
            </span>
          </div>
        </ScrollReveal>

        {/* Recherche unique + filtres — sticky */}
        <div className="sticky z-30 -mx-4 mb-6 border-b border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-4 pb-3 [top:calc(env(safe-area-inset-top,0px)+3.625rem)] md:top-[calc(env(safe-area-inset-top,0px)+4.25rem)] md:mx-0 md:px-0">
          <ScrollReveal className="mb-0" delay={80}>
            <div className="relative mb-3">
              <label htmlFor={CATALOG_SEARCH_ID} className="sr-only">
                Rechercher un parfum, une maison, une marque ou un mot-clé
              </label>
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
                placeholder="Parfum, maison, marque, note…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full min-h-[48px] border-b border-[var(--nurea-border-hover)] bg-transparent py-3 pl-9 pr-11 text-base leading-snug text-[var(--nurea-text)] placeholder:text-[var(--nurea-text-subtle)] focus:border-[var(--nurea-accent)] focus:outline-none transition-colors duration-300 touch-manipulation md:min-h-[52px] md:text-[15px]"
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
                  onClick={() => setSelectedCategory(category)}
                  className={`shrink-0 min-h-[44px] px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-nurea-label transition-all duration-300 relative md:px-4 md:py-3 md:text-[12px] touch-manipulation ${
                    selectedCategory === category
                      ? "text-[var(--nurea-accent)]"
                      : "text-[var(--nurea-text-muted)] hover:text-[var(--nurea-text)]"
                  }`}
                >
                  {category}
                  <span
                    className={`absolute bottom-0 left-0 h-[2px] w-full bg-[var(--nurea-accent)] transition-transform duration-300 origin-left ${
                      selectedCategory === category
                        ? "scale-x-100"
                        : "scale-x-0"
                    }`}
                  />
                </button>
              ))}
            </div>
          </ScrollReveal>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex min-w-[min(100%,200px)] flex-1 items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)]">
              Trier
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                aria-label="Trier le catalogue"
                className="min-h-[44px] min-w-0 flex-1 border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] px-3 py-2 text-base font-medium normal-case tracking-normal text-[var(--nurea-text)] focus:outline-none focus:border-[var(--nurea-accent)] touch-manipulation md:text-[11px]"
              >
                <option value="default">Ordre du catalogue</option>
                <option value="name">Nom (A-Z)</option>
                <option value="brand">Marque (A-Z)</option>
              </select>
            </label>
          </div>
        </div>

        {/* Active filters */}
        {hasActiveFilters && (
          <div className="mb-6 flex flex-wrap items-center gap-1.5 animate-fade-in-up">
            <span className="mr-1 text-[10px] uppercase tracking-nurea-wide text-[var(--nurea-text-muted)]">
              Filtres :
            </span>
            {searchTerm.trim() !== "" && (
              <FilterChip
                label={`\u00AB ${searchTerm.trim()} \u00BB`}
                onRemove={() => setSearchTerm("")}
              />
            )}
            {selectedCategory !== "Tout voir" && (
              <FilterChip
                label={selectedCategory}
                onRemove={() => setSelectedCategory("Tout voir")}
              />
            )}
            {sortKey !== "default" && (
              <FilterChip
                label="Tri personnalis\u00e9"
                onRemove={() => setSortKey("default")}
              />
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="ml-1 min-h-[44px] px-1 text-[10px] uppercase tracking-nurea-label text-[var(--nurea-text-muted)] hover:text-[var(--nurea-accent)] transition-colors touch-manipulation"
            >
              Tout effacer
            </button>
          </div>
        )}

        {/* Grid or empty state */}
        {sortedPerfumes.length === 0 ? (
          <div className="py-16 md:py-20">
            <div className="mx-auto max-w-xl text-center">
              {searchTerm.trim() !== "" ? (
                <>
                  <p className="font-serif text-xl text-[var(--nurea-text)] mb-3 md:text-2xl">
                    {externalHint
                      ? `Vous cherchez « ${externalHint.displayName} » ?`
                      : `Aucun résultat pour « ${searchTerm.trim()} »`}
                  </p>
                  <p className="text-[13px] leading-relaxed text-[var(--nurea-text-muted)] mb-2">
                    {externalHint
                      ? externalHint.caption
                      : EXTERNAL_SEARCH_FALLBACK_MESSAGE}
                  </p>
                  {externalHint ? (
                    <ExternalSearchFootnote hint={externalHint} />
                  ) : null}
                </>
              ) : (
                <>
                  <p className="font-serif text-xl text-[var(--nurea-text)] mb-3 md:text-2xl">
                    Aucune création ne correspond à ces filtres
                  </p>
                  <p className="text-[13px] text-[var(--nurea-text-muted)] mb-2">
                    Élargissez la recherche ou explorez nos suggestions ci-dessous.
                  </p>
                </>
              )}
              <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <a
                  href={conciergeWhatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-nurea text-[10px] md:text-[11px]"
                >
                  Demander par WhatsApp
                </a>
                <Link
                  href="/contact"
                  className="text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)] hover:text-[var(--nurea-accent)] transition-colors"
                >
                  Conciergerie
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
                      featured={perfume.category === "Gammes Compl\u00e8tes"}
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
                      featured={perfume.category === "Gammes Compl\u00e8tes"}
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

/* Filter chip — toute la puce = cible 44px+ (accessibilité tactile) */
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
