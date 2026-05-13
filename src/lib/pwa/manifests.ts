import type { MetadataRoute } from "next";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_SHORT_NAME, SITE_URL } from "@/lib/site";

const publicTheme = "#0A0508";
const adminTheme = "#7B0B1D";

const icons: MetadataRoute.Manifest["icons"] = [
  { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
  { src: "/branding/monogram/np-circle-bordeaux.png", sizes: "512x512", type: "image/png", purpose: "any" },
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
    icons,
  };
}

export function getAdminWebManifest(): MetadataRoute.Manifest {
  return {
    id: new URL("/admin", SITE_URL).toString(),
    name: `${SITE_NAME} — Gestion`,
    short_name: "Nuréa Gestion",
    description: "Espace d’administration : commandes, catalogue, comptabilité et vente.",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: adminTheme,
    theme_color: adminTheme,
    categories: ["business", "productivity"],
    lang: "fr",
    dir: "ltr",
    icons,
  };
}
