import type { MetadataRoute } from "next";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_SHORT_NAME, SITE_URL } from "@/lib/site";

const publicTheme = "#0A0508";
/** Bordeaux de marque — écran de lancement et icônes. */
const adminBrand = "#7B0B1D";
/**
 * Chrome de l'app (gris iOS). Sert de `theme_color` : c'est cette couleur que
 * le système peint derrière la barre d'état en mode standalone, et l'heure y
 * est écrite en noir — illisible sur le bordeaux.
 */
const adminChrome = "#F2F2F7";

const shopIcons: MetadataRoute.Manifest["icons"] = [
  { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
  { src: "/branding/monogram/np-circle-bordeaux.png", sizes: "512x512", type: "image/png", purpose: "any" },
];

/**
 * Icônes admin — fichiers générés par `scripts/build-admin-pwa-assets.mjs`,
 * aux dimensions réellement déclarées (un PNG 1024² annoncé en 192² est
 * rééchantillonné par le système et rend flou sur l'écran d'accueil).
 */
const adminIcons: MetadataRoute.Manifest["icons"] = [
  { src: "/pwa/admin/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/pwa/admin/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  // Le masque adaptatif Android rogne les 20 % extérieurs : icône dédiée à
  // logo réduit, sinon le monogramme est coupé.
  { src: "/pwa/admin/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];

export function getShopWebManifest(): MetadataRoute.Manifest {
  return {
    id: new URL(SITE_URL).toString(),
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: DEFAULT_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: publicTheme,
    theme_color: publicTheme,
    categories: ["shopping", "lifestyle"],
    lang: "fr",
    dir: "ltr",
    icons: shopIcons,
  };
}

/**
 * `nameSuffix` : « (essai) » en préproduction (07 §1.3, garde-fou 6), fourni par la route du
 * manifeste — l'icône installée depuis la préproduction dit « Nuréa Gestion (essai) ».
 */
export function getAdminWebManifest(options: { nameSuffix?: string } = {}): MetadataRoute.Manifest {
  const suffix = options.nameSuffix ?? "";
  return {
    id: new URL("/admin", SITE_URL).toString(),
    name: `${SITE_NAME} — Gestion${suffix}`,
    short_name: `Nuréa Gestion${suffix}`,
    description: "Espace d’administration : commandes, catalogue, comptabilité et vente.",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: adminBrand,
    theme_color: adminChrome,
    categories: ["business", "productivity"],
    lang: "fr",
    dir: "ltr",
    icons: adminIcons,
    /**
     * Raccourcis d'appui long sur l'icône (Android / desktop ; ignorés par iOS), 04 §14.1 et 06 §1.6 :
     * les trois gestes quotidiens, aux routes françaises livrées. Plus de `/admin/ordres` (redirigée,
     * donc un aller-retour de plus à chaque lancement) ni de « À traiter », qui n'est pas du
     * vocabulaire canonique (06 §1.7).
     *
     * `/admin/commandes/nouvelle` est l'adresse de la prise de commande (04 §2.3) ; elle est présentée
     * par `/admin/vendre?mode=commande`, le raccourci garde l'adresse, pas la présentation.
     */
    shortcuts: [
      { name: "Vendre", short_name: "Vendre", url: "/admin/vendre" },
      { name: "Nouvelle commande", short_name: "Commande", url: "/admin/commandes/nouvelle" },
      { name: "Encaisser", short_name: "Encaisser", url: "/admin/encaisser" },
    ],
  };
}
