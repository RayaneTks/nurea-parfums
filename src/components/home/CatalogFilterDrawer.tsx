"use client";

import { useMemo, useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";

interface CatalogFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  brands: CatalogBrowseBrand[];
  mounted: boolean;
  selectedBrandSlugs: Set<string>;
  getResultCount: (brands: Set<string>) => number;
  onApply: (brands: Set<string>) => void;
  onReset: () => void;
}

export function CatalogFilterDrawer({
  open,
  onClose,
  brands,
  selectedBrandSlugs,
  onApply,
  onReset,
  getResultCount,
}: CatalogFilterDrawerProps) {
  const [draftBrands, setDraftBrands] = useState<Set<string>>(
    new Set(selectedBrandSlugs)
  );

  const [isRendered, setIsRendered] = useState(false);
  useEffect(() => setIsRendered(true), []);

  useEffect(() => {
    if (open) setDraftBrands(new Set(selectedBrandSlugs));
  }, [open, selectedBrandSlugs]);

  const toggleSet = (s: Set<string>, val: string) => {
    const next = new Set(s);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    return next;
  };

  const draftResultCount = getResultCount(draftBrands);

  const grouped = useMemo(() => {
    const map: Record<string, CatalogBrowseBrand[]> = {};
    const sorted = [...brands].sort((a, b) => a.name.localeCompare(b.name));
    for (const b of sorted) {
      const char = b.name.charAt(0).toUpperCase();
      const letter = /^[A-Z]$/.test(char) ? char : "#";
      if (!map[letter]) map[letter] = [];
      map[letter].push(b);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [brands]);

  /* Prevent scroll when open */
  useEffect(() => {
    if (open && typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!isRendered) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm transition-all duration-500 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer / Bottom Sheet */}
      <aside
        className={`fixed z-[120] flex flex-col bg-[var(--nurea-surface)] shadow-2xl transition-all duration-500 ease-out-expo
          /* Mobile: Bottom Sheet */
          bottom-0 left-0 right-0 h-[85vh] rounded-t-[32px] md:rounded-t-none
          ${open ? "translate-y-0" : "translate-y-full"}
          /* Desktop: Sidebar Drawer */
          md:right-0 md:left-auto md:top-0 md:h-full md:w-full md:max-w-[400px]
          md:${open ? "translate-x-0 translate-y-0" : "translate-x-full translate-y-0"}
        `}
      >
        {/* Mobile Drag Handle */}
        <div className="flex w-full justify-center pt-3 pb-1 md:hidden">
          <div className="h-1.5 w-12 rounded-full bg-[var(--nurea-border-hover)]" />
        </div>

        <div className="flex items-center justify-between border-b border-[var(--nurea-border)]/50 px-6 py-5">  
          <h2 className="font-serif text-xl tracking-tight text-[var(--nurea-text)]">
            Filtrer par Marques
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[var(--nurea-surface-hover)] text-[var(--nurea-text-muted)]"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain pb-40">
          {grouped.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-[var(--nurea-text-muted)]">
                Aucune marque disponible.
              </p>
            </div>
          ) : (
            grouped.map(([letter, items]) => (
              <div key={letter} className="relative">
                <div className="sticky top-0 z-20 border-b border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)]/95 px-5 py-2.5 backdrop-blur-md shadow-sm">
                  <span className="text-[12px] font-bold uppercase tracking-[0.3em] text-[var(--nurea-accent)]">
                    {letter}
                  </span>
                </div>
                <ul className="divide-y divide-[var(--nurea-border)]/40">
                  {items.map((b) => {
                    const checked = draftBrands.has(b.slug);
                    return (
                      <li key={b.id}>
                        <label className="group flex min-h-[56px] w-full cursor-pointer items-center gap-4 px-5 py-3 text-left transition-all hover:bg-[var(--nurea-surface-hover)] active:bg-[var(--nurea-surface-hover)]/50 active:scale-[0.99] touch-manipulation">
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center border transition-all duration-300 rounded-md ${
                              checked
                                ? "border-[var(--nurea-accent)] bg-[var(--nurea-accent)] shadow-[0_0_10px_rgba(216,128,128,0.2)]"
                                : "border-[var(--nurea-text-subtle)]/30 bg-transparent group-hover:border-[var(--nurea-accent)]"
                            }`}
                          >
                            {checked && (
                              <Check
                                size={13}
                                strokeWidth={3.5}
                                className="text-white animate-scale-in"
                              />
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setDraftBrands(toggleSet(draftBrands, b.slug))
                            }
                            className="sr-only"
                          />
                          <span className={`flex-1 text-[15px] tracking-wide transition-colors duration-300 ${checked ? "text-[var(--nurea-text)] font-semibold" : "text-[var(--nurea-text-muted)] group-hover:text-[var(--nurea-text)]"}`}>
                            {b.name}
                          </span>
                          <span className={`shrink-0 font-mono text-[10px] font-bold tracking-wider transition-colors duration-300 ${checked ? "text-[var(--nurea-accent)]" : "text-[var(--nurea-text-subtle)] opacity-80"}`}>  
                            {b.assortment === "COMPLETE" ? "TOUT" : b.publishedCount}
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

        <div className="absolute bottom-0 left-0 z-30 w-full border-t border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)]/90 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl md:bg-[var(--nurea-surface)]">
          <div className="mb-4 flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--nurea-text-muted)]">   
              {draftBrands.size} marque{draftBrands.size > 1 ? "s" : ""} sélectionnée{draftBrands.size > 1 ? "s" : ""}
            </span>
            {draftBrands.size > 0 && (
              <button
                onClick={() => {
                  setDraftBrands(new Set());
                  onReset();
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-[var(--nurea-accent)] hover:opacity-80 transition-opacity"
              >
                Réinitialiser
              </button>
            )}
          </div>
          <button
            onClick={() => onApply(draftBrands)}
            className="btn-nurea w-full justify-center bg-[var(--nurea-accent)] text-white hover:bg-[var(--nurea-accent-hover)] border-none h-14 rounded-2xl text-base font-bold shadow-xl shadow-[var(--nurea-accent-subtle)]/20 active:scale-95 transition-transform" 
          >
            Afficher les résultats
            {draftResultCount >= 0 && (
              <span className="ml-1.5 opacity-80">({draftResultCount})</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
