"use client";

import type { ChangeEvent, FC } from "react";
import { Search, X } from "lucide-react";
import { categories, type Category } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { SortKey } from "./useCatalogFilters";

const SEARCH_ID = "catalogue-recherche";
const SORT_ID = "catalogue-tri";

const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "default", label: "Ordre du catalogue" },
  { value: "name", label: "Nom (A–Z)" },
  { value: "brand", label: "Marque (A–Z)" },
];

interface CatalogToolbarProps {
  query: string;
  category: Category;
  sort: SortKey;
  resultLabel: string;
  onQueryChange: (value: string) => void;
  onCategoryChange: (category: Category) => void;
  onSortChange: (sort: SortKey) => void;
}

/**
 * Recherche, catégories et tri — collés sous la barre de navigation.
 *
 * Le bloc reste visible pendant tout le défilement du catalogue. Il ne se
 * masque plus au défilement vers le bas : ce comportement demandait un
 * accumulateur de gestes, et faisait disparaître les filtres au moment précis
 * où l'on parcourt les résultats qu'ils produisent.
 */
export const CatalogToolbar: FC<CatalogToolbarProps> = ({
  query,
  category,
  sort,
  resultLabel,
  onQueryChange,
  onCategoryChange,
  onSortChange,
}) => (
  <div className="sticky top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-30 -mx-6 border-b border-nurea-border bg-nurea-bg px-6 md:top-[calc(env(safe-area-inset-top,0px)+4.25rem)] md:-mx-18 md:px-18">
    <div className="relative flex items-center border-b border-nurea-border">
      <label htmlFor={SEARCH_ID} className="sr-only">
        Rechercher une marque ou un parfum
      </label>
      <Search
        size={18}
        strokeWidth={1.5}
        aria-hidden
        className="pointer-events-none absolute left-0 text-nurea-subtle"
      />
      <input
        id={SEARCH_ID}
        type="search"
        name="q"
        value={query}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onQueryChange(event.target.value)
        }
        placeholder="Rechercher une marque, un parfum…"
        autoComplete="off"
        enterKeyHint="search"
        className="h-14 w-full border-0 bg-transparent pl-8 pr-12 text-base text-nurea-text outline-none placeholder:text-nurea-subtle"
      />
      {query !== "" && (
        <button
          type="button"
          onClick={() => onQueryChange("")}
          aria-label="Effacer la recherche"
          className="absolute right-0 flex h-11 w-11 items-center justify-center text-nurea-subtle transition-colors duration-nurea ease-out hover:text-nurea-text"
        >
          <X size={18} strokeWidth={1.5} />
        </button>
      )}
    </div>

    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2">
      <div
        role="tablist"
        aria-label="Catégories"
        className="no-scrollbar -mx-3 flex min-w-0 flex-1 overflow-x-auto"
      >
        {categories.map((item) => {
          const active = item === category;
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onCategoryChange(item)}
              className={cn(
                "nurea-label relative shrink-0 px-3 py-4 transition-colors duration-nurea ease-out",
                active
                  ? "text-nurea-accent"
                  : "text-nurea-subtle hover:text-nurea-text"
              )}
            >
              {item}
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-x-3 bottom-0 h-px bg-nurea-accent"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <span className="nurea-caption whitespace-nowrap">{resultLabel}</span>
        <label htmlFor={SORT_ID} className="sr-only">
          Trier le catalogue
        </label>
        <select
          id={SORT_ID}
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortKey)}
          className="h-11 border border-nurea-border bg-nurea-surface px-3 text-sm text-nurea-text outline-none transition-colors duration-nurea ease-out focus:border-nurea-accent"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  </div>
);
