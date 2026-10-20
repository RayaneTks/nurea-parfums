"use client";

import type { FC } from "react";
import type { Perfume } from "@/lib/data";
import { ambientStyle } from "@/lib/catalog/ambient";
import { brandLineLabel } from "@/lib/catalog/perfumePresentation";
import { PerfumeImage } from "./PerfumeImage";
import { SelectionHeart } from "./SelectionHeart";

interface PerfumeCardProps {
  perfume: Perfume;
  onOpen: (perfume: Perfume) => void;
  imagePriority?: boolean;
  /** Largeur affichée du visuel (attribut `sizes`) ; défaut = grille à deux colonnes sur téléphone. */
  sizes?: string;
}

/**
 * Carte parfum (DESIGN.md § Composants signature, 04-PLAN-EXECUTION § B.9).
 *
 * Visuel 2:3, puis « Marque · Ligne », puis le nom. **Jamais de prix, jamais de contenance.**
 * Toute la carte ouvre la fiche (bouton du nom étendu par `::after`) ; le cœur « Ma sélection »
 * est un bouton à part, posé au-dessus. Survol et appui : le fond prend la couleur d'ambiance du
 * parfum, ou `--surface-2` sans elle ; à l'appui la carte cède (`--press`). Règles : `.card`,
 * `app/globals.css`. Rayons concentriques : carte 20 − marge 8 = visuel 12.
 */
export const PerfumeCard: FC<PerfumeCardProps> = ({
  perfume,
  onOpen,
  imagePriority = false,
  sizes = "(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw",
}) => {
  const brandLine = brandLineLabel(perfume.brand, perfume.line);

  return (
    <article className="card relative flex w-full min-w-0 flex-col rounded-lg p-2" style={ambientStyle(perfume)}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-surface-2">
        <PerfumeImage
          perfume={perfume}
          sizes={sizes}
          priority={imagePriority}
        />
        {perfume.tags?.length ? (
          <ul className="absolute left-2 top-2 flex flex-col items-start gap-1">
            {perfume.tags.map((tag) => (
              <li key={tag} className="t-caption rounded-sm bg-surface-1 px-2 py-1 text-fg-1">
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-1 px-2 pb-2 pt-3">
        <p className="card-brand t-body line-clamp-2 hyphens-auto [overflow-wrap:anywhere]">{brandLine}</p>
        <p className="card-name t-subtitle hyphens-auto [overflow-wrap:anywhere]">
          <button
            type="button"
            onClick={() => onOpen(perfume)}
            aria-label={`${brandLine} — ${perfume.name} : voir comment commander`}
            className="card-open block w-full text-left after:absolute after:inset-0 after:rounded-lg"
          >
            {/* La limite de lignes vit dans le bouton : posée sur le <p>, elle ne voit qu'une boîte. */}
            <span className="line-clamp-3">{perfume.name}</span>
          </button>
        </p>
      </div>

      <SelectionHeart id={perfume.id} name={perfume.name} className="absolute right-3 top-3" />
    </article>
  );
};
