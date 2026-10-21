"use client";

import type { FC } from "react";
import { Columns2, Columns3, SlidersHorizontal, Square, type LucideIcon } from "lucide-react";
import { categories, type Category } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { Density, SortKey } from "./useCatalogFilters";

const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  // L'ordre par défaut change à chaque visite (`discoveryOrder`).
  { value: "default", label: "Du moment" },
  { value: "name", label: "Nom A–Z" },
  { value: "brand", label: "Marque A–Z" },
];

const DENSITIES: ReadonlyArray<{ value: Density; label: string; Icon: LucideIcon }> = [
  { value: 1, label: "Grands visuels", Icon: Square },
  { value: 2, label: "Visuels moyens", Icon: Columns2 },
  { value: 3, label: "Petits visuels", Icon: Columns3 },
];

/* Puce (DESIGN.md : `--r-sm`) ; active = `--surface-2`. 44 px de haut, la cible tactile. */
/** Puce du catalogue (filtres) ; réutilisée telle quelle par « À l'affiche » de l'accueil. */
export const CHIP =
  "press inline-flex h-11 shrink-0 items-center gap-2 rounded-sm border border-line px-4 text-fg-2 transition-[background-color,color,transform] duration-dur-2 ease-soft mouse-hover:text-fg-1 aria-pressed:border-accent aria-pressed:bg-accent-wash aria-pressed:text-accent aria-selected:border-accent aria-selected:bg-accent-wash aria-selected:text-accent";

interface CatalogToolbarProps {
  category: Category;
  sort: SortKey;
  density: Density;
  resultLabel: string;
  /** Marques cochées dans le panneau, pour le libellé du bouton. */
  brandCount: number;
  onCategoryChange: (category: Category) => void;
  onSortChange: (sort: SortKey) => void;
  onDensityChange: (density: Density) => void;
  onOpenBrands: () => void;
}

/**
 * Outils du catalogue, au-dessus de la grille, dans le flux : la barre haute est déjà collante,
 * une seconde couche collante mangerait l'écran du téléphone. La recherche vit dans la barre haute
 * (T5) : pas de second champ ici. Tout passe en retour à la ligne plutôt que de déborder à 320 px.
 */
export const CatalogToolbar: FC<CatalogToolbarProps> = ({
  category,
  sort,
  density,
  resultLabel,
  brandCount,
  onCategoryChange,
  onSortChange,
  onDensityChange,
  onOpenBrands,
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center gap-2">
      <div role="tablist" aria-label="Catégories" className="flex flex-wrap gap-2">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={item === category}
            onClick={() => onCategoryChange(item)}
            className={CHIP}
          >
            {item}
          </button>
        ))}
      </div>
      <button type="button" onClick={onOpenBrands} aria-pressed={brandCount > 0} className={cn(CHIP, "ml-auto")}>
        <SlidersHorizontal size={18} strokeWidth={1.5} aria-hidden />
        {brandCount > 0 ? `Marques · ${brandCount}` : "Marques"}
      </button>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p className="t-caption" aria-live="polite">
        {resultLabel}
      </p>
      <div className="flex items-center gap-2">
        <label htmlFor="catalogue-tri" className="sr-only">
          Trier le catalogue
        </label>
        <select
          id="catalogue-tri"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortKey)}
          // 1rem : en dessous, iOS agrandit la page au focus.
          className="t-body h-11 rounded-md border border-line bg-surface-1 px-3 text-fg-1 transition-[background-color] duration-dur-2 ease-soft mouse-hover:bg-surface-2"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div role="group" aria-label="Taille des visuels" className="flex">
          {DENSITIES.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              aria-label={label}
              aria-pressed={density === value}
              onClick={() => onDensityChange(value)}
              className="press flex h-11 w-11 items-center justify-center rounded-md text-fg-3 transition-[background-color,color,transform] duration-dur-2 ease-soft mouse-hover:text-fg-1 aria-pressed:bg-accent-wash aria-pressed:text-accent"
            >
              <Icon size={18} strokeWidth={1.5} aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);
