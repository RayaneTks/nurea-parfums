import type { ImageLoaderProps } from "next/image";

/**
 * Vignettes liste admin (≈40–56 CSS px) : sans plafond, l’optimiseur peut
 * monter à des `w` type 1080/1920 d’après le srcset, et télécharger des Mo
 * d’image source (Lighthouse « Improve image delivery »).
 */
const MAX_WIDTH = 256;

export function nureaAdminThumbLoader({ src, width, quality }: ImageLoaderProps): string {
  const w = Math.min(Math.max(1, width), MAX_WIDTH);
  const q = quality ?? 60;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`;
}
