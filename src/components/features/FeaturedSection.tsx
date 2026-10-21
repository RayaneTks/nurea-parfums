"use client";

import type { FC } from "react";
import type { Perfume } from "@/lib/data";
import { ambientStyle } from "@/lib/catalog/ambient";
import { brandLineLabel } from "@/lib/catalog/perfumePresentation";
import { perfumePath, slugify } from "@/lib/seo/paths";
import { openSheetFromLink, requestSheet } from "./openPerfume";
import { PerfumeImage } from "./PerfumeImage";

interface FeaturedSectionProps {
  /** Les parfums mis en avant par la gestion, deux au plus, dans l'ordre du catalogue. */
  perfumes: Perfume[];
}

/**
 * « À l'affiche » (04-PLAN-EXECUTION.md § B.10, composition « Chambre ») : les parfums que la
 * gestion met en avant, après la hero, en format compact et éditorial — les deux côte à côte dès le
 * téléphone, chacun : son visuel 2:3, puis sa légende (marque, nom) sur un bandeau à la couleur de
 * son flacon (ambiance, § B.3.8 ; repli `--surface-1`). Visuel et nom ouvrent la fiche en feuille,
 * même touchés avant que le catalogue soit prêt (la demande attend) ; le nom est un vrai lien vers
 * la page indexable du parfum.
 */
export const FeaturedSection: FC<FeaturedSectionProps> = ({ perfumes }) =>
  perfumes.length === 0 ? null : (
    <section aria-labelledby="affiche-titre" className="page-x mt-[var(--space-section)]">
      <h2 id="affiche-titre" className="t-title mb-4">
        À l&apos;affiche
      </h2>
      <ul className="affiche">
        {perfumes.slice(0, 2).map((perfume) => {
          const brandLine = brandLineLabel(perfume.brand, perfume.line);
          const href = perfumePath(perfume.brandSlug ?? slugify(perfume.brand), perfume.name, perfume.id);
          const titleId = `une-${perfume.id}`;
          return (
            <li key={perfume.id}>
              <article aria-labelledby={titleId} style={ambientStyle(perfume)} className="amb overflow-hidden rounded-md">
                <button
                  type="button"
                  onClick={() => requestSheet(perfume.id)}
                  aria-label={`Voir la fiche : ${perfume.name}, ${brandLine}`}
                  className="affiche-visuel relative block w-full bg-surface-2"
                >
                  <PerfumeImage perfume={perfume} sizes="(min-width: 1024px) 400px, 213px" />
                </button>
                <div className="affiche-legende bg-ambient">
                  <p className="t-caption">{brandLine}</p>
                  <h3 id={titleId} className="t-subtitle hyphens-auto [overflow-wrap:anywhere]">
                    <a href={href} onClick={openSheetFromLink(perfume.id)} className="underline-offset-[6px] decoration-1 mouse-hover:underline">
                      {perfume.name}
                    </a>
                  </h3>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
