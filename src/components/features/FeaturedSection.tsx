"use client";

import type { CSSProperties, FC } from "react";
import type { Perfume } from "@/lib/data";
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
 * Les vitrines de l'accueil (04-PLAN-EXECUTION.md § B.10, composition « Vitrine ») : chaque parfum
 * mis en avant est un **objet posé sur un champ de sa couleur**. Le champ — l'ambiance du parfum
 * (§ B.3.8 ; repli `--surface-1`), bord à bord — commence sous le haut du visuel, que l'on voit
 * donc déborder : deux rectangles qui se recouvrent, le visuel décalé vers la droite, pas une
 * affiche collée. Sur le champ, la marque en `body`, puis le nom du parfum en `display` : c'est
 * lui, le grand format typographique de la page. La seconde vitrine est en miroir.
 *
 * Visuel et nom ouvrent la fiche en feuille, même touchés avant que le catalogue soit prêt (la
 * demande attend). Le nom est un vrai lien vers la page indexable du parfum : sans JavaScript, ou
 * par un clic modifié (nouvel onglet), il y mène. Le premier visuel est l'élément LCP de la page,
 * préchargé pour le thème du système.
 */
export const FeaturedSection: FC<FeaturedSectionProps> = ({ perfumes }) => (
  <>
    {perfumes.slice(0, 2).map((perfume, index) => {
      const brandLine = brandLineLabel(perfume.brand, perfume.line);
      const href = perfumePath(perfume.brandSlug ?? slugify(perfume.brand), perfume.name, perfume.id);
      const titleId = `une-${perfume.id}`;
      return (
        <section
          key={perfume.id}
          aria-labelledby={titleId}
          style={ambientStyle(perfume)}
          className={cn("amb vitrine", index % 2 === 1 && "vitrine-miroir")}
        >
          <div className="vitrine-champ enter" aria-hidden="true" />
          <div className="vitrine-cadre">
            <button
              type="button"
              onClick={() => requestSheet(perfume.id)}
              aria-label={`Voir la fiche : ${perfume.name}, ${brandLine}`}
              className="vitrine-visuel enter-visuel relative block overflow-hidden bg-surface-2"
              style={{ "--enter-delay": "60ms" } as CSSProperties}
            >
              {/* Téléphone : « 213px » et non la largeur réelle, voulu. Un écran dense (×2,6 à ×3)
                  demanderait l'original 1 024 px (105 Ko) ; 213 × 3 = 639 lui fait prendre la vignette
                  640 (44 Ko), affichée sur 282 px — l'élément LCP de la page. */}
              <PerfumeImage perfume={perfume} sizes="(min-width: 1024px) 320px, (min-width: 768px) 213px, 213px" preloadByTheme={index === 0} />
            </button>
            <div className="vitrine-legende enter" style={{ "--enter-delay": "140ms" } as CSSProperties}>
              <p className="t-body">{brandLine}</p>
              <h2 id={titleId} className="t-display hyphens-auto [overflow-wrap:anywhere]">
                <a href={href} onClick={openSheetFromLink(perfume.id)} className="underline-offset-[8px] decoration-1 mouse-hover:underline">
                  {perfume.name}
                </a>
              </h2>
            </div>
          </div>
        </section>
      );
    })}
  </>
);
