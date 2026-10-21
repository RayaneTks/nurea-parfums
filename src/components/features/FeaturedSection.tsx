"use client";

import { useState, type FC } from "react";
import type { Perfume } from "@/lib/data";
import { CHIP } from "@/components/home/CatalogToolbar";
import { buttonClass } from "@/components/ui/Button";
import { ambientStyle } from "@/lib/catalog/ambient";
import { brandLineLabel } from "@/lib/catalog/perfumePresentation";
import { perfumePath, slugify } from "@/lib/seo/paths";
import { cn } from "@/lib/utils";
import { openSheetFromLink, requestSheet } from "./openPerfume";
import { PerfumeImage } from "./PerfumeImage";

interface FeaturedSectionProps {
  /** Les parfums mis en avant par la gestion, deux au plus, dans l'ordre du catalogue. */
  perfumes: Perfume[];
}

/**
 * « À l'affiche » (04-PLAN-EXECUTION.md § B.10) : la recommandation de la maison, présentée comme
 * un panneau à la couleur du flacon (ambiance, § B.3.8 ; repli `--surface-1`) — visuel 2:3, marque,
 * nom en `title`, et l'entrée « Voir la fiche ». Sur téléphone, un seul panneau à la fois ; les
 * puces du catalogue, au nom de chaque parfum, font passer de l'un à l'autre et le panneau prend la
 * couleur du parfum choisi. Dès 768 px, les panneaux côte à côte, sans puces.
 *
 * Langage des composants inchangé : panneau `--r-lg`, visuel `--r-md` (concentrique, marge 8 px),
 * puces `CHIP` du catalogue, `Button` secondaire. Visuel, nom et bouton ouvrent la fiche en feuille,
 * même touchés avant que le catalogue soit prêt ; le nom est un vrai lien vers la page indexable.
 */
export const FeaturedSection: FC<FeaturedSectionProps> = ({ perfumes }) => {
  const shown = perfumes.slice(0, 2);
  const [active, setActive] = useState(0);
  if (shown.length === 0) return null;

  return (
    <section aria-labelledby="affiche-titre" className="page-x mt-[var(--space-section)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h2 id="affiche-titre" className="t-title">
          À l&apos;affiche
        </h2>
        {shown.length > 1 && (
          <div role="group" aria-label="Choisir le parfum à l'affiche" className="flex gap-2 md:hidden">
            {shown.map((perfume, index) => (
              <button
                key={perfume.id}
                type="button"
                aria-pressed={index === active}
                onClick={() => setActive(index)}
                className={CHIP}
              >
                {perfume.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="affiche">
        {shown.map((perfume, index) => {
          const brandLine = brandLineLabel(perfume.brand, perfume.line);
          const href = perfumePath(perfume.brandSlug ?? slugify(perfume.brand), perfume.name, perfume.id);
          const titleId = `une-${perfume.id}`;
          return (
            <article
              key={perfume.id}
              aria-labelledby={titleId}
              style={ambientStyle(perfume)}
              data-actif={index === active || undefined}
              className="amb affiche-panneau rounded-lg bg-ambient p-2"
            >
              <button
                type="button"
                onClick={() => requestSheet(perfume.id)}
                aria-label={`Voir la fiche : ${perfume.name}, ${brandLine}`}
                className="press relative block aspect-[2/3] w-full overflow-hidden rounded-md bg-surface-2"
              >
                <PerfumeImage perfume={perfume} sizes="(min-width: 768px) 176px, 152px" />
              </button>
              <div className="flex min-w-0 flex-col gap-1 pb-2 pr-2">
                <p className="t-body">{brandLine}</p>
                <h3 id={titleId} className="t-title hyphens-auto [overflow-wrap:anywhere]">
                  <a href={href} onClick={openSheetFromLink(perfume.id)} className="underline-offset-[6px] decoration-1 mouse-hover:underline">
                    {perfume.name}
                  </a>
                </h3>
                <button
                  type="button"
                  onClick={() => requestSheet(perfume.id)}
                  className={cn(buttonClass("outline"), "mt-3 self-start")}
                >
                  Voir la fiche
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
