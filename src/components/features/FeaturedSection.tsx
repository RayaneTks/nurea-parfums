"use client";

import type { FC, MouseEvent } from "react";
import type { Perfume } from "@/lib/data";
import { ambientStyle } from "@/lib/catalog/ambient";
import { brandLineLabel } from "@/lib/catalog/perfumePresentation";
import { perfumePath, slugify } from "@/lib/seo/paths";
import { cn } from "@/lib/utils";
import { PerfumeImage } from "./PerfumeImage";

/**
 * Demande d'ouverture d'une fiche (`detail` = id du parfum). Le catalogue de l'accueil
 * (`CatalogSection`) l'écoute et l'annule pour dire qu'il s'en charge : la fiche s'ouvre en feuille
 * (`?parfum=<id>`), comme depuis une carte, sans recharger la page.
 */
export const OPEN_PERFUME_EVENT = "nurea:open-perfume";

/** Demande faite avant que le catalogue soit prêt (page en cours d'hydratation) : il la reprend. */
let pending: number | null = null;

/** Le catalogue, à son montage : la fiche demandée trop tôt, une seule fois. */
export function takePendingPerfume(): number | null {
  const id = pending;
  pending = null;
  return id;
}

/** Le catalogue annule l'événement s'il ouvre la fiche ; sinon la demande attend son montage. */
function requestSheet(id: number) {
  const handled = !window.dispatchEvent(new CustomEvent(OPEN_PERFUME_EVENT, { detail: id, cancelable: true }));
  if (!handled) pending = id;
}

interface FeaturedSectionProps {
  perfumes: Perfume[];
}

/**
 * Les bandeaux « une » de l'accueil (04-PLAN-EXECUTION.md § B.10, composition A) : un par parfum
 * mis en avant, bord à bord, au fond de son ambiance (§ B.3.8 amendé ; repli `--surface-1`).
 *
 * Dedans, dans la gouttière : marque, nom (lien vers la fiche), visuel 2:3 (bouton vers la fiche).
 * Dès 768 px, texte et visuel côte à côte ; le second bandeau en miroir. Le premier visuel est
 * l'élément LCP de la page : préchargé, prioritaire.
 *
 * Nom et visuel ouvrent la feuille de fiche, même touchés avant que le catalogue soit prêt (la
 * demande attend). Le nom est un vrai lien vers la page indexable du parfum : sans JavaScript, ou
 * par un clic modifié (nouvel onglet), il y mène.
 */
export const FeaturedSection: FC<FeaturedSectionProps> = ({ perfumes }) => (
  <div className="mt-6 flex flex-col gap-3">
    {perfumes.map((perfume, index) => {
      const brandLine = brandLineLabel(perfume.brand, perfume.line);
      const href = perfumePath(perfume.brandSlug ?? slugify(perfume.brand), perfume.name, perfume.id);
      const titleId = `une-${perfume.id}`;
      const mirror = index % 2 === 1;

      const openFromLink = (event: MouseEvent<HTMLAnchorElement>) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        requestSheet(perfume.id);
      };

      return (
        <section
          key={perfume.id}
          aria-labelledby={titleId}
          style={ambientStyle(perfume)}
          className="amb bg-ambient py-6 md:py-8 lg:py-12"
        >
          <div
            className={cn(
              "page-x grid gap-4 md:items-center md:gap-x-8 lg:gap-x-12",
              mirror ? "md:grid-cols-[45%_1fr] lg:grid-cols-[40%_1fr]" : "md:grid-cols-[1fr_45%] lg:grid-cols-[1fr_40%]"
            )}
          >
            <div className={cn("flex min-w-0 flex-col gap-0.5 md:row-start-1", mirror ? "md:col-start-2" : "md:col-start-1")}>
              <p className="t-body">{brandLine}</p>
              <h2 id={titleId} className="t-title hyphens-auto [overflow-wrap:anywhere]">
                <a
                  href={href}
                  onClick={openFromLink}
                  className="underline-offset-[6px] decoration-1 mouse-hover:underline"
                >
                  {perfume.name}
                </a>
              </h2>
            </div>

            <button
              type="button"
              onClick={() => requestSheet(perfume.id)}
              aria-label={`Voir la fiche : ${perfume.name}, ${brandLine}`}
              className={cn(
                "press relative block aspect-[2/3] w-full overflow-hidden rounded-md bg-surface-2 md:row-start-1",
                mirror ? "md:col-start-1" : "md:col-start-2"
              )}
            >
              {/* Téléphone : « 213px » et non « 100vw », voulu. Un écran dense (×2,6 à ×3) demandait
                  l'original 1 024 px (105 Ko) pour un visuel de 358 px ; 213 × 3 = 639 lui fait prendre
                  la vignette 640 (44 Ko), soit une densité de 1,8 — l'élément LCP de la page. */}
              <PerfumeImage
                perfume={perfume}
                sizes="(min-width: 1024px) 40vw, (min-width: 768px) 45vw, 213px"
                preloadByTheme={index === 0}
              />
            </button>
          </div>
        </section>
      );
    })}
  </div>
);
