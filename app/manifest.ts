import type { MetadataRoute } from "next";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_SHORT_NAME, SITE_URL } from "@/lib/site";

const theme = "#0A0508";

/**
 * PWA (Ajouter à l’écran d’accueil / manifest) — iOS Safari + Android Chrome.
 * iOS n’installe pas de service worker complet comme Android ; le manifeste améliore quand même l’ajout.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: new URL(SITE_URL).toString(),
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: DEFAULT_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: theme,
    theme_color: theme,
    categories: ["shopping", "lifestyle"],
    lang: "fr",
    dir: "ltr",
    icons: [
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
      { src: "/branding/monogram/np-circle-bordeaux.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
