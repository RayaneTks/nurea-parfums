"use client";

import type { FC } from "react";
import type { Perfume } from "@/lib/data";
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
 * « À l'affiche » (04-PLAN-EXECUTION.md § B.10, référence du gérant du 21/10) : deux **bandeaux
 * photographiques horizontaux**, l'un sous l'autre, en miroir — le premier, flacon à gauche et texte à
 * droite ; le second, texte à gauche et flacon à droite.
 *
 * Dans chaque bandeau, une seule scène : le visuel du parfum, **entier** (2:3, jamais recadré, flacon
 * intact), occupe toute la hauteur d'un côté et se fond par son bord dans la même photo, agrandie et
 * floutée, qui remplit le reste du bandeau — l'univers du parfum se prolonge derrière le texte. Le nom
 * (`title`) et la marque se posent dans cette zone calme, sur un voile discret à la couleur du fond de la
 * page (sombre en thème sombre, ivoire en clair : le contraste suit le thème, comme les visuels).
 *
 * Tout le bandeau ouvre la fiche en feuille (bouton étendu) ; « Voir la fiche » le dit ; le nom est un
 * vrai lien vers la page indexable. Bandeau `--r-lg`, 4:3 sur téléphone, 16:7 dès 768 px ; sur bureau,
 * 62 rem en 16:9, le premier calé à gauche, le second à droite.
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
        {shown.map((perfume, index) => {
          const brandLine = brandLineLabel(perfume.brand, perfume.line);
          const href = perfumePath(perfume.brandSlug ?? slugify(perfume.brand), perfume.name, perfume.id);
          const titleId = `une-${perfume.id}`;
          return (
            <article key={perfume.id} aria-labelledby={titleId} className={cn("bandeau", index % 2 === 1 && "bandeau-miroir")}>
              {/* L'univers du parfum : la même photo, agrandie et floutée, derrière toute la scène. */}
              <div className="bandeau-fond" aria-hidden="true">
                <PerfumeImage perfume={perfume} sizes="213px" />
              </div>
              <div className="bandeau-voile" aria-hidden="true" />

              <div className="bandeau-visuel" aria-hidden="true">
                <PerfumeImage perfume={perfume} sizes="(min-width: 768px) 360px, 213px" />
              </div>

              <div className="bandeau-texte">
                <p className="t-body">{brandLine}</p>
                <h3 id={titleId} className="affiche-nom t-title hyphens-manual [overflow-wrap:anywhere]">
                  <a href={href} onClick={openSheetFromLink(perfume.id)} className="relative z-[2] underline-offset-[6px] decoration-1 mouse-hover:underline">
                    {perfume.name}
                  </a>
                </h3>
                <span className="t-body mt-2 text-fg-1 underline decoration-1 underline-offset-4" aria-hidden="true">
                  Voir la fiche
                </span>
              </div>

              {/* Tout le bandeau ouvre la fiche (bouton étendu, sous le lien du nom). */}
              <button
                type="button"
                onClick={() => requestSheet(perfume.id)}
                aria-label={`Voir la fiche : ${perfume.name}, ${brandLine}`}
                className="bandeau-ouvrir"
              />
            </article>
          );
        })}
      </div>
    </section>
  );
};
