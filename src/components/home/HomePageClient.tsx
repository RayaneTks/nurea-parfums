"use client";

import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/features/Hero";
import { PerfumeCard } from "@/components/features/PerfumeCard";
import { SearchOverlay } from "@/components/features/SearchOverlay";
import { Footer } from "@/components/layout/Footer";
import {
  categories,
  mockPerfumes,
  normalizeText,
  type Category,
} from "@/lib/data";

export const HomePageClient = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<Category>("Tout voir");
  const [selectedBrand, setSelectedBrand] = useState<string>("Toutes");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeItem, setActiveItem] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredPerfumes = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);

    return mockPerfumes.filter((perfume) => {
      const matchSearch =
        !normalizedSearch ||
        normalizeText(perfume.name).includes(normalizedSearch) ||
        normalizeText(perfume.brand).includes(normalizedSearch);

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

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFCF8] text-[#111111] transition-colors duration-700 dark:bg-[#0A0A0A] dark:text-[#FDFCF8] selection:bg-[#111111] selection:text-[#FDFCF8] dark:selection:bg-[#FDFCF8] dark:selection:text-[#0A0A0A]">
      <Navbar scrolled={scrolled} onOpenFilters={() => setIsFilterOpen(true)} />

      <Hero />

      <main
        id="collection"
        className="w-full flex-grow max-w-[1400px] mx-auto px-6 md:px-12 py-24"
      >
        <div className="mb-16 flex flex-col justify-between gap-8 border-b border-[#111111]/10 pb-8 md:flex-row md:items-end dark:border-[#FDFCF8]/10">
          <div className="w-full flex-1 md:w-auto">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-serif text-3xl md:text-4xl">
                La Collection
              </h2>
            </div>
            <div className="no-scrollbar flex gap-8 overflow-x-auto pb-2 md:gap-12">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`shrink-0 text-sm transition-all duration-300 relative tracking-wide ${
                    selectedCategory === category
                      ? "font-medium text-[#111111] dark:text-[#FDFCF8]"
                      : "text-[#888888] hover:text-[#111111] dark:text-[#A0A0A0] dark:hover:text-[#FDFCF8]"
                  }`}
                >
                  {category}
                  {selectedCategory === category && (
                    <span className="absolute -bottom-2 left-0 h-[1px] w-full bg-[#111111] dark:bg-[#FDFCF8]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsFilterOpen(true)}
            className="flex shrink-0 items-center gap-3 text-xs uppercase tracking-widest text-[#111111] transition-colors hover:text-[#8C7A6B] dark:text-[#FDFCF8] dark:hover:text-[#C29B62]"
          >
            <SlidersHorizontal size={16} strokeWidth={1.5} />
            Affiner
            {hasActiveFilters && (
              <span className="flex h-2 w-2 rounded-full bg-[#8C7A6B] dark:bg-[#C29B62]" aria-hidden />
            )}
          </button>
        </div>

        {hasActiveFilters && (
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs uppercase tracking-widest text-[#888888] dark:text-[#A0A0A0]">
              Filtres actifs :
            </span>
            {searchTerm.trim() !== "" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#111111]/20 bg-[#F5F4F0] px-3 py-1.5 text-xs dark:border-[#FDFCF8]/20 dark:bg-[#141414]">
                Recherche « {searchTerm.trim()} »
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="rounded-full p-0.5 transition-colors hover:bg-[#111111]/10 dark:hover:bg-[#FDFCF8]/10"
                  aria-label="Retirer la recherche"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedBrand !== "Toutes" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#111111]/20 bg-[#F5F4F0] px-3 py-1.5 text-xs dark:border-[#FDFCF8]/20 dark:bg-[#141414]">
                Marque {selectedBrand}
                <button
                  type="button"
                  onClick={() => setSelectedBrand("Toutes")}
                  className="rounded-full p-0.5 transition-colors hover:bg-[#111111]/10 dark:hover:bg-[#FDFCF8]/10"
                  aria-label="Retirer le filtre marque"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedCategory !== "Tout voir" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#111111]/20 bg-[#F5F4F0] px-3 py-1.5 text-xs dark:border-[#FDFCF8]/20 dark:bg-[#141414]">
                {selectedCategory}
                <button
                  type="button"
                  onClick={() => setSelectedCategory("Tout voir")}
                  className="rounded-full p-0.5 transition-colors hover:bg-[#111111]/10 dark:hover:bg-[#FDFCF8]/10"
                  aria-label="Retirer le filtre catégorie"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="ml-1 text-xs uppercase tracking-widest text-[#888888] underline underline-offset-2 transition-colors hover:text-[#111111] dark:text-[#A0A0A0] dark:hover:text-[#FDFCF8]"
            >
              Tout effacer
            </button>
          </div>
        )}

        {filteredPerfumes.length === 0 ? (
          <div className="py-32 text-center font-serif text-2xl text-[#888888] dark:text-[#A0A0A0]">
            Aucune création ne correspond à votre recherche.
          </div>
        ) : (
          <div className="animate-stagger grid grid-cols-1 gap-x-8 gap-y-20 md:grid-cols-2 lg:grid-cols-3">
            {filteredPerfumes.map((perfume) => (
              <PerfumeCard
                key={perfume.id}
                perfume={perfume}
                activeItem={activeItem}
                setActiveItem={setActiveItem}
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
      />

      <Footer />
    </div>
  );
};

