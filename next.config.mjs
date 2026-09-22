import path from "node:path";
import { fileURLToPath } from "node:url";
import bundleAnalyzer from "@next/bundle-analyzer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function supabaseImageRemotes() {
  const hostnames = ["lkdhqqzocmxtyarseizc.supabase.co"];
  return hostnames.map((hostname) => ({
    protocol: "https",
    hostname,
    pathname: "/**",
  }));
}

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client"],
  experimental: {
    viewTransition: true,
  },
  images: {
    remotePatterns: supabaseImageRemotes(),
    /**
     * Les visuels sont servis TELS QUELS, sans passer par l'optimiseur de Vercel.
     *
     * Pourquoi : ils sont déposés au cadre exact de l'affichage (1024×1536) et pèsent ~90 Ko
     * depuis leur ré-encodage. Les faire optimiser ne gagnait presque rien et coûtait une
     * transformation par largeur × format × qualité. Avec dix largeurs de `srcset`, deux formats
     * et sept qualités ouvertes, une seule visite à froid du catalogue (207 visuels) pouvait
     * demander plus de 2 000 transformations — pour un quota gratuit de 5 000 par MOIS. Et comme
     * chaque déploiement vide le cache d'images, le mur était atteint au premier déploiement
     * venu : le 22/09/2026, toutes les fiches sont tombées en 402
     * (`OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED`).
     *
     * Servir directement supprime la dépendance au quota, et 90 Ko au bon cadre valent mieux
     * qu'un aller-retour par un optimiseur qui peut refuser de répondre.
     */
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  /**
   * Obligatoire si un autre package-lock.json existe plus haut dans l'arborescence
   * (ex. `C:\Users\User\package-lock.json`) : sinon Next infère une mauvaise racine
   * et le dev / le build peuvent se comporter bizarrement.
   */
  turbopack: {
    root: __dirname,
  },
  /**
   * Le logotype et la police de la vignette de partage doivent voyager avec la
   * fonction.
   *
   * `app/(shop)/opengraph-image.tsx` lit ces deux fichiers sur le disque pour
   * composer l'image. Aujourd'hui la route est prérendue au build — elle sort
   * en « ○ Static » — donc les fichiers sont lus par la machine de build, qui
   * les a forcément sous la main.
   *
   * Cette inscription est là pour le jour où la route redeviendra dynamique :
   * il suffirait d'y lire une donnée de la base, ou d'en faire une image par
   * parfum. Le chemin étant assemblé morceau par morceau, le traçage
   * automatique peut le manquer, et la vignette casserait alors sur TOUS les
   * partages sans que rien n'échoue en local. Le coût de l'assurance est de
   * 86 Ko sur une seule fonction.
   */
  outputFileTracingIncludes: {
    "/opengraph-image": ["./app/(shop)/_og/**"],
    "/twitter-image": ["./app/(shop)/_og/**"],
  },
};

export default withBundleAnalyzer(nextConfig);
