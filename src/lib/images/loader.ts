import { hasThumbnail, thumbnailOf, THUMB_WIDTH } from "./thumbnails";

/**
 * Chargeur `next/image` du site (`next.config.mjs`, `images.loaderFile`).
 *
 * Il ne transforme rien : il CHOISIT, parmi des fichiers déjà prêts, le plus petit qui suffit à la
 * largeur demandée par le navigateur. Aucun service d'optimisation, donc aucun quota à épuiser
 * (voir `thumbnails.ts` pour l'histoire).
 *
 * - Visuel de parfum : sa vignette (640 px) jusqu'à 640 px de large, l'original au-delà.
 * - Visuels fixes du site : les déclinaisons listées dans `LOCAL_VARIANTS`, fabriquées une fois.
 * - Tout le reste : tel quel.
 */

type Variant = { width: number; src: string };

/** Largeurs disponibles des visuels fixes, de la plus petite à la plus grande (l'original clôt la liste). */
const LOCAL_VARIANTS: Readonly<Record<string, readonly Variant[]>> = {
  "/branding/visuel-hero.webp": [
    { width: 750, src: "/branding/visuel-hero-750.webp" },
    { width: 1280, src: "/branding/visuel-hero-1280.webp" },
    { width: 1920, src: "/branding/visuel-hero-1920.webp" },
  ],
  // Le logo s'affiche sur ~150 px : `next/image` demande 256 (1x) puis 640 (2x et plus).
  "/branding/logos/nurea-logo-horizontal-dark.webp": [
    { width: 640, src: "/branding/logos/nurea-logo-horizontal-dark-640.webp" },
    { width: 1024, src: "/branding/logos/nurea-logo-horizontal-dark-1024.webp" },
  ],
  "/branding/logos/nurea-logo-horizontal-black.webp": [
    { width: 640, src: "/branding/logos/nurea-logo-horizontal-black-640.webp" },
    { width: 1024, src: "/branding/logos/nurea-logo-horizontal-black-1024.webp" },
  ],
  // Monogramme du menu mobile, affiché sur 28 px : 128 px suffisent à toutes les densités.
  "/branding/monogram/np-free-cuivre.webp": [{ width: 640, src: "/branding/monogram/np-free-cuivre-128.webp" }],
};

export default function nureaImageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  if (hasThumbnail(src)) return width <= THUMB_WIDTH ? thumbnailOf(src) : src;
  const variants = LOCAL_VARIANTS[src];
  if (variants) return variants.find((v) => width <= v.width)?.src ?? src;
  return src;
}
