import SPLASH_TARGETS from "./splash-targets.json";

/**
 * Écrans de lancement iOS (`apple-touch-startup-image`).
 *
 * Sans ces images, une PWA lancée depuis l'écran d'accueil affiche un flash blanc pendant tout le
 * démarrage — le signal le plus visible qu'il s'agit d'un site web et non d'une app. Safari ne
 * choisit une image que si la media query correspond EXACTEMENT au device (points CSS + ratio +
 * orientation).
 *
 * La liste des cibles vit dans `splash-targets.json`, lu ICI et par
 * `scripts/build-admin-pwa-assets.mjs` (04 §14.1) : une seule source, fin du « doit rester aligné »
 * qui avait laissé les deux listes diverger (01 §4.7).
 */

export type SplashTarget = { device: string; w: number; h: number; r: number };

export const ADMIN_SPLASH_TARGETS: readonly SplashTarget[] = SPLASH_TARGETS;

export type AppleStartupImage = { url: string; media: string };

/** Nom du fichier généré pour une cible — la même règle des deux côtés. */
export function splashFileName({ w, h, r }: Pick<SplashTarget, "w" | "h" | "r">): string {
  return `splash-${w}x${h}@${r}x.png`;
}

/** Liste prête pour `metadata.appleWebApp.startupImage`. */
export const ADMIN_STARTUP_IMAGES: readonly AppleStartupImage[] = ADMIN_SPLASH_TARGETS.map((target) => ({
  url: `/pwa/admin/${splashFileName(target)}`,
  media: `(device-width: ${target.w}px) and (device-height: ${target.h}px) and (-webkit-device-pixel-ratio: ${target.r}) and (orientation: portrait)`,
}));
