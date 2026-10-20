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
  // Le logotype s'affiche sur ~130 px : `next/image` demande 256 (1x) puis 640 (2x et plus).
  "/branding/logos/nurea-wordmark-ivory.webp": [
    { width: 640, src: "/branding/logos/nurea-wordmark-ivory-640.webp" },
  ],
  "/branding/logos/nurea-wordmark-black.webp": [
    { width: 640, src: "/branding/logos/nurea-wordmark-black-640.webp" },
  ],
};

export default function nureaImageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  if (hasThumbnail(src)) return width <= THUMB_WIDTH ? thumbnailOf(src) : src;
  const variants = LOCAL_VARIANTS[src];
  if (variants) return variants.find((v) => width <= v.width)?.src ?? src;
  return src;
}
