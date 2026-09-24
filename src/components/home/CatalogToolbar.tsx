"use client";

import type { ChangeEvent, FC } from "react";
import { Search, X } from "lucide-react";
import { categories, type Category } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { SortKey } from "./useCatalogFilters";

const SEARCH_ID = "catalogue-recherche";

const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "default", label: "Ordre du catalogue" },
  { value: "name", label: "Nom (A–Z)" },
  { value: "brand", label: "Marque (A–Z)" },
];

interface SortControlProps {
  id: string;
  sort: SortKey;
  resultLabel: string;
  onSortChange: (sort: SortKey) => void;
  className?: string;
}

/**
 * Nombre de résultats et tri, côte à côte.
 *
 * Rendu deux fois par la section, jamais en même temps : dans la barre collante sur grand écran,
 * sous elle sur téléphone (`CatalogSection`). Sur téléphone il n'a pas sa place dans la barre :
 * il écrasait les onglets jusqu'à « TOUT VO », et la barre collante mangeait 150 px d'écran en
 * permanence. D'où l'`id` en paramètre — deux listes déroulantes ne partagent pas un identifiant.
 */
export const SortControl: FC<SortControlProps> = ({ id, sort, resultLabel, onSortChange, className }) => (
  <div className={cn("flex items-center gap-4", className)}>
    <span className="nurea-caption whitespace-nowrap" aria-live="polite">
      {resultLabel}
    </span>
    <label htmlFor={id} className="sr-only">
      Trier le catalogue
    </label>
    <select
      id={id}
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
);

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
        placeholder="Marque ou parfum…"
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

    <div className="flex items-center justify-between gap-x-6 py-2">
      {/* Téléphone : les onglets ont toute la largeur, et leur bord droit s'efface pour dire qu'ils
          défilent. `-mr-6` : la rangée va jusqu'au bord de l'écran, là où le pouce la pousse. */}
      <div
        role="tablist"
        aria-label="Catégories"
        className="no-scrollbar nurea-defilement -ml-3 -mr-6 flex min-w-0 flex-1 overflow-x-auto pr-6 md:-mr-3 md:pr-0"
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

      <SortControl
        id="catalogue-tri"
        sort={sort}
        resultLabel={resultLabel}
        onSortChange={onSortChange}
        className="hidden shrink-0 md:flex"
      />
    </div>
  </div>
);
