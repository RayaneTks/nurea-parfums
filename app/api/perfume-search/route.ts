import { NextResponse } from "next/server";
import { validatePerfumeSearchQuery } from "@/lib/search/normalizePerfumeQuery";
import { parseCategoryParam } from "@/lib/search/searchLocalCatalog";
import { searchPerfumeWithFallback } from "@/lib/search/searchPerfumeWithFallback";
import { createRateLimiter, rateLimitKey } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Le frein de la recherche (audit du 23/09/2026, constat moyen « API sans limite de débit »).
 *
 * 40 appels par minute et par adresse : la barre de recherche est anti-rebondie à 300 ms et ne part
 * qu'à partir de trois caractères — une frappe humaine soutenue en produit une quinzaine par
 * minute. Un script qui déroule l'alphabet pour aspirer le catalogue, lui, tape au-delà dès la
 * première seconde. La limite vit en mémoire de l'instance : c'est un frein, pas un quota (voir
 * `src/lib/security/rate-limit.ts`).
 */
const LIMIT = 40;
const searchLimiter = createRateLimiter({ limit: LIMIT, windowMs: 60_000 });

/**
 * Une réponse identique pour tout le monde : le CDN peut la servir une minute.
 *
 * C'est la seconde moitié du correctif. Ce qui est mis en cache au bord n'atteint jamais la
 * fonction, donc ne coûte rien — la boucle d'un aspirateur qui rejoue les mêmes requêtes se heurte
 * au cache avant même de croiser la limite.
 */
const CACHE_CONTROL = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

function quotaHeaders(remaining: number): Record<string, string> {
  return { "X-RateLimit-Limit": String(LIMIT), "X-RateLimit-Remaining": String(remaining) };
}

export async function GET(request: Request) {
  const quota = searchLimiter.check(rateLimitKey("perfume-search", request.headers));
  if (!quota.ok) {
    return NextResponse.json(
      { error: "Trop de recherches d'affilée. Réessayez dans un instant." },
      {
        status: 429,
        headers: {
          ...quotaHeaders(0),
          "Retry-After": String(quota.retryAfterSeconds),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const validated = validatePerfumeSearchQuery(searchParams.get("q"));
  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.error },
      { status: 400, headers: { ...quotaHeaders(quota.remaining), "Cache-Control": "no-store" } },
    );
  }

  const category = parseCategoryParam(searchParams.get("cat"));

  try {
    const payload = await searchPerfumeWithFallback(validated.value, {
      category,
      signal: request.signal,
    });
    return NextResponse.json(payload, {
      headers: { ...quotaHeaders(quota.remaining), "Cache-Control": CACHE_CONTROL },
    });
  } catch (e) {
    console.error("[perfume-search]", e);
    return NextResponse.json(
      { error: "Impossible de finaliser la recherche." },
      { status: 500, headers: { ...quotaHeaders(quota.remaining), "Cache-Control": "no-store" } },
    );
  }
}
