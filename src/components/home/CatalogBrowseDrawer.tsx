"use client";

import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Category } from "@/lib/data";
import type { CatalogBrowseBrand, CatalogPositioning } from "@/lib/catalog/catalogBrowseTypes";

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

export function CatalogBrowseDrawer({
  open,
  onClose,
  brands,
  onSelectMaison,
  activeMaisonSlug,
  mounted,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState("");

  const sorted = useMemo(
    () => [...brands].sort((a, b) => a.name.localeCompare(b.name)),
    [brands],
  );

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((b) => b.name.toLowerCase().includes(q));
  }, [sorted, filter]);

  const groups = useMemo(() => groupByLetter(filtered), [filtered]);

  useEffect(() => {
    if (!open) return;
    setFilter("");
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
        className={`fixed inset-y-0 right-0 z-[71] flex w-full flex-col bg-[var(--nurea-bg)] shadow-[-8px_0_40px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-out-expo sm:w-[400px] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Nos Maisons"
        aria-hidden={!open}
        {...(!open ? { inert: true as unknown as boolean } : {})}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--nurea-border)] px-4 py-4">
          <h2 className="font-serif text-xl text-[var(--nurea-text)]">
            Nos Maisons
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

        {/* Search */}
        <div className="relative shrink-0 border-b border-[var(--nurea-border)] px-4 py-3">
          <Search
            className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nurea-text-subtle)]"
            aria-hidden
          />
          <input
            ref={searchRef}
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Rechercher une maison…"
            autoComplete="off"
            className="block min-h-11 w-full border border-[var(--nurea-border)] bg-[var(--nurea-bg)] py-2.5 pl-10 pr-3 text-[15px] text-[var(--nurea-text)] placeholder:text-[var(--nurea-text-subtle)] transition-colors focus-visible:border-[var(--nurea-accent)] focus-visible:outline-none"
          />
        </div>

        {/* Brand list */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {groups.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-[14px] text-[var(--nurea-text-muted)]">
                Aucune maison trouvée.
              </p>
            </div>
          ) : (
            groups.map(([letter, items]) => (
              <div key={letter}>
                <div className="sticky top-0 z-10 border-b border-[var(--nurea-border)]/50 bg-[var(--nurea-surface)] px-4 py-2">
                  <span className="text-[13px] font-bold text-[var(--nurea-accent)]">
                    {letter}
                  </span>
                </div>
                <ul>
                  {items.map((b) => {
                    const active = activeMaisonSlug === b.slug;
                    return (
                      <li key={b.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectMaison(b.slug);
                            onClose();
                          }}
                          className={`flex w-full min-h-12 items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                            active
                              ? "bg-[var(--nurea-accent-subtle)] text-[var(--nurea-text)]"
                              : "text-[var(--nurea-text)] hover:bg-[var(--nurea-surface-hover)]"
                          }`}
                        >
                          <span className="text-[15px]">{b.name}</span>
                          <span className="shrink-0 text-[12px] tabular-nums text-[var(--nurea-text-subtle)]">
                            {b.publishedCount}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}
