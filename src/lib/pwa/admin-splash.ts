/**
 * Écrans de lancement iOS (`apple-touch-startup-image`).
 *
 * Sans ces images, une PWA lancée depuis l'écran d'accueil affiche un flash
 * blanc pendant tout le démarrage — le signal le plus visible qu'il s'agit
 * d'un site web et non d'une app. Safari ne choisit une image que si la media
 * query correspond EXACTEMENT au device (points CSS + ratio + orientation).
 *
 * Les fichiers sont générés par `scripts/build-admin-pwa-assets.mjs` ;
 * la liste ci-dessous doit rester alignée sur `SPLASH_TARGETS` de ce script.
 */

type SplashTarget = { w: number; h: number; r: number };

const SPLASH_TARGETS: readonly SplashTarget[] = [
  { w: 440, h: 956, r: 3 }, // iPhone 16 Pro Max
  { w: 430, h: 932, r: 3 }, // iPhone 15/16 Plus, 14/15 Pro Max
  { w: 428, h: 926, r: 3 }, // iPhone 12/13 Pro Max
  { w: 414, h: 896, r: 3 }, // iPhone XS Max, 11 Pro Max
  { w: 414, h: 896, r: 2 }, // iPhone XR, 11
  { w: 414, h: 736, r: 3 }, // iPhone 8 Plus
  { w: 402, h: 874, r: 3 }, // iPhone 16 Pro
  { w: 393, h: 852, r: 3 }, // iPhone 14/15/16 Pro
  { w: 390, h: 844, r: 3 }, // iPhone 12/13/14
  { w: 375, h: 812, r: 3 }, // iPhone X/XS/11 Pro, 13 mini
  { w: 375, h: 667, r: 2 }, // iPhone SE 2/3, 8
  { w: 360, h: 780, r: 3 }, // iPhone 12/13 mini
] as const;

export type AppleStartupImage = { url: string; media: string };

/** Liste prête pour `metadata.appleWebApp.startupImage`. */
export const ADMIN_STARTUP_IMAGES: readonly AppleStartupImage[] = SPLASH_TARGETS.map(
  ({ w, h, r }) => ({
    url: `/pwa/admin/splash-${w}x${h}@${r}x.png`,
    media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
  }),
);
