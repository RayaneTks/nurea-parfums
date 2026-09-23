import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Ce fichier est public : tout ce qu'on y écrit, on le publie.
 *
 * Il listait `Disallow: /admin` — l'intention était juste (tenir la gestion hors des index), mais
 * l'effet était de donner l'adresse exacte du back-office à quiconque ouvre `/robots.txt`
 * (audit de surface d'attaque du 23/09/2026). Un `Disallow` n'interdit d'ailleurs rien : il est
 * une consigne, que seuls les robots polis suivent.
 *
 * La consigne `noindex` est désormais portée par l'en-tête `X-Robots-Tag` de `next.config.mjs`,
 * posé sur `/admin/*` : même promesse tenue, sans publier le chemin. Le vrai rempart reste
 * l'authentification (`proxy.ts` + `requireSession`), jamais le secret d'une adresse.
 */
export default function robots(): MetadataRoute.Robots {
  const host = new URL(SITE_URL).host;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host,
  };
}
