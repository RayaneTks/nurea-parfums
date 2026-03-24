"use client";

import type { FC } from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Search, X } from "lucide-react";
import {
  allBrands,
  categories,
  getPerfumeImage,
  mockPerfumes,
  normalizeText,
  suggestSimilarPerfumes,
  CONTACT,
} from "@/lib/data";
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
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const activeTheme = resolvedTheme === "dark" ? "dark" : "light";

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const [brandQuery, setBrandQuery] = useState("");
  useEffect(() => {
    if (!isOpen) setBrandQuery("");
  }, [isOpen]);

  const filteredBrands = useMemo(() => {
    const q = normalizeText(brandQuery).trim();
    if (!q) return allBrands;
    return allBrands.filter((b) => normalizeText(b).includes(q));
  }, [brandQuery]);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    selectedBrand !== "Toutes" ||
    selectedCategory !== "Tout voir";

  const noMatchSuggestions = useMemo(() => {
    const q = searchTerm.trim();
    if (!q) return mockPerfumes.slice(0, 6);
    return suggestSimilarPerfumes(q, mockPerfumes, 6);
  }, [searchTerm]);

  const conciergeWhatsappHref = useMemo(() => {
    const num = CONTACT.whatsapp.match(/wa\.me\/(\d+)/)?.[1] ?? "";
    const msg = `Bonjour, je cherche « ${searchTerm.trim() || "un parfum"} ». Est-ce que vous pouvez me le procurer ou me proposer une alternative ?`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  }, [searchTerm]);

  return (
    <div
      role="dialog"
      aria-label="Recherche"
      aria-hidden={!isOpen}
      {...(!isOpen ? { inert: true as unknown as boolean } : {})}
      className={`fixed inset-0 z-[55] flex flex-col bg-[var(--nurea-bg)] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] transition-all duration-500 ease-out-expo ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Header */}
      <div className="flex min-h-[58px] items-center justify-between border-b border-[var(--nurea-border)] px-4 md:min-h-[68px] md:px-10">
        <span className="font-serif text-xl text-[var(--nurea-text)] md:text-2xl">
          Recherche
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center text-[var(--nurea-text-muted)] transition-colors hover:text-[var(--nurea-accent)]"
          aria-label="Fermer"
        >
          <X size={22} strokeWidth={1.5} />
        </button>
      </div>

      {/* Content */}
      <div className="mx-auto flex-1 w-full max-w-2xl overflow-y-auto overscroll-y-contain px-4 py-5 md:px-10 md:py-8">
        {/* Search input */}
        <div className="relative mb-8">
          <input
            type="text"
            placeholder="Que recherchez-vous ?"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus={isOpen}
            enterKeyHint="search"
            className="w-full border-b border-[var(--nurea-border-hover)] bg-transparent py-3 font-serif italic text-[clamp(20px,4vw,32px)] text-[var(--nurea-text)] placeholder:text-[var(--nurea-text-subtle)] focus:outline-none focus:border-[var(--nurea-accent)] transition-colors duration-300 touch-manipulation"
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
                        src={
                          mounted
                            ? getPerfumeImage(perfume, activeTheme)
                            : perfume.image
                        }
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
              <div className="space-y-4">
                <p className="text-[12px] leading-relaxed text-[var(--nurea-text-muted)]">
                  Nous n&apos;avons pas « {searchTerm.trim()} » en catalogue pour
                  l&apos;instant. Voici des idées proches — ou demandez à la
                  conciergerie si nous pouvons vous le procurer.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={conciergeWhatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-nurea text-[9px]"
                  >
                    WhatsApp
                  </a>
                  <Link
                    href="/contact"
                    onClick={onClose}
                    className="inline-flex items-center border border-[var(--nurea-border-hover)] px-3 py-2 text-[9px] uppercase tracking-[0.12em] text-[var(--nurea-text-muted)] hover:text-[var(--nurea-accent)]"
                  >
                    Conciergerie
                  </Link>
                </div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--nurea-text-subtle)]">
                  Vous pourriez aimer
                </p>
                <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3">
                  {noMatchSuggestions.map((perfume) => (
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
                          src={
                            mounted
                              ? getPerfumeImage(perfume, activeTheme)
                              : perfume.image
                          }
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
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="grid gap-8 md:grid-cols-2 md:gap-10">
          <div>
            <h4 className="mb-4 text-[9px] uppercase tracking-[0.3em] text-[var(--nurea-text-muted)]">
              Maisons
            </h4>
            <div className="mb-3">
              <input
                type="search"
                value={brandQuery}
                onChange={(e) => setBrandQuery(e.target.value)}
                placeholder="Filtrer les maisons..."
                aria-label="Filtrer les maisons"
                className="w-full min-h-[44px] border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] px-3 py-2 text-base text-[var(--nurea-text)] placeholder:text-[var(--nurea-text-subtle)] focus:outline-none focus:border-[var(--nurea-accent)] transition-colors touch-manipulation md:text-[12px]"
              />
            </div>
            {filteredBrands.length === 0 ? (
              <p className="text-[12px] text-[var(--nurea-text-muted)]">
                Aucune maison ne correspond.
              </p>
            ) : (
              <ul className="max-h-[min(50vh,420px)] space-y-2 overflow-y-auto pr-1">
                {filteredBrands.map((brand) => (
                  <li key={brand}>
                    <button
                      onClick={() => setSelectedBrand(brand)}
                      type="button"
                      className={`flex min-h-[44px] w-full items-center text-left text-[13px] transition-colors duration-300 md:text-[13px] ${
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
            )}
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
                    className={`flex min-h-[44px] w-full items-center text-[13px] transition-colors duration-300 md:text-[13px] ${
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
      <div className="flex items-center justify-between border-t border-[var(--nurea-border)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] md:px-10 md:py-4">
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
        <button type="button" onClick={onClose} className="btn-nurea text-[9px]">
          Voir le catalogue
        </button>
      </div>
    </div>
  );
};
