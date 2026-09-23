import path from "node:path";
import { fileURLToPath } from "node:url";
import bundleAnalyzer from "@next/bundle-analyzer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * L'hôte de production reste inscrit même quand l'environnement pointe ailleurs :
 * la base de répétition est une copie de la production et référence ses visuels.
 */
function supabaseOrigins() {
  const origins = new Map([["https://lkdhqqzocmxtyarseizc.supabase.co", { protocol: "https", hostname: "lkdhqqzocmxtyarseizc.supabase.co" }]]);
  const fromEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (fromEnv) {
    try {
      // Protocole de l'URL configurée : https en préproduction et en production, http pour le faux
      // stockage local des tests de bout en bout (sans quoi `next/image` refuse ses visuels en dev).
      const url = new URL(fromEnv);
      const protocol = url.protocol.replace(":", "");
      origins.set(`${protocol}://${url.host}`, { protocol, hostname: url.hostname, port: url.port });
    } catch {
      // URL mal formée : on garde l'hôte de production, le build ne doit pas casser pour ça.
    }
  }
  return origins;
}

function supabaseImageRemotes() {
  return [...supabaseOrigins().values()].map(({ protocol, hostname, port }) => ({
    protocol,
    hostname,
    ...(port ? { port } : {}),
    pathname: "/**",
  }));
}

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Politique de sécurité du contenu (04 §8.6, révisée le 23/09/2026).
 *
 * La v1 s'en passait — « nonces sur les scripts inline de Next : coût sans bénéfice pour un
 * opérateur unique ». L'audit de surface d'attaque du 23/09/2026 a relevé l'absence de TOUT en-tête
 * applicatif, clickjacking compris : la décision est révisée, mais SANS nonce.
 *
 * Pourquoi sans nonce : un nonce doit être posé par requête (proxy), et Next ne peut plus
 * prérendre une page qui le lit. La vitrine est statique et porte 207 visuels ; la rendre
 * dynamique pour un en-tête coûterait plus cher que la faille qu'il couvre. `'unsafe-inline'`
 * reste donc sur les scripts — c'est le prix du rendu statique, et c'est écrit ici plutôt que
 * promis ailleurs.
 *
 * Ce que la politique couvre malgré `'unsafe-inline'` : aucun script d'un autre domaine ne peut
 * être CHARGÉ (`script-src 'self'`), aucune donnée ne peut être exfiltrée vers un autre domaine
 * (`connect-src`), aucun formulaire ne peut poster ailleurs (`form-action`), aucune balise `<base>`
 * ne peut détourner les URL relatives (`base-uri`), aucun plugin (`object-src 'none'`), et le site
 * ne peut pas être encadré (`frame-ancestors 'none'` — le vrai correctif du clickjacking, dont
 * `X-Frame-Options` n'est que le doublon pour les navigateurs anciens).
 */
function contentSecurityPolicy({ admin }) {
  const supabase = [...supabaseOrigins().keys()].join(" ");
  const directives = [
    ["default-src", "'self'"],
    ["base-uri", "'self'"],
    ["object-src", "'none'"],
    ["frame-ancestors", "'none'"],
    ["frame-src", "'none'"],
    ["form-action", "'self'"],
    // `'unsafe-eval'` : le rechargement à chaud de `next dev --webpack` seulement.
    ["script-src", `'self' 'unsafe-inline'${IS_DEV ? " 'unsafe-eval'" : ""}`],
    // Tailwind est compilé, mais Next et `next/font` injectent des styles en ligne.
    ["style-src", "'self' 'unsafe-inline'"],
    // `blob:` : l'aperçu local d'une photo avant son envoi (gestion).
    ["img-src", `'self' data: blob: ${supabase}`],
    ["font-src", "'self' data:"],
    ["media-src", "'self'"],
    ["manifest-src", "'self'"],
    // `blob:` : le service worker de la gestion.
    ["worker-src", "'self' blob:"],
    // L'envoi d'un visuel va droit sur l'URL signée Supabase ; `ws:` est le canal du dev.
    ["connect-src", `'self' ${supabase}${IS_DEV ? " ws: http://localhost:*" : ""}`],
  ];
  if (!admin) directives.push(["upgrade-insecure-requests", ""]);
  return directives.map(([name, value]) => (value ? `${name} ${value}` : name)).join("; ");
}

/**
 * En-têtes communs aux deux registres (04 §8.6).
 *
 * `includeSubDomains; preload` : sans eux, un sous-domaine futur mal configuré resterait joignable
 * en clair. À ne compléter par une soumission sur hstspreload.org qu'une fois sûr que TOUS les
 * sous-domaines, présents et à venir, servent en HTTPS — le retrait de la liste prend des mois.
 */
const COMMON_SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "autoplay=()",
      "camera=()",
      "display-capture=()",
      "encrypted-media=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=()",
      "usb=()",
      "xr-spatial-tracking=()",
    ].join(", "),
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

