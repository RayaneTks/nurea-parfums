"use client";

import type { CSSProperties, FC, MouseEvent } from "react";
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

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

interface FeaturedSectionProps {
  /** Les parfums mis en avant, deux au plus, dans l'ordre du catalogue. */
  perfumes: Perfume[];
  /** Parfums publiés au catalogue. */
  perfumeCount: number;
  /** Marques qui ont au moins un parfum publié. */
  brandCount: number;
}

/**
 * La une de l'accueil (04-PLAN-EXECUTION.md § B.10, composition « La une ») : chaque parfum mis en
 * avant est une **scène** — son visuel 2:3 bord à bord, sans cadre ni carte, puis sa **légende** sur
 * un bandeau à la couleur de son flacon (l'ambiance, § B.3.8 ; repli `--surface-1`) : marque, nom.
 * Entre les deux scènes, la **phrase de la maison** : ce qu'est Nuréa, en chiffres comptés sur le
 * catalogue publié, rien d'autre.
 *
 * Téléphone : scène, phrase, scène, à la suite. Dès 768 px, les deux scènes côte à côte et la
 * phrase dessous ; dès 1024 px, la phrase à gauche et les deux scènes à sa droite (grille
 * `.une`, `app/globals.css`). Le premier visuel est l'élément LCP : préchargé pour le thème du
 * système, vignette 640 jusqu'à la tablette.
 *
 * Visuel et nom ouvrent la fiche en feuille, même touchés avant que le catalogue soit prêt (la
 * demande attend). Le nom est un vrai lien vers la page indexable du parfum : sans JavaScript, ou
 * par un clic modifié (nouvel onglet), il y mène.
 */
export const FeaturedSection: FC<FeaturedSectionProps> = ({ perfumes, perfumeCount, brandCount }) => (
  <div className="une">
    {perfumes.slice(0, 2).map((perfume, index) => {
      const brandLine = brandLineLabel(perfume.brand, perfume.line);
      const href = perfumePath(perfume.brandSlug ?? slugify(perfume.brand), perfume.name, perfume.id);
      const titleId = `une-${perfume.id}`;

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
          className={cn("amb scene", index === 0 ? "scene-1" : "scene-2")}
        >
          <button
            type="button"
            onClick={() => requestSheet(perfume.id)}
            aria-label={`Voir la fiche : ${perfume.name}, ${brandLine}`}
            className={cn("scene-visual relative block w-full overflow-hidden bg-surface-2", index === 0 && "settle")}
          >
            {/* Téléphone : « 213px » et non « 100vw », voulu. Un écran dense (×2,6 à ×3) demanderait
                l'original 1 024 px (105 Ko) ; 213 × 3 = 639 lui fait prendre la vignette 640 (44 Ko),
                affichée sur 390 px — densité 1,64, l'élément LCP de la page. Tablette et bureau :
                320 × 2 = 640, la même vignette. */}
            <PerfumeImage perfume={perfume} sizes="(min-width: 768px) 320px, 213px" preloadByTheme={index === 0} />
          </button>

          <div className="scene-label enter bg-ambient" style={{ "--enter-delay": "80ms" } as CSSProperties}>
            <p className="t-body">{brandLine}</p>
            <h2 id={titleId} className="t-subtitle hyphens-auto [overflow-wrap:anywhere]">
              <a href={href} onClick={openFromLink} className="underline-offset-[6px] decoration-1 mouse-hover:underline">
                {perfume.name}
              </a>
            </h2>
          </div>
        </section>
      );
    })}

    {/* Catalogue vide (base injoignable) : aucun « 0 parfum » affirmé. */}
    {perfumeCount > 0 && (
      <div className="une-phrase enter" style={{ "--enter-delay": "160ms" } as CSSProperties}>
        <p className="t-title t-measure">
          Nuréa Parfums réunit à Marseille {plural(perfumeCount, "parfum")} de {plural(brandCount, "marque")}. On
          choisit au catalogue, on commande sur Snapchat — remis en main propre ou envoyé.
        </p>
      </div>
    )}
  </div>
);
