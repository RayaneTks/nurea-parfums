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
 * « À l'affiche » (04-PLAN-EXECUTION.md § B.10) : les deux vedettes de l'accueil, visibles ensemble, de
 * même poids, chacune en **composition horizontale** — sa photographie entière (2:3, jamais recadrée :
 * fidèle et reconnaissable quel que soit le parfum mis en avant) à gauche, bord à bord dans l'objet ; à
 * droite, sur la couleur du flacon (ambiance, § B.3.8 ; repli `--surface-1`), la marque et le nom en
 * `title`, calés en bas. Un seul objet arrondi (`--r-lg`). Empilées sur téléphone, côte à côte dès 768 px.
 *
 * Ce qui la distingue du catalogue : le format horizontal, la photo sans passe-partout ni cœur, le nom à
 * l'échelle `title` sur la couleur du parfum. Toute la photo ouvre la fiche en feuille, même touchée avant
 * que le catalogue soit prêt ; le nom est un vrai lien vers la page indexable.
 */
export const FeaturedSection: FC<FeaturedSectionProps> = ({ perfumes }) => {
  const shown = perfumes.slice(0, 2);
  if (shown.length === 0) return null;

  return (
    <section aria-labelledby="affiche-titre" className="page-x mt-[var(--space-section)]">
      <h2 id="affiche-titre" className="t-title mb-4">
        À l&apos;affiche
      </h2>
      <div className="affiche">
        {shown.map((perfume) => {
          const brandLine = brandLineLabel(perfume.brand, perfume.line);
          const href = perfumePath(perfume.brandSlug ?? slugify(perfume.brand), perfume.name, perfume.id);
          const titleId = `une-${perfume.id}`;
          return (
            <article key={perfume.id} aria-labelledby={titleId} style={ambientStyle(perfume)} className="amb affiche-compo bg-ambient">
              <button
                type="button"
                onClick={() => requestSheet(perfume.id)}
                aria-label={`Voir la fiche : ${perfume.name}, ${brandLine}`}
                className="affiche-photo relative block w-full overflow-hidden bg-surface-2"
              >
                <PerfumeImage perfume={perfume} sizes="(min-width: 768px) 25vw, 213px" />
              </button>
              <div className="affiche-legende">
                <p className="t-body">{brandLine}</p>
                <h3 id={titleId} className="affiche-nom t-title hyphens-auto [overflow-wrap:anywhere]">
                  <a href={href} onClick={openSheetFromLink(perfume.id)} className="underline-offset-[6px] decoration-1 mouse-hover:underline">
                    {perfume.name}
                  </a>
                </h3>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
