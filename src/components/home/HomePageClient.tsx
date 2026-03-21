"use client";

import { useEffect, useMemo, useState } from "react";
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
  type Category,
} from "@/lib/data";

/* Parfums signature pour la section featured editorial */
const FEATURED_IDS = [9, 10]; // Baccarat Rouge 540 & Aventus

export const HomePageClient = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<Category>("Tout voir");
  const [selectedBrand, setSelectedBrand] = useState<string>("Toutes");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeItem, setActiveItem] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("Tout voir");
    setSelectedBrand("Toutes");
  };

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    selectedBrand !== "Toutes" ||
    selectedCategory !== "Tout voir";

  const showFeatured = !hasActiveFilters;

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
        className="w-full flex-grow max-w-[1200px] mx-auto px-4 md:px-10 py-14 md:py-20"
      >
        {/* Header */}
        <ScrollReveal className="mb-8 md:mb-12">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="block mb-2 text-[9px] font-medium uppercase tracking-[0.35em] text-[var(--nurea-accent)] md:text-[10px]">
                Catalogue
              </span>
              <h2 className="font-serif text-[clamp(24px,5vw,36px)] text-[var(--nurea-text)] leading-tight">
                La Collection
              </h2>
              <span className="mt-1.5 block text-[10px] tracking-[0.1em] text-[var(--nurea-text-muted)]">
                {filteredPerfumes.length} creation
                {filteredPerfumes.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Filter button — desktop */}
            <button
              onClick={() => setIsFilterOpen(true)}
              className="btn-nurea hidden md:inline-flex"
            >
              Affiner la recherche
              {hasActiveFilters && (
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--nurea-accent)]" />
              )}
            </button>
          </div>
        </ScrollReveal>

        {/* Category tabs */}
        <ScrollReveal className="mb-6" delay={80}>
          <div className="no-scrollbar flex gap-0.5 overflow-x-auto border-b border-[var(--nurea-border)]">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.12em] transition-all duration-300 relative md:px-4 md:py-3 md:text-[11px] ${
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

        {/* Active filters */}
        {hasActiveFilters && (
          <div className="mb-6 flex flex-wrap items-center gap-1.5 animate-fade-in-up">
            <span className="mr-1 text-[8px] uppercase tracking-[0.25em] text-[var(--nurea-text-muted)]">
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
            <button
              onClick={handleResetFilters}
              className="ml-1 text-[8px] uppercase tracking-[0.15em] text-[var(--nurea-text-muted)] hover:text-[var(--nurea-accent)] transition-colors"
            >
              Tout effacer
            </button>
          </div>
        )}

        {/* Grid or empty state */}
        {filteredPerfumes.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-serif text-xl text-[var(--nurea-text)] mb-2 md:text-2xl">
              Aucune creation trouvee
            </p>
            <p className="text-[12px] text-[var(--nurea-text-muted)]">
              Essayez une autre recherche ou explorez nos categories.
            </p>
          </div>
        ) : (
          <div className="catalogue-grid stagger-grid">
            {filteredPerfumes.map((perfume) => (
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
  <span className="inline-flex items-center gap-1 border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] px-2.5 py-1 text-[9px] text-[var(--nurea-text)]">
    {label}
    <button
      onClick={onRemove}
      className="text-[var(--nurea-text-muted)] hover:text-[var(--nurea-accent)] transition-colors"
      aria-label={`Retirer ${label}`}
    >
      <X size={9} />
    </button>
  </span>
);
