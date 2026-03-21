"use client";

import type { FC } from "react";
import { useEffect } from "react";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { allBrands, categories } from "@/lib/data";
import type { Category, Perfume } from "@/lib/data";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedBrand: string;
  setSelectedBrand: (value: string) => void;
  selectedCategory: Category;
  setSelectedCategory: (value: Category) => void;
  onResetFilters: () => void;
  resultsCount: number;
  searchResults: Perfume[];
}

const PREVIEW_MAX = 6;

export const SearchOverlay: FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  searchTerm,
  setSearchTerm,
  selectedBrand,
  setSelectedBrand,
  selectedCategory,
  setSelectedCategory,
  onResetFilters,
  resultsCount,
  searchResults,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    selectedBrand !== "Toutes" ||
    selectedCategory !== "Tout voir";

  return (
    <div
      role="dialog"
      aria-label="Recherche"
      aria-hidden={!isOpen}
      {...(!isOpen ? { inert: true as unknown as boolean } : {})}
      className={`fixed inset-0 z-[55] flex flex-col bg-[var(--nurea-bg)]/[0.97] backdrop-blur-3xl transition-all duration-500 ease-out-expo ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 md:px-10 md:py-4">
        <span className="font-serif text-lg text-[var(--nurea-text)] md:text-xl">
          Recherche
        </span>
        <button
          onClick={onClose}
          className="flex items-center justify-center h-10 w-10 text-[var(--nurea-text-muted)] hover:text-[var(--nurea-accent)] transition-colors"
          aria-label="Fermer"
        >
          <X size={20} strokeWidth={1.5} />
        </button>
      </div>

      {/* Content */}
      <div className="mx-auto flex-1 w-full max-w-2xl overflow-y-auto px-4 py-5 md:px-10 md:py-8">
        {/* Search input */}
        <div className="relative mb-8">
          <input
            type="text"
            placeholder="Que recherchez-vous ?"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus={isOpen}
            className="w-full border-b border-[var(--nurea-border-hover)] bg-transparent py-3 font-serif italic text-[clamp(20px,4vw,32px)] text-[var(--nurea-text)] placeholder:text-[var(--nurea-text-subtle)] focus:outline-none focus:border-[var(--nurea-accent)] transition-colors duration-300"
          />
          <Search
            size={16}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-[var(--nurea-text-muted)]"
            strokeWidth={1.5}
          />
        </div>

        {/* Live results */}
        {searchTerm.trim() !== "" && (
          <div className="mb-8 animate-fade-in-up">
            <p className="mb-3 text-[10px] tracking-[0.15em] text-[var(--nurea-text-muted)]">
              {resultsCount > 0
                ? `${resultsCount} resultat${resultsCount !== 1 ? "s" : ""}`
                : "Aucun resultat"}
            </p>
            {resultsCount > 0 ? (
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3">
                {searchResults.slice(0, PREVIEW_MAX).map((perfume) => (
                  <button
                    key={perfume.id}
                    type="button"
                    onClick={() => {
                      setSelectedBrand(perfume.brand);
                      onClose();
                    }}
                    className="group flex flex-col text-left transition-all active:scale-[0.98]"
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--nurea-surface)] mb-1.5">
                      <Image
                        src={perfume.image}
                        alt=""
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="150px"
                      />
                    </div>
                    <span className="text-[7px] uppercase tracking-[0.2em] text-[var(--nurea-accent)] md:text-[8px]">
                      {perfume.brand}
                    </span>
                    <span className="text-[11px] font-serif text-[var(--nurea-text)] truncate md:text-[12px]">
                      {perfume.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-[var(--nurea-text-muted)]">
                Essayez un autre terme ou verifiez l&apos;orthographe.
              </p>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="grid gap-8 md:grid-cols-2 md:gap-10">
          <div>
            <h4 className="mb-4 text-[9px] uppercase tracking-[0.3em] text-[var(--nurea-text-muted)]">
              Maisons
            </h4>
            <ul className="space-y-2">
              {allBrands.map((brand) => (
                <li key={brand}>
                  <button
                    onClick={() => setSelectedBrand(brand)}
                    type="button"
                    className={`text-[12px] transition-colors duration-300 md:text-[13px] ${
                      selectedBrand === brand
                        ? "text-[var(--nurea-accent)] italic"
                        : "text-[var(--nurea-text-muted)] hover:text-[var(--nurea-text)]"
                    }`}
                  >
                    {brand}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-[9px] uppercase tracking-[0.3em] text-[var(--nurea-text-muted)]">
              Collections
            </h4>
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category}>
                  <button
                    onClick={() => setSelectedCategory(category)}
                    type="button"
                    className={`text-[12px] transition-colors duration-300 md:text-[13px] ${
                      selectedCategory === category
                        ? "text-[var(--nurea-accent)] italic"
                        : "text-[var(--nurea-text-muted)] hover:text-[var(--nurea-text)]"
                    }`}
                  >
                    {category}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[var(--nurea-border)] px-4 py-3 md:px-10 md:py-4">
        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="text-[9px] uppercase tracking-[0.15em] text-[var(--nurea-text-muted)] hover:text-[var(--nurea-accent)] transition-colors"
            >
              Tout effacer
            </button>
          )}
          <span className="text-[10px] text-[var(--nurea-text-subtle)]">
            {resultsCount} creation{resultsCount !== 1 ? "s" : ""}
          </span>
        </div>
        <button onClick={onClose} className="btn-nurea text-[9px]">
          Voir le catalogue
        </button>
      </div>
    </div>
  );
};
