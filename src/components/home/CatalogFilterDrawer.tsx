"use client";

import { createPortal } from "react-dom";
import { Check, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";
import { BRAND_POSITIONING_LABELS } from "@/lib/catalog/brandTaxonomy";

type Props = {
  open: boolean;
  onClose: () => void;
  brands: CatalogBrowseBrand[];
  mounted: boolean;
  selectedBrandSlugs: Set<string>;
  selectedTypes: Set<string>;
  getResultCount: (brandSlugs: Set<string>, types: Set<string>) => number;
  onApply: (brandSlugs: Set<string>, types: Set<string>) => void;
  onReset: () => void;
};

const TYPE_KEYS = ["niche", "designer", "artisan"] as const;

const TYPE_TO_POSITIONING: Record<string, keyof typeof BRAND_POSITIONING_LABELS> = {
  niche: "NICHE",
  designer: "DESIGNER",
  artisan: "ARTISAN",
};

function groupByLetter(brands: CatalogBrowseBrand[]) {
  const map = new Map<string, CatalogBrowseBrand[]>();
  for (const b of brands) {
    const letter = b.name[0]?.toUpperCase() ?? "#";
    const group = map.get(letter);
    if (group) group.push(b);
    else map.set(letter, [b]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function CatalogFilterDrawer({
  open,
  onClose,
  brands,
  mounted,
  selectedBrandSlugs,
  selectedTypes,
  getResultCount,
  onApply,
  onReset,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState("");
  const [draftBrands, setDraftBrands] = useState<Set<string>>(new Set());
  const [draftTypes, setDraftTypes] = useState<Set<string>>(new Set());
  const draftResultCount = useMemo(
    () => getResultCount(draftBrands, draftTypes),
    [draftBrands, draftTypes, getResultCount],
  );

  useEffect(() => {
    if (open) {
      setDraftBrands(new Set(selectedBrandSlugs));
      setDraftTypes(new Set(selectedTypes));
      setFilter("");
      const t = requestAnimationFrame(() => searchRef.current?.focus());
      return () => cancelAnimationFrame(t);
    }
  }, [open, selectedBrandSlugs, selectedTypes]);

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

  const sorted = useMemo(
    () => [...brands].sort((a, b) => a.name.localeCompare(b.name)),
    [brands],
  );

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const key of TYPE_KEYS) {
      const pos = TYPE_TO_POSITIONING[key];
      counts[key] = brands.filter((b) => b.positioning === pos).length;
    }
    return counts;
  }, [brands]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((b) => b.name.toLowerCase().includes(q));
  }, [sorted, filter]);

  const groups = useMemo(() => groupByLetter(filtered), [filtered]);

  function handleApply() {
    onApply(draftBrands, draftTypes);
    onClose();
  }

  function handleReset() {
    setDraftBrands(new Set());
    setDraftTypes(new Set());
    onReset();
    onClose();
  }

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[70] transition-opacity duration-300 ${
          open
            ? "pointer-events-auto bg-black/50 backdrop-blur-sm"
            : "pointer-events-none bg-black/0"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-[71] flex w-full flex-col bg-[var(--nurea-bg)] shadow-[-8px_0_40px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-out-expo sm:w-[420px] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Filtrer le catalogue"
        aria-hidden={!open}
        {...(!open ? { inert: true as unknown as boolean } : {})}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--nurea-border)] px-5 py-4">
          <h2 className="font-serif text-xl text-[var(--nurea-text)]">
            Filtrer
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center text-[var(--nurea-text-muted)] transition-colors hover:text-[var(--nurea-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]"
            aria-label="Fermer"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* Section: Par type */}
          <div className="border-b border-[var(--nurea-border)] px-5 py-4">
            <h3 className="mb-3 font-serif text-[15px] tracking-wide text-[var(--nurea-text)]">
              Par type
            </h3>
            <div className="flex flex-col gap-1">
              {TYPE_KEYS.map((key) => {
                const pos = TYPE_TO_POSITIONING[key];
                const label = BRAND_POSITIONING_LABELS[pos].title;
                const count = typeCounts[key] ?? 0;
                const checked = draftTypes.has(key);

                return (
                  <label
                    key={key}
                    className="group flex min-h-[44px] cursor-pointer items-center gap-3 px-1 py-2 transition-colors hover:bg-[var(--nurea-surface-hover)]"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center border transition-colors ${
                        checked
                          ? "border-[var(--nurea-accent)] bg-[var(--nurea-accent)]"
                          : "border-[var(--nurea-border)] bg-transparent group-hover:border-[var(--nurea-border-hover)]"
                      }`}
                    >
                      {checked && (
                        <Check
                          size={14}
                          strokeWidth={2.5}
                          className="text-white"
                        />
                      )}
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setDraftTypes(toggleSet(draftTypes, key))}
                      className="sr-only"
                    />
                    <span className="flex-1 text-[15px] text-[var(--nurea-text)]">
                      {label}
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-[var(--nurea-text-subtle)]">
                      {count}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section: Par marque */}
          <div className="px-5 pt-4 pb-2">
            <h3 className="mb-3 font-serif text-[15px] tracking-wide text-[var(--nurea-text)]">
              Par marque
            </h3>

            {/* Search */}
            <div className="relative mb-3">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nurea-text-subtle)]"
                aria-hidden
              />
              <input
                ref={searchRef}
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Rechercher une maison…"
                autoComplete="off"
                className="block min-h-[44px] w-full border border-[var(--nurea-border)] bg-[var(--nurea-bg)] py-2.5 pl-10 pr-3 text-[15px] text-[var(--nurea-text)] placeholder:text-[var(--nurea-text-subtle)] transition-colors focus-visible:border-[var(--nurea-accent)] focus-visible:outline-none"
              />
            </div>
          </div>

          {/* Brand list */}
          <div>
            {groups.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-[14px] text-[var(--nurea-text-muted)]">
                  Aucune maison trouvée.
                </p>
              </div>
            ) : (
              groups.map(([letter, items]) => (
                <div key={letter}>
                  <div className="sticky top-0 z-10 border-b border-[var(--nurea-border)]/50 bg-[var(--nurea-surface)] px-5 py-2">
                    <span className="text-[13px] font-bold text-[var(--nurea-accent)]">
                      {letter}
                    </span>
                  </div>
                  <ul>
                    {items.map((b) => {
                      const checked = draftBrands.has(b.slug);
                      return (
                        <li key={b.id}>
                          <label className="group flex min-h-[48px] w-full cursor-pointer items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-[var(--nurea-surface-hover)]">
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center border transition-colors ${
                                checked
                                  ? "border-[var(--nurea-accent)] bg-[var(--nurea-accent)]"
                                  : "border-[var(--nurea-border)] bg-transparent group-hover:border-[var(--nurea-border-hover)]"
                              }`}
                            >
                              {checked && (
                                <Check
                                  size={14}
                                  strokeWidth={2.5}
                                  className="text-white"
                                />
                              )}
                            </span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setDraftBrands(toggleSet(draftBrands, b.slug))
                              }
                              className="sr-only"
                            />
                            <span className="flex-1 text-[15px] text-[var(--nurea-text)]">
                              {b.name}
                            </span>
                            <span className="shrink-0 text-[12px] tabular-nums text-[var(--nurea-text-subtle)]">
                              {b.publishedCount}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--nurea-border)] px-5 py-4">
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[44px] px-3 text-[14px] text-[var(--nurea-text-muted)] underline underline-offset-2 transition-colors hover:text-[var(--nurea-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]"
          >
            Réinitialiser
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="min-h-[44px] bg-[var(--nurea-accent)] px-6 py-2.5 text-[14px] font-medium tracking-wide text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-bg)]"
          >
            Appliquer
            {draftResultCount >= 0 && (
              <span className="ml-1.5">({draftResultCount})</span>
            )}
          </button>
        </div>
      </aside>
    </>,
    document.body,
  );
}
