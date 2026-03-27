"use client";

import { useMemo } from "react";
import { X, Check } from "lucide-react";
import { AdminButton } from "../admin/ui/AdminButton";
import { Perfume } from "@/lib/data";

type CatalogBrowseBrand = {
  id: string;
  name: string;
  image: string | null;
  catalogMode: "CURATED" | "COMPLETE";
  publishedCount: number;
};

interface CatalogFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  brands: CatalogBrowseBrand[];
  categories: string[];
  selectedBrands: string[];
  selectedCategories: string[];
  onToggleBrand: (brandName: string) => void;
  onToggleCategory: (category: string) => void;
  onClearFilters: () => void;
  totalResults: number;
}

export function CatalogFilterDrawer({
  isOpen,
  onClose,
  brands,
  categories,
  selectedBrands,
  selectedCategories,
  onToggleBrand,
  onToggleCategory,
  onClearFilters,
  totalResults,
}: CatalogFilterDrawerProps) {
  const hasFilters = selectedBrands.length > 0 || selectedCategories.length > 0;

  return (
    <div
      className={`fixed inset-0 z-[100] transition-all duration-500 ease-out ${
        isOpen ? "visible" : "invisible pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-[380px] bg-zinc-950 border-l border-white/5 shadow-2xl transition-transform duration-500 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
            <div>
              <h2 className="text-xl font-serif text-white tracking-tight">Filtres</h2>
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mt-0.5">
                {totalResults} résultat{totalResults > 1 ? 's' : ''} trouvé{totalResults > 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-8 no-scrollbar">
            <div className="space-y-10">
              {/* Catégories */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                    Catégories
                  </h3>
                  {selectedCategories.length > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--nurea-accent)] shadow-[0_0_8px_var(--nurea-accent)]" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {categories.map((cat) => {
                    const active = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => onToggleCategory(cat)}
                        className={`px-4 py-2.5 rounded-full text-[13px] font-medium transition-all duration-300 border ${
                          active
                            ? "bg-white border-white text-black shadow-xl shadow-white/10 scale-95"
                            : "bg-white/5 border-white/5 text-zinc-400 hover:border-white/20 active:scale-95"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Marques */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                    Marques
                  </h3>
                  {selectedBrands.length > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--nurea-accent)] shadow-[0_0_8px_var(--nurea-accent)]" />
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {brands.map((b) => {
                    const active = selectedBrands.includes(b.name);
                    return (
                      <button
                        key={b.id}
                        onClick={() => onToggleBrand(b.name)}
                        className={`group relative flex items-center justify-between w-full p-3 rounded-2xl transition-all duration-300 border ${
                          active
                            ? "bg-white/10 border-white/20 text-white"
                            : "bg-white/5 border-transparent text-zinc-400 hover:bg-white/10 active:scale-[0.98]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                            active ? "bg-[var(--nurea-accent)] border-[var(--nurea-accent)]" : "bg-black/20 border-white/10 group-hover:border-white/20"
                          }`}>
                            {active && <Check className="h-3 w-3 text-white stroke-[3]" />}
                          </div>
                          <span className="text-[14px] font-medium">{b.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/40 ${
                            active ? "text-white" : "text-zinc-600"
                          }`}>
                            {b.catalogMode === "COMPLETE" ? "TOUT" : b.publishedCount.toString().padStart(2, '0')}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/5 p-6 bg-zinc-950/80 backdrop-blur-xl">
            <div className="flex flex-col gap-3">
              <AdminButton
                onClick={onClose}
                className="w-full h-14 rounded-2xl text-[15px] font-bold shadow-2xl shadow-white/5"
              >
                Appliquer les filtres
              </AdminButton>
              {hasFilters && (
                <button
                  onClick={onClearFilters}
                  className="w-full py-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
