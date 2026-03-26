"use client";

import { createPortal } from "react-dom";
import {
  ArrowRight,
  Building2,
  Compass,
  Layers,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/data";
import type { CatalogBrowseBrand, CatalogPositioning } from "@/lib/catalog/catalogBrowseTypes";
import {
  BRAND_POSITIONING_LABELS,
  BROWSE_COPY,
  CATALOG_CATEGORY_FILTERS,
  positioningToQuery,
} from "@/lib/catalog/brandTaxonomy";

type Props = {
  open: boolean;
  onClose: () => void;
  brands: CatalogBrowseBrand[];
  onSelectMaison: (slug: string) => void;
  onSelectUnivers: (key: CatalogPositioning) => void;
  onSelectCategory: (cat: Category) => void;
  onResetPanelFilters: () => void;
  activeMaisonSlug: string;
  activeUnivers: string;
  activeCategory: Category;
  mounted: boolean;
};

const UNIVERS_ICONS: Record<string, typeof Compass> = {
  NICHE: Sparkles,
  DESIGNER: Building2,
  ARTISAN: Compass,
};

const CATEGORY_ICONS: Record<string, typeof Layers> = {
  "Gammes Complètes": Layers,
  "Sélections Individuelles": Sparkles,
  "Nouveautés": Sparkles,
};

export function CatalogBrowseDrawer({
  open,
  onClose,
  brands,
  onSelectMaison,
  onSelectUnivers,
  onSelectCategory,
  onResetPanelFilters,
  activeMaisonSlug,
  activeUnivers,
  activeCategory,
  mounted,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [brandFilter, setBrandFilter] = useState("");

  const complete = brands.filter((b) => b.assortment === "COMPLETE");
  const curated = brands.filter((b) => b.assortment !== "COMPLETE");

  const q = brandFilter.trim().toLowerCase();
  const filteredComplete = q
    ? complete.filter((b) => b.name.toLowerCase().includes(q))
    : complete;
  const filteredCurated = q
    ? curated.filter((b) => b.name.toLowerCase().includes(q))
    : curated;

  useEffect(() => {
    if (!open) return;
    setBrandFilter("");
    const t = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  if (!mounted || typeof document === "undefined") return null;

  const hasActiveFilters = activeMaisonSlug || activeUnivers;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[70] transition-all duration-300 ${
          open
            ? "pointer-events-auto bg-black/60 backdrop-blur-md"
            : "pointer-events-none bg-black/0 backdrop-blur-0"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-[71] flex w-full flex-col bg-[var(--nurea-bg)] shadow-[-24px_0_80px_rgba(0,0,0,0.4)] transition-all duration-400 ease-out-expo sm:w-[min(100vw-2rem,460px)] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] ${
          open ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={BROWSE_COPY.drawerTitle}
        aria-hidden={!open}
        {...(!open ? { inert: true as unknown as boolean } : {})}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-[var(--nurea-border)] bg-[var(--nurea-surface)]/60 backdrop-blur-lg">
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--nurea-border-hover)] bg-[var(--nurea-bg)] text-[var(--nurea-cuivre)]">
                <Compass className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-[16px] font-semibold text-[var(--nurea-text)]">Explorer</h2>
                <p className="text-[11px] text-[var(--nurea-text-subtle)]">
                  {brands.length} maison{brands.length !== 1 ? "s" : ""} · {CATALOG_CATEGORY_FILTERS.length} catégories
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center border border-[var(--nurea-border-hover)] text-[var(--nurea-text-muted)] transition-colors hover:border-[var(--nurea-accent)] hover:text-[var(--nurea-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]"
              aria-label={BROWSE_COPY.close}
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          {/* Search */}
          <div className="relative px-4 pb-4 sm:px-5">
            <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nurea-text-subtle)] sm:left-8" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              placeholder="Rechercher une maison…"
              autoComplete="off"
              className="block min-h-12 w-full border border-[var(--nurea-border)] bg-[var(--nurea-bg)] py-3 pl-10 pr-3 text-[15px] text-[var(--nurea-text)] placeholder:text-[var(--nurea-text-subtle)] transition-colors focus-visible:border-[var(--nurea-accent)] focus-visible:outline-none"
            />
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* Active filters reset */}
          {hasActiveFilters && (
            <div className="border-b border-[var(--nurea-border)] px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => {
                  onResetPanelFilters();
                  onClose();
                }}
                className="flex min-h-11 w-full items-center justify-center gap-2 border border-[var(--nurea-accent)]/40 bg-[var(--nurea-accent-subtle)] px-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--nurea-text)] transition-colors hover:border-[var(--nurea-accent)]"
              >
                <X className="h-4 w-4" aria-hidden />
                Effacer les filtres actifs
              </button>
            </div>
          )}

          {/* Univers */}
          <section className="border-b border-[var(--nurea-border)] px-4 py-5 sm:px-5">
            <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--nurea-cuivre)]">
              <Compass className="h-3.5 w-3.5" aria-hidden />
              Par univers
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(["NICHE", "DESIGNER", "ARTISAN"] as const).map((key) => {
                const uq = positioningToQuery(key);
                const selected = uq !== null && activeUnivers === uq;
                const Icon = UNIVERS_ICONS[key] ?? Compass;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      onSelectUnivers(key);
                      onClose();
                    }}
                    className={`group flex min-h-[3.25rem] items-center gap-2.5 border px-3 py-2.5 text-left transition-all duration-200 ${
                      selected
                        ? "border-[var(--nurea-accent)] bg-[var(--nurea-accent-subtle)] text-[var(--nurea-text)]"
                        : "border-[var(--nurea-border)] bg-[var(--nurea-surface)] text-[var(--nurea-text)] hover:border-[var(--nurea-accent)]/50 hover:bg-[var(--nurea-surface-hover)]"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${selected ? "text-[var(--nurea-accent)]" : "text-[var(--nurea-cuivre)] group-hover:text-[var(--nurea-accent)]"}`} aria-hidden />
                    <div className="min-w-0">
                      <span className="block text-[13px] font-medium leading-tight">{BRAND_POSITIONING_LABELS[key].title}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Catégories */}
          <section className="border-b border-[var(--nurea-border)] px-4 py-5 sm:px-5">
            <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--nurea-cuivre)]">
              <Layers className="h-3.5 w-3.5" aria-hidden />
              Par catégorie
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {CATALOG_CATEGORY_FILTERS.map((cat) => {
                const active = activeCategory === cat;
                const CatIcon = CATEGORY_ICONS[cat] ?? Layers;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat);
                      onClose();
                    }}
                    className={`flex min-h-11 items-center gap-2 border px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
                      active
                        ? "border-[var(--nurea-accent)] bg-[var(--nurea-accent-subtle)] text-[var(--nurea-text)]"
                        : "border-[var(--nurea-border)] text-[var(--nurea-text-muted)] hover:border-[var(--nurea-accent)]/50 hover:text-[var(--nurea-text)]"
                    }`}
                  >
                    <CatIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {cat}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Maisons — Ligne complète */}
          {filteredComplete.length > 0 && (
            <section className="border-b border-[var(--nurea-border)] px-4 py-5 sm:px-5">
              <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--nurea-accent)]">
                <Building2 className="h-3.5 w-3.5" aria-hidden />
                Ligne complète
              </h3>
              <p className="mt-1 text-[12px] text-[var(--nurea-text-subtle)]">
                Maisons dont nous présentons toute la gamme.
              </p>
              <div className="mt-3 space-y-1.5">
                {filteredComplete.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      onSelectMaison(b.slug);
                      onClose();
                    }}
                    className={`group flex w-full min-h-12 items-center justify-between gap-3 border px-3.5 py-2.5 text-left transition-all duration-200 ${
                      activeMaisonSlug === b.slug
                        ? "border-[var(--nurea-accent)] bg-[var(--nurea-accent-subtle)]"
                        : "border-[var(--nurea-border)] hover:border-[var(--nurea-accent)]/50 hover:bg-[var(--nurea-surface-hover)]"
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="block text-[14px] font-medium text-[var(--nurea-text)]">{b.name}</span>
                      <span className="mt-0.5 block text-[11px] text-[var(--nurea-text-subtle)]">
                        {b.publishedCount} parfum{b.publishedCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[var(--nurea-text-subtle)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--nurea-accent)]" aria-hidden />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Maisons — Sélection */}
          {filteredCurated.length > 0 && (
            <section className="px-4 py-5 sm:px-5">
              <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--nurea-accent)]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Sélection maison
              </h3>
              <p className="mt-1 text-[12px] text-[var(--nurea-text-subtle)]">
                Références choisies — d&apos;autres jus disponibles en conciergerie.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {filteredCurated.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      onSelectMaison(b.slug);
                      onClose();
                    }}
                    className={`group flex min-h-12 flex-col items-start justify-center border px-3 py-2.5 text-left transition-all duration-200 ${
                      activeMaisonSlug === b.slug
                        ? "border-[var(--nurea-accent)] bg-[var(--nurea-accent-subtle)]"
                        : "border-[var(--nurea-border)] hover:border-[var(--nurea-accent)]/50 hover:bg-[var(--nurea-surface-hover)]"
                    }`}
                  >
                    <span className="text-[13px] font-medium leading-snug text-[var(--nurea-text)]">{b.name}</span>
                    <span className="mt-0.5 text-[10px] text-[var(--nurea-text-subtle)]">
                      {b.publishedCount}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {q && filteredComplete.length === 0 && filteredCurated.length === 0 && (
            <div className="px-4 py-10 text-center sm:px-5">
              <Search className="mx-auto h-8 w-8 text-[var(--nurea-text-subtle)]" aria-hidden />
              <p className="mt-3 text-[14px] text-[var(--nurea-text-muted)]">
                Aucune maison trouvée pour {`« ${brandFilter.trim()} »`}.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}
