"use client";

import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
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
            <SlidersHorizontal size={16} strokeWidth={1.5} /> Affiner
          </button>
        </div>

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
      />

      <Footer />
    </div>
  );
};

