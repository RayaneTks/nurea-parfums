"use client";

import type { FC } from "react";
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
 * « À l'affiche » (04-PLAN-EXECUTION.md § B.10) : les deux vedettes de l'accueil, visibles ensemble dès
 * le téléphone, en diptyque asymétrique — le premier parfum sur 7 colonnes de 12, le second sur 5,
 * décalé vers le bas, comme une double page. Chaque visuel 2:3 (`--r-md`) est posé dans un passe-partout
 * à la couleur de son flacon (ambiance, § B.3.8 ; `--r-lg`, marge 8 px, repli `--surface-1`) ; dessous,
 * la marque puis le nom (`title` pour le premier, `subtitle` pour le second). Aucune interaction à faire
 * pour voir le second. Un seul parfum mis en avant : il occupe 10 colonnes.
 *
 * Visuel et nom ouvrent la fiche en feuille, même touchés avant que le catalogue soit prêt ; le nom est
 * un vrai lien vers la page indexable du parfum.
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
          const first = index === 0;
          return (
            <article
              key={perfume.id}
              aria-labelledby={titleId}
              className={cn(shown.length === 1 ? "affiche-seul" : first ? "affiche-a" : "affiche-b")}
            >
              <button
                type="button"
                onClick={() => requestSheet(perfume.id)}
                aria-label={`Voir la fiche : ${perfume.name}, ${brandLine}`}
                style={ambientStyle(perfume)}
                className="amb press block w-full rounded-lg bg-ambient p-2"
              >
                <span className="relative block aspect-[2/3] overflow-hidden rounded-md bg-surface-2">
                  <PerfumeImage perfume={perfume} sizes={first ? "(min-width: 768px) 360px, 213px" : "(min-width: 768px) 260px, 160px"} />
                </span>
              </button>
              <div className="mt-3 flex min-w-0 flex-col gap-0.5 px-1">
                <p className="t-body">{brandLine}</p>
                <h3 id={titleId} className={cn(first ? "t-title" : "t-subtitle", "hyphens-auto [overflow-wrap:anywhere]")}>
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