/** Vitrine : le référent complet reste utile aux sites qui nous citent, jamais le chemin hors site. */
const PUBLIC_SECURITY_HEADERS = [
  ...COMMON_SECURITY_HEADERS,
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy({ admin: false }) },
];

/**
 * Gestion : rien ne sort, et rien n'entre dans un index.
 *
 * `X-Robots-Tag` remplace le `Disallow: /admin` de robots.txt, qui ANNONÇAIT l'adresse du
 * back-office à qui lisait le fichier (constat moyen de l'audit du 23/09/2026). Un en-tête
 * `noindex` tient la même promesse sans la publier : le rempart reste l'authentification.
 */
const ADMIN_SECURITY_HEADERS = [
  ...COMMON_SECURITY_HEADERS,
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy({ admin: true }) },
];

/** `/admin/:path*` couvre aussi `/admin` (segment facultatif). */
const ADMIN_HEADER_SOURCES = ["/admin/:path*", "/api/admin/:path*", "/admin-sw.js"];

/**
 * Tout SAUF la gestion : deux règles qui se recouvrent poseraient l'en-tête deux fois
 * (`referrer-policy: strict-origin-when-cross-origin, same-origin`), et la valeur double ne vaut
 * rien. La lookahead exclut donc exactement ce que `ADMIN_HEADER_SOURCES` couvre.
 */
const PUBLIC_HEADER_SOURCE = "/((?!admin$|admin/|api/admin$|api/admin/|admin-sw\\.js$).*)";

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

/**
 * Le domaine canonique, et la redirection de tout le reste vers lui.
 *
 * Un déploiement Vercel est TOUJOURS joignable par son adresse `*.vercel.app`, en plus du domaine.
 * Relevé le 22/09/2026 : `nurea-parfums.vercel.app` servait la vitrine entière en 200, avec
 * `robots: index, follow`. La balise canonique y était juste — elle pointait le bon domaine — mais
 * une canonique est une SUGGESTION : Google reste libre d'indexer l'autre hôte, et deux hôtes qui
 * servent le même catalogue divisent l'autorité de la marque. Sur un nom déjà disputé
 * (« Nurae Parfum » sort sur nos requêtes), c'est exactement ce qu'on ne peut pas s'offrir.
 *
 * Une redirection permanente, elle, ne se discute pas.
 *
 * **Seulement en production** : les aperçus vivent sur `*.vercel.app`, et les rediriger les rendrait
 * inutilisables. `VERCEL_ENV` vaut `production`, `preview` ou `development` à la construction.
 */
const DOMAINE_CANONIQUE = "nureaparfums.fr";

const REDIRECTIONS_CANONIQUES =
  process.env.VERCEL_ENV === "production"
    ? [
        {
          source: "/:chemin*",
          has: [{ type: "host", value: "(?<hoteVercel>.*\.vercel\.app)" }],
          destination: `https://${DOMAINE_CANONIQUE}/:chemin*`,
          permanent: true,
        },
      ]
    : [];

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
     * Les visuels sont servis TELS QUELS, sans passer par l'optimiseur de Vercel (repris de `main`,
     * correctif du 22/09/2026).
     *
     * Ce qui s'est passé : chaque visuel était déclaré sur dix largeurs de `srcset`, avec deux
     * formats et sept qualités ouvertes. La page d'accueil porte 207 visuels — une seule visite à
     * froid pouvait demander plus de 2 000 transformations, pour un quota gratuit de 5 000 par MOIS.
     * Et chaque déploiement vide le cache d'images : le mur tombait au premier déploiement venu.
     * Toutes les fiches ont rendu 402 (`OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED`).
     *
     * Pourquoi c'est sans perte : `src/server/catalogue/webp.ts` dépose déjà les visuels au cadre
     * exact de l'affichage (`PERFUME_FRAME` 1024×1536) et à la qualité 82, soit ~90 Ko. L'optimiseur
     * ne gagnait presque rien et ajoutait une dépendance qui peut refuser de répondre.
     *
     * Si l'optimisation redevient souhaitable un jour, elle ne se rouvre qu'avec `deviceSizes` et
     * `qualities` restreints — sinon le mur revient.
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
  async headers() {
    return [
      { source: PUBLIC_HEADER_SOURCE, headers: PUBLIC_SECURITY_HEADERS },
      ...ADMIN_HEADER_SOURCES.map((source) => ({ source, headers: ADMIN_SECURITY_HEADERS })),
    ];
  },
  async redirects() {
    // Le domaine d'abord : inutile de rejouer une ancienne adresse sur un hôte qu'on quitte.
    return [...REDIRECTIONS_CANONIQUES, ...ADMIN_REDIRECTS];
  },
};

/** Exposés pour `tests/architecture/securite-headers.test.ts` : la règle est lue, pas recopiée. */
export { ADMIN_HEADER_SOURCES, ADMIN_SECURITY_HEADERS, PUBLIC_HEADER_SOURCE, PUBLIC_SECURITY_HEADERS };

export default withBundleAnalyzer(nextConfig);
