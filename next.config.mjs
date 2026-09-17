import path from "node:path";
import { fileURLToPath } from "node:url";
import bundleAnalyzer from "@next/bundle-analyzer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * L'hôte de production reste inscrit même quand l'environnement pointe ailleurs :
 * la base de répétition est une copie de la production et référence ses visuels.
 */
function supabaseImageRemotes() {
  const remotes = new Map([["https://lkdhqqzocmxtyarseizc.supabase.co", { protocol: "https", hostname: "lkdhqqzocmxtyarseizc.supabase.co" }]]);
  const fromEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (fromEnv) {
    try {
      // Protocole de l'URL configurée : https en préproduction et en production, http pour le faux
      // stockage local des tests de bout en bout (sans quoi `next/image` refuse ses visuels en dev).
      const url = new URL(fromEnv);
      const protocol = url.protocol.replace(":", "");
      remotes.set(`${protocol}://${url.hostname}`, { protocol, hostname: url.hostname });
    } catch {
      // URL mal formée : on garde l'hôte de production, le build ne doit pas casser pour ça.
    }
  }
  return [...remotes.values()].map((remote) => ({ ...remote, pathname: "/**" }));
}

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/**
 * Hygiène de la gestion, écrite une fois (docs/refonte/04-ARCHITECTURE.md §8.6). Pas de CSP en v1 :
 * décision explicite, révisable.
 */
const ADMIN_SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
];

/** `/admin/:path*` couvre aussi `/admin` (segment facultatif). */
const ADMIN_HEADER_SOURCES = ["/admin/:path*", "/api/admin/:path*", "/admin-sw.js"];

const query = (key, value) => [{ type: "query", key, value }];

/**
 * Anciennes adresses de la gestion, redirigées en permanence vers l'inventaire de
 * docs/refonte/06-ECRANS-PARCOURS.md §1.2 (test `tests/architecture/redirects.test.ts`).
 *
 * La première règle qui correspond gagne ; une redirection peut en chaîner une autre
 * (`/admin/ordres/abc` → `/admin/commandes/abc` → `/admin/commandes?doc=abc`).
 * Next recopie la query d'origine dans la destination (les clés de la destination l'emportent) :
 * `/admin/ordres?filter=ready` aboutit à `?filter=ready&filtre=confirmees`, le paramètre mort est ignoré
 * par la page. Pour la même raison, `/admin/compta?sale=<id>` n'a pas de règle : elle bouclerait, et
 * la page ignore déjà `sale` (04 §2.3).
 */
const ADMIN_REDIRECTS = [
  // 06 §1.6 — paramètres des anciennes listes, avant la règle générique de `ordres`.
  { source: "/admin/ordres", has: query("filter", "ready"), destination: "/admin/commandes?filtre=confirmees" },
  { source: "/admin/ordres", has: query("filter", "pending"), destination: "/admin/commandes?filtre=en-attente" },
  { source: "/admin/ordres", has: query("filter", "delivered"), destination: "/admin/commandes?vue=livrees" },
  { source: "/admin/vendre", has: query("fromOrder", "(?<fromOrder>[^/]+)"), destination: "/admin/commandes?doc=:fromOrder" },
  { source: "/admin/catalogue", has: query("tab", "brands"), destination: "/admin/catalogue?tab=marques" },
  { source: "/admin/catalogue", has: query("tab", "featured"), destination: "/admin/catalogue?tab=en-avant" },
  { source: "/admin/catalogue", has: query("stock", "low"), destination: "/admin/catalogue?stock=bas" },

  // 04 §2.3 — anciennes routes anglaises, dans l'ordre du tableau.
  { source: "/admin/ordres/new", destination: "/admin/commandes/nouvelle" },
  { source: "/admin/ordres/:id/edit", destination: "/admin/commandes/:id/modifier" },
  { source: "/admin/ordres/:path*", destination: "/admin/commandes/:path*" },
  { source: "/admin/perfumes/new", destination: "/admin/catalogue/parfums/nouveau" },
  { source: "/admin/perfumes/:id/edit", destination: "/admin/catalogue/parfums/:id/modifier" },
  { source: "/admin/brands/new", destination: "/admin/catalogue/marques/nouvelle" },
  { source: "/admin/brands/:id/edit", destination: "/admin/catalogue/marques/:id/modifier" },
  { source: "/admin/clients/new", destination: "/admin/clients/nouveau" },
  { source: "/admin/clients/:id/edit", destination: "/admin/clients/:id/modifier" },
  { source: "/admin/lots/new", destination: "/admin/lots/nouveau" },
  { source: "/admin/stats/top-parfums", destination: "/admin/statistiques" },
  { source: "/admin/offline", destination: "/admin" },

  // Amendement A-3 — la fiche document est une sheet adressable ; ces adresses n'ont pas de page.
  { source: "/admin/commandes/nouvelle", destination: "/admin/vendre?mode=commande" },
  { source: "/admin/commandes/:id/modifier", destination: "/admin/commandes?doc=:id&edition=1" },
  { source: "/admin/commandes/:id", destination: "/admin/commandes?doc=:id" },
  { source: "/admin/compta/ventes/:id/modifier", destination: "/admin/compta?doc=:id&edition=1" },
  { source: "/admin/compta/ventes/:id", destination: "/admin/compta?doc=:id" },
].map((rule) => ({ ...rule, permanent: true }));

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
    /** Inclut des qualités « vignettes » (admin catalogue, listes). */
    qualities: [60, 65, 70, 75, 80, 85, 90],
    /** AVIF + WebP — gain ~20% vs WebP seul pour photos parfums. */
    formats: ["image/avif", "image/webp"],
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
  async headers() {
    return ADMIN_HEADER_SOURCES.map((source) => ({ source, headers: ADMIN_SECURITY_HEADERS }));
  },
  async redirects() {
    return ADMIN_REDIRECTS;
  },
};

export default withBundleAnalyzer(nextConfig);
