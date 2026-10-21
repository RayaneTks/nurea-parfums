"use client";

import type { CSSProperties, FC } from "react";
import Image, { getImageProps } from "next/image";
import { preload } from "react-dom";
import { buttonClass } from "@/components/ui/Button";
import { SnapchatIcon } from "@/components/ui/Icons";
import { CONTACT } from "@/lib/data";

interface HeroProps {
  /** Parfums publiés au catalogue. */
  perfumeCount: number;
  /** Marques qui ont au moins un parfum publié. */
  brandCount: number;
}

/**
 * Le visuel de la hero, en deux lumières : la nuit (thème sombre, variante de référence) et le jour
 * (thème clair). Une nature morte de matières à parfum sous une lumière rasante, dans la chambre
 * neutre de la DA — l'univers olfactif de la parfumerie, sans flacon ni marque : la hero appartient
 * à Nuréa, pas aux parfums temporairement à l'affiche. Déclinaison 640 servie aux petites largeurs
 * (`src/lib/images/loader.ts`).
 */
const HERO_IMAGE = {
  dark: "/branding/hero/chambre-nuit.webp",
  light: "/branding/hero/chambre-jour.webp",
  alt: "Matières à parfum sous une lumière rasante : jasmin, ambre, bois de santal et bergamote sur un socle de pierre.",
  /* Téléphone : « 213px » et non la largeur réelle, voulu — 213 × 3 = 639 fait prendre la déclinaison 640
     (densité 1,64 sur 390 px), l'élément LCP de la page. Bureau : la colonne fait au plus 560 px. */
  sizes: "(min-width: 1024px) 560px, 213px",
} as const;

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

const enterAt = (ms: number) => ({ "--enter-delay": `${ms}ms` }) as CSSProperties;

/**
 * La hero de l'accueil (04-PLAN-EXECUTION.md § B.10, composition « Chambre ») : la première section
 * d'un site de marque — qui est Nuréa, ce qu'elle propose, et par où entrer.
 *
 * Composition : surtitre, accroche en `display`, une phrase de faits, deux entrées (le catalogue en
 * bouton plein, Snapchat en lien), et le visuel de la chambre. Téléphone : le texte, puis le visuel
 * bord à bord ; dès 1024 px, texte à gauche et visuel à droite, centrés. Le H1, unique, porte la
 * marque et la ville dans son surtitre (référencement : `01-INVARIANTS.md`) et l'accroche dans son
 * grand format. Tout ce qui est affirmé est un fait publié ailleurs sur le site (Contact, pied de
 * page, `PRODUCT.md`) : les compteurs sont comptés sur le catalogue publié.
 */
export const Hero: FC<HeroProps> = ({ perfumeCount, brandCount }) => {
  /* Comme le visuel d'une fiche : chaque lumière est annoncée pour son seul thème, l'autre ne prend
     pas de débit ; la variante affichée est en cache quand la mise en page la demande. */
  for (const [src, media] of [
    [HERO_IMAGE.dark, "(prefers-color-scheme: dark)"],
    [HERO_IMAGE.light, "(prefers-color-scheme: light)"],
  ] as const) {
    const { props } = getImageProps({ src, alt: "", fill: true, sizes: HERO_IMAGE.sizes, quality: 80 });
    preload(props.src, { as: "image", imageSrcSet: props.srcSet, imageSizes: props.sizes, media, fetchPriority: "high" });
  }

  const common = { fill: true, sizes: HERO_IMAGE.sizes, quality: 80 };

  return (
    <section aria-labelledby="accueil-titre" className="hero">
      <div className="hero-texte">
        <h1 id="accueil-titre">
          <span className="t-caption enter block">Nuréa Parfums — Marseille</span>
          <span className="t-display enter mt-3 block" style={enterAt(60)}>
            Les grands parfums, dans un flacon Nuréa.
          </span>
        </h1>
        <p className="t-body t-measure enter mt-5" style={enterAt(120)}>
          {perfumeCount > 0 ? `${plural(perfumeCount, "parfum")} de ${plural(brandCount, "marque")}, à choisir` : "Un catalogue à choisir"} au
          catalogue et à commander sur Snapchat. Remise en main propre à Marseille, ou envoi.
        </p>
        <div className="hero-entrees enter" style={enterAt(180)}>
          <a href="#collection" className={buttonClass("solid")}>
            Voir le catalogue
          </a>
          <a href={CONTACT.snapchat} target="_blank" rel="noopener noreferrer" className={buttonClass("link", "gap-2")}>
            <SnapchatIcon className="h-5 w-5" aria-hidden="true" />
            Commander sur Snapchat
          </a>
        </div>
      </div>

      <div className="hero-visuel enter-visuel relative overflow-hidden bg-surface-2" style={enterAt(60)}>
        {/* Bascule de lumière en CSS (`.light` sur <html>), jamais `useTheme` : sans JavaScript, la nuit. */}
        <Image src={HERO_IMAGE.dark} alt={HERO_IMAGE.alt} {...common} className="object-cover [.light_&]:hidden" />
        <Image src={HERO_IMAGE.light} alt={HERO_IMAGE.alt} {...common} className="hidden object-cover [.light_&]:block" />
      </div>
    </section>
  );
};
