"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Category } from "@/lib/data";
import type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";
import {
  BRAND_ASSORTMENT_LABELS,
  BRAND_POSITIONING_LABELS,
  BROWSE_COPY,
  CATALOG_CATEGORY_FILTERS,
  positioningToQuery,
} from "@/lib/catalog/brandTaxonomy";
import type { CatalogPositioning } from "@/lib/catalog/catalogBrowseTypes";

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

function BrandButton({
  b,
  onPick,
}: {
  b: CatalogBrowseBrand;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full min-h-[48px] items-center justify-between gap-2 rounded-sm border border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-3 py-2.5 text-left text-[14px] text-[var(--nurea-text)] transition-colors hover:border-[var(--nurea-accent)] active:scale-[0.99]"
    >
      <span className="min-w-0 truncate font-medium">{b.name}</span>
      <span className="shrink-0 text-[11px] text-[var(--nurea-text-subtle)]">
        {b.publishedCount}
      </span>
    </button>
  );
}

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
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const complete = brands.filter((b) => b.assortment === "COMPLETE");
  const curated = brands.filter((b) => b.assortment !== "COMPLETE");

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => closeBtnRef.current?.focus());
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

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:bg-black/40 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 right-0 z-[71] flex w-[min(100vw-1rem,400px)] max-w-full flex-col border-l border-[var(--nurea-border)] bg-[var(--nurea-bg)] shadow-[-12px_0_48px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-out-expo pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] ${
          open ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={BROWSE_COPY.drawerTitle}
        aria-hidden={!open}
        {...(!open ? { inert: true as unknown as boolean } : {})}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--nurea-border)] px-4 py-4">
          <div className="min-w-0">
            <h2 className="font-serif text-xl text-[var(--nurea-text)]">{BROWSE_COPY.drawerTitle}</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--nurea-text-muted)]">
              {BROWSE_COPY.drawerSubtitle}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-[var(--nurea-border-hover)] text-[var(--nurea-text-muted)] transition-colors hover:border-[var(--nurea-accent)] hover:text-[var(--nurea-text)]"
            aria-label={BROWSE_COPY.close}
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {(activeMaisonSlug || activeUnivers) && (
            <button
              type="button"
              onClick={() => {
                onResetPanelFilters();
                onClose();
              }}
              className="btn-nurea mb-6 w-full justify-center text-[11px] tracking-[0.1em]"
            >
              {BROWSE_COPY.resetPanel}
            </button>
          )}

          <section className="mb-8">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--nurea-accent)]">
              {BROWSE_COPY.sectionComplete}
            </h3>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--nurea-text-subtle)]">
              {BROWSE_COPY.sectionCompleteSub}
            </p>
            <div className="mt-3 space-y-2">
              {complete.length === 0 ? (
                <p className="text-[13px] text-[var(--nurea-text-muted)]">Aucune pour l’instant.</p>
              ) : (
                complete.map((b) => (
                  <BrandButton
                    key={b.id}
                    b={b}
                    onPick={() => {
                      onSelectMaison(b.slug);
                      onClose();
                    }}
                  />
                ))
              )}
            </div>
          </section>

          <section className="mb-8">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--nurea-accent)]">
              {BROWSE_COPY.sectionCurated}
            </h3>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--nurea-text-subtle)]">
              {BROWSE_COPY.sectionCuratedSub}
            </p>
            <div className="mt-3 space-y-2">
              {curated.map((b) => (
                <BrandButton
                  key={b.id}
                  b={b}
                  onPick={() => {
                    onSelectMaison(b.slug);
                    onClose();
                  }}
                />
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--nurea-accent)]">
              {BROWSE_COPY.sectionUnivers}
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {(["NICHE", "DESIGNER", "ARTISAN"] as const).map((key) => {
                const uq = positioningToQuery(key);
                const selected = uq !== null && activeUnivers === uq;
                return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onSelectUnivers(key);
                    onClose();
                  }}
                  className={`min-h-[48px] rounded-sm border px-3 py-2.5 text-left text-[13px] transition-colors ${
                    selected
                      ? "border-[var(--nurea-accent)] bg-[var(--nurea-accent-subtle)] text-[var(--nurea-text)]"
                      : "border-[var(--nurea-border)] bg-[var(--nurea-surface)] text-[var(--nurea-text)] hover:border-[var(--nurea-accent)]"
                  }`}
                >
                  <span className="font-medium">{BRAND_POSITIONING_LABELS[key].title}</span>
                  {BRAND_POSITIONING_LABELS[key].hint ? (
                    <span className="mt-0.5 block text-[11px] text-[var(--nurea-text-subtle)]">
                      {BRAND_POSITIONING_LABELS[key].hint}
                    </span>
                  ) : null}
                </button>
                );
              })}
            </div>
          </section>

          <section className="mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--nurea-accent)]">
              {BROWSE_COPY.sectionCategories}
            </h3>
            <p className="mt-1 text-[12px] text-[var(--nurea-text-subtle)]">
              {BROWSE_COPY.sectionCategoriesSub}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {CATALOG_CATEGORY_FILTERS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    onSelectCategory(cat);
                    onClose();
                  }}
                  className={`min-h-[48px] rounded-sm border px-3 py-2.5 text-left text-[14px] transition-colors ${
                    activeCategory === cat
                      ? "border-[var(--nurea-accent)] bg-[var(--nurea-accent-subtle)]"
                      : "border-[var(--nurea-border)] bg-[var(--nurea-surface)] hover:border-[var(--nurea-accent)]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>

          <p className="border-t border-[var(--nurea-border)] pt-4 text-[11px] leading-relaxed text-[var(--nurea-text-subtle)]">
            <span className="font-medium text-[var(--nurea-text-muted)]">Légende assortiment :</span>{" "}
            {BRAND_ASSORTMENT_LABELS.COMPLETE.title} — {BRAND_ASSORTMENT_LABELS.COMPLETE.hint}{" "}
            <span className="text-[var(--nurea-border-hover)]">·</span>{" "}
            {BRAND_ASSORTMENT_LABELS.CURATED.title} — {BRAND_ASSORTMENT_LABELS.CURATED.hint}
          </p>
        </div>
      </aside>
    </>,
    document.body
  );
}
