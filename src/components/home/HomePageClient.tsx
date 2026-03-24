"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/features/Hero";
import { FeaturedSection } from "@/components/features/FeaturedSection";
import { PerfumeCard } from "@/components/features/PerfumeCard";
import { SearchOverlay } from "@/components/features/SearchOverlay";
import { Footer } from "@/components/layout/Footer";
import { Separator } from "@/components/ui/Separator";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  categories,
  mockPerfumes,
  fuzzySearchMatch,
  suggestSimilarPerfumes,
  CONTACT,
  type Category,
} from "@/lib/data";

/* Parfums signature pour la section featured editorial */
const FEATURED_IDS = [9, 10]; // Baccarat Rouge 540 & Aventus

type SortKey = "default" | "name" | "brand";

export const HomePageClient = () => {
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<Category>("Tout voir");
  const [selectedBrand, setSelectedBrand] = useState<string>("Toutes");
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeItem, setActiveItem] = useState<number | null>(null);
  const isFirstLayoutRef = useRef(true);
  const prevFeaturedRef = useRef(true);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /** Paramètre ?q= (SEO / SearchAction) : préremplit la recherche catalogue. */
  useEffect(() => {
    const q = searchParams.get("q");
    if (!q) return;
    try {
      setSearchTerm(decodeURIComponent(q));
    } catch {
      setSearchTerm(q);
    }
  }, [searchParams]);

  const featuredPerfumes = useMemo(
    () => mockPerfumes.filter((p) => FEATURED_IDS.includes(p.id)),
    []
  );

  const filteredPerfumes = useMemo(() => {
    return mockPerfumes.filter((perfume) => {
      const matchSearch = fuzzySearchMatch(perfume, searchTerm);
      const matchCategory =
        selectedCategory === "Tout voir" ||
        perfume.category === selectedCategory;
      const matchBrand =
        selectedBrand === "Toutes" || perfume.brand === selectedBrand;
      return matchSearch && matchCategory && matchBrand;
    });
  }, [searchTerm, selectedCategory, selectedBrand]);

  const sortedPerfumes = useMemo(() => {
    const list = [...filteredPerfumes];
    if (sortKey === "name") {
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
  }, [filteredPerfumes, sortKey]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("Tout voir");
    setSelectedBrand("Toutes");
    setSortKey("default");
  };

  const hasCollectionFilters =
    searchTerm.trim() !== "" ||
    selectedBrand !== "Toutes" ||
    selectedCategory !== "Tout voir";

  const hasActiveFilters =
    hasCollectionFilters || sortKey !== "default";

  const showFeatured = !hasCollectionFilters;

  /**
   * Quand la section « À la une » disparaît (filtres actifs), une grande partie du contenu au-dessus du
   * catalogue est retirée : le scroll absolu reste identique, d’où l’impression de « téléportation ».
   * On réancre uniquement dans ce sens (pas quand la section réapparaît, pour ne pas masquer l’éditorial).
   */
  useLayoutEffect(() => {
    if (isFirstLayoutRef.current) {
      isFirstLayoutRef.current = false;
      prevFeaturedRef.current = showFeatured;
      return;
    }
    const prev = prevFeaturedRef.current;
    prevFeaturedRef.current = showFeatured;
    if (prev && !showFeatured) {
      document
        .getElementById("collection")
        ?.scrollIntoView({ block: "start", behavior: "auto" });
    }
  }, [showFeatured]);

  const inspirationWhenEmpty = useMemo(() => {
    if (searchTerm.trim() !== "") {
      return suggestSimilarPerfumes(searchTerm, mockPerfumes, 6);
    }
    return mockPerfumes.slice(0, 6);
  }, [searchTerm]);

  const conciergeWhatsappHref = useMemo(() => {
    const num = CONTACT.whatsapp.match(/wa\.me\/(\d+)/)?.[1] ?? "";
    const msg = `Bonjour, je cherche « ${searchTerm.trim() || "un parfum"} ». Est-ce que vous pouvez me le procurer ou me proposer une alternative ?`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  }, [searchTerm]);

  return (
    <div className="grain flex min-h-screen flex-col bg-[var(--nurea-bg)] text-[var(--nurea-text)]">
      <Navbar
        scrolled={scrolled}
        onOpenSearch={() => setIsFilterOpen(true)}
      />

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
        className="scroll-mt-[calc(env(safe-area-inset-top,0px)+3.75rem)] md:scroll-mt-[calc(env(safe-area-inset-top,0px)+4.5rem)] w-full flex-grow max-w-[1200px] mx-auto px-4 md:px-10 py-14 pb-[max(3.5rem,env(safe-area-inset-bottom,0px))] md:py-20"
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
              {filteredPerfumes.length} creation
              {filteredPerfumes.length !== 1 ? "s" : ""}
            </span>
          </div>
        </ScrollReveal>

        {/* Onglets + tri + recherche — sticky pour parcourir de longs catalogues */}
        <div className="sticky z-30 -mx-4 mb-6 border-b border-[var(--nurea-border)] bg-[var(--nurea-bg)]/95 px-4 pb-3 backdrop-blur-md [top:calc(env(safe-area-inset-top,0px)+3.625rem)] md:top-[calc(env(safe-area-inset-top,0px)+4.25rem)] md:mx-0 md:px-0">
          <ScrollReveal className="mb-0" delay={80}>
            <div className="no-scrollbar flex gap-0.5 overflow-x-auto border-b border-[var(--nurea-border)]/80">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`shrink-0 min-h-[44px] px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] transition-all duration-300 relative md:px-4 md:py-3 md:text-[12px] touch-manipulation ${
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

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex min-w-[min(100%,220px)] flex-1 items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)]">
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
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="btn-nurea shrink-0 text-[10px] md:text-[11px]"
            >
              Affiner la recherche
              {hasActiveFilters && (
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--nurea-accent)]" />
              )}
            </button>
          </div>
        </div>

        {/* Active filters */}
        {hasActiveFilters && (
          <div className="mb-6 flex flex-wrap items-center gap-1.5 animate-fade-in-up">
            <span className="mr-1 text-[10px] uppercase tracking-[0.2em] text-[var(--nurea-text-muted)]">
              Filtres :
            </span>
            {searchTerm.trim() !== "" && (
              <FilterChip
                label={`\u00AB ${searchTerm.trim()} \u00BB`}
                onRemove={() => setSearchTerm("")}
              />
            )}
            {selectedBrand !== "Toutes" && (
              <FilterChip
                label={selectedBrand}
                onRemove={() => setSelectedBrand("Toutes")}
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
              className="ml-1 text-[10px] uppercase tracking-[0.12em] text-[var(--nurea-text-muted)] hover:text-[var(--nurea-accent)] transition-colors"
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
                    Vous recherchez « {searchTerm.trim()} » ?
                  </p>
                  <p className="text-[13px] leading-relaxed text-[var(--nurea-text-muted)] mb-2">
                    Ce parfum n&apos;est pas au catalogue pour le moment. Voici des
                    créations qui s&apos;en rapprochent — ou contactez la
                    conciergerie : nous pouvons parfois vous le procurer sur demande.
                  </p>
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
            <div className="mt-12">
              <p className="mb-5 text-center text-[10px] uppercase tracking-[0.28em] text-[var(--nurea-text-muted)]">
                {searchTerm.trim() !== ""
                  ? "Vous pourriez aimer"
                  : "Inspirations"}
              </p>
              <div className="catalogue-grid stagger-grid">
                {inspirationWhenEmpty.map((perfume) => (
                  <PerfumeCard
                    key={perfume.id}
                    perfume={perfume}
                    activeItem={activeItem}
                    setActiveItem={setActiveItem}
                    featured={perfume.category === "Gammes Complètes"}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="catalogue-grid stagger-grid">
            {sortedPerfumes.map((perfume) => (
              <PerfumeCard
                key={perfume.id}
                perfume={perfume}
                activeItem={activeItem}
                setActiveItem={setActiveItem}
                featured={perfume.category === "Gammes Compl\u00e8tes"}
              />
            ))}
          </div>
        )}
      </main>

      <SearchOverlay
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedBrand={selectedBrand}
        setSelectedBrand={setSelectedBrand}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        onResetFilters={handleResetFilters}
        resultsCount={filteredPerfumes.length}
        searchResults={filteredPerfumes}
      />

      <Footer />
    </div>
  );
};

/* Filter chip */
const FilterChip = ({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) => (
  <span className="inline-flex items-center gap-1.5 border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] px-3 py-1.5 text-[10px] text-[var(--nurea-text)]">
    {label}
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-[var(--nurea-text-muted)] hover:text-[var(--nurea-accent)] transition-colors -mr-1"
      aria-label={`Retirer ${label}`}
    >
      <X size={14} strokeWidth={1.5} />
    </button>
  </span>
);
