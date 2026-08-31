"use client";

import type { FC } from "react";
import type { Perfume } from "@/lib/data";
import { isCompleteRange } from "@/lib/catalog/perfumePresentation";
import { PerfumeImage } from "./PerfumeImage";

interface PerfumeCardProps {
  perfume: Perfume;
  /**
   * Troisième ligne imposée par la charte, après la marque et le nom.
   * Calculée par la section : la fiche seule ne connaît pas le nombre de
   * références d'une marque. Omise quand rien de vrai n'est disponible —
   * mieux vaut une ligne absente qu'une contenance inventée.
   */
  caption?: string;
  onOpen: (perfume: Perfume) => void;
  imagePriority?: boolean;
}

/**
 * Fiche produit du catalogue — charte § 05.
 *
 * Ordre imposé : marque, nom, contenance. Le prix n'apparaît jamais en grille,
 * seulement dans l'échange direct.
 *
 * Survol : la couleur de fond, rien d'autre. Ni déplacement, ni agrandissement,
 * ni ombre — c'est la règle du § 05, et elle n'a pas d'exception.
 */
export const PerfumeCard: FC<PerfumeCardProps> = ({
  perfume,
  caption,
  onOpen,
  imagePriority = false,
}) => (
  <button
    type="button"
    onClick={() => onOpen(perfume)}
    aria-label={
      isCompleteRange(perfume)
        ? `${perfume.brand} : voir les parfums de la marque`
        : `${perfume.brand} — ${perfume.name} : voir comment commander`
    }
    className="flex w-full flex-col border border-nurea-border bg-nurea-surface text-left transition-colors duration-nurea ease-out hover:bg-nurea-surface-hover"
  >
    <div className="relative aspect-square w-full overflow-hidden">
      <PerfumeImage
        perfume={perfume}
        sizes="(max-width: 1023px) 50vw, 33vw"
        priority={imagePriority}
      />

      {perfume.tags?.length ? (
        <div className="absolute left-0 top-0 flex flex-col">
          {perfume.tags.map((tag) => (
            <span
              key={tag}
              className="nurea-label bg-nurea-accent px-3 py-2 text-nurea-on-accent"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>

    <div className="border-t border-nurea-border p-5">
      <p className="nurea-label line-clamp-2">{perfume.brand}</p>
      <p className="nurea-name mt-2 line-clamp-2 text-nurea-text">{perfume.name}</p>
      {caption ? <p className="nurea-caption mt-2">{caption}</p> : null}
    </div>
  </button>
);
