"use client";

import type { FC } from "react";
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
  /** Résultats filtrés pour affichage en direct pendant la saisie */
  searchResults: Perfume[];
}

const PREVIEW_MAX = 8;

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
  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    selectedBrand !== "Toutes" ||
    selectedCategory !== "Tout voir";

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-[#FDFCF8] transition-transform duration-700 ease-[cubic-bezier(0.85,0,0.15,1)] dark:bg-[#0A0A0A] ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between border-b border-[#111111]/10 p-6 md:p-12 dark:border-[#FDFCF8]/10">
        <span className="font-serif text-2xl font-semibold tracking-widest uppercase">
          Recherche
        </span>
        <button
          onClick={onClose}
          className="flex h-12 w-12 items-center justify-center rounded-full transition-colors hover:bg-[#F5F4F0] dark:hover:bg-[#141414]"
          aria-label="Fermer la recherche"
        >
          <X size={24} strokeWidth={1} />
        </button>
      </div>

      <div className="mx-auto flex-1 w-full max-w-4xl overflow-y-auto p-6 md:p-12">
        <div className="relative mb-16">
          <input
            type="text"
            placeholder="Que recherchez-vous ?"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full border-b border-[#111111] bg-transparent py-4 text-2xl font-serif text-[#111111] placeholder:text-[#111111]/20 focus:outline-none focus:border-[#8C7A6B] md:py-8 md:text-4xl dark:border-[#FDFCF8] dark:text-[#FDFCF8] dark:placeholder:text-[#FDFCF8]/20 dark:focus:border-[#C29B62]"
          />
          <Search
            size={24}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-[#111111]/50 dark:text-[#FDFCF8]/50"
            strokeWidth={1}
          />
        </div>

        {/* Résultats en direct pendant la saisie */}
        {searchTerm.trim() !== "" && (
          <div className="mb-12">
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#8C7A6B] dark:text-[#C29B62]">
              {resultsCount > 0
                ? `${resultsCount} résultat${resultsCount !== 1 ? "s" : ""}`
                : "Aucun résultat"}
            </h4>
            {resultsCount > 0 ? (
              <ul className="space-y-3">
                {searchResults.slice(0, PREVIEW_MAX).map((perfume) => (
                  <li key={perfume.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBrand(perfume.brand);
                        onClose();
                      }}
                      className="flex w-full items-center gap-4 rounded-lg border border-[#111111]/10 py-3 px-4 text-left transition-colors hover:bg-[#111111]/5 dark:border-[#FDFCF8]/10 dark:hover:bg-[#FDFCF8]/5"
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-[#F5F4F0] dark:bg-[#141414]">
                        <Image
                          src={perfume.image}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-serif text-base text-[#111111] dark:text-[#FDFCF8]">
                          {perfume.name}
                        </p>
                        <p className="truncate text-xs text-[#888888] dark:text-[#A0A0A0]">
                          {perfume.brand}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#888888] dark:text-[#A0A0A0]">
                Essayez un autre terme (ex. nom, marque) ou vérifiez l&apos;orthographe.
              </p>
            )}
          </div>
        )}

        <div className="grid gap-16 md:grid-cols-2">
          <div>
            <h4 className="mb-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#8C7A6B] dark:text-[#C29B62]">
              Maisons de Parfum
            </h4>
            <ul className="space-y-4">
              {allBrands.map((brand) => (
                <li key={brand}>
                  <button
                    onClick={() => setSelectedBrand(brand)}
                    type="button"
                    className={`text-lg font-serif transition-colors md:text-xl ${
                      selectedBrand === brand
                        ? "italic text-[#111111] dark:text-[#FDFCF8]"
                        : "text-[#888888] hover:text-[#111111] dark:text-[#A0A0A0] dark:hover:text-[#FDFCF8]"
                    }`}
                  >
                    {brand}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#8C7A6B] dark:text-[#C29B62]">
              Familles &amp; Collections
            </h4>
            <ul className="space-y-4">
              {categories.map((category) => (
                <li key={category}>
                  <button
                    onClick={() => setSelectedCategory(category)}
                    type="button"
                    className={`text-lg font-serif transition-colors md:text-xl ${
                      selectedCategory === category
                        ? "italic text-[#111111] dark:text-[#FDFCF8]"
                        : "text-[#888888] hover:text-[#111111] dark:text-[#A0A0A0] dark:hover:text-[#FDFCF8]"
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

      <div className="flex flex-col gap-4 border-t border-[#111111]/10 p-6 md:flex-row md:items-center md:justify-between md:p-12 dark:border-[#FDFCF8]/10">
        <div className="flex flex-wrap items-center gap-3">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="rounded-full border border-[#111111]/30 bg-transparent px-4 py-2 text-xs uppercase tracking-widest text-[#888888] transition-colors hover:border-[#111111] hover:text-[#111111] dark:border-[#FDFCF8]/30 dark:text-[#A0A0A0] dark:hover:border-[#FDFCF8] dark:hover:text-[#FDFCF8]"
            >
              Tout effacer
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#888888] dark:text-[#A0A0A0]">
            {resultsCount} résultat{resultsCount !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#111111] px-8 py-3 text-xs font-medium uppercase tracking-widest text-[#FDFCF8] transition-colors hover:bg-[#333333] dark:bg-[#FDFCF8] dark:text-[#0A0A0A] dark:hover:bg-[#E5E4E0]"
          >
            Voir le catalogue
          </button>
        </div>
      </div>
    </div>
  );
};
