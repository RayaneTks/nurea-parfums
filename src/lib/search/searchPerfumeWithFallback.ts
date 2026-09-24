import type { Category, Perfume } from "../data";
import type { PerfumeSearchResponse } from "./perfumeSearchTypes";
import { getCatalogPerfumes } from "../catalog/getCatalogPerfumes";
import { getUnlistedPerfumes, type UnlistedPerfume } from "../catalogue-service";
import {
  getExternalSuggestionFromCache,
  setExternalSuggestionCache,
} from "../catalog/externalSearchCache";
import { searchExternalPerfumeApi } from "./searchExternalPerfumeApi";
import { searchFragantyApi } from "./searchFragantyApi";
import { cleNom } from "../nommage";
import { searchLocalCatalog } from "./searchLocalCatalog";

/**
 * Orchestration : catalogue (DB ou mock) → parfums au catalogue sans carte publique → cache externe
 * (DB ou mémoire) → API externe.
 */
export async function searchPerfumeWithFallback(
  query: string,
  options?: {
    category?: Category;
    signal?: AbortSignal;
  }
): Promise<PerfumeSearchResponse> {
  const cat = options?.category ?? "Tout voir";
  const categoryKey = cat;

  const catalog = await getCatalogPerfumes();
  const local = searchLocalCatalog(catalog, query, { category: cat });
  if (local.length > 0) {
    return { type: "local_results", query, results: local };
  }

  const q = query.trim();
  if (q.length < 3) {
    return { type: "no_results", query: q };
  }

  // Masqué, ou visuel pas encore prêt : la référence existe chez nous, on invite à écrire.
  const unlisted = searchUnlisted(await getUnlistedPerfumes(), q);
  if (unlisted) {
    return { type: "unlisted_match", query: q, match: unlisted };
  }

  const cached = await getExternalSuggestionFromCache(q, categoryKey);
  if (cached !== undefined) {
    if (cached === null) return { type: "no_results", query: q };
    return { type: "external_suggestion", query: q, suggestion: cached };
  }

  const api = (process.env.FRAGANTY_API_KEY ?? "").trim()
    ? await searchFragantyApi(q, options?.signal)
    : await searchExternalPerfumeApi(q, options?.signal);

  if (api.outcome === "disabled") {
    return { type: "no_results", query: q };
  }

  if (api.outcome === "error") {
    await setExternalSuggestionCache(q, categoryKey, null, "error");
    return { type: "no_results", query: q };
  }

  if (api.outcome === "hit") {
    await setExternalSuggestionCache(q, categoryKey, api.suggestion, "found");
    return { type: "external_suggestion", query: q, suggestion: api.suggestion };
  }

  if (api.outcome === "too_short") {
    return { type: "no_results", query: q };
  }

  await setExternalSuggestionCache(q, categoryKey, null, "not_found");
  return { type: "no_results", query: q };
}

/**
 * La référence hors vitrine la plus proche de la saisie, ou null. Le nom et la marque seulement ; `on` dit si la
 * saisie vise le parfum ou seulement sa marque.
 */
export function searchUnlisted(
  unlisted: readonly UnlistedPerfume[],
  query: string,
): (UnlistedPerfume & { on: "perfume" | "brand" }) | null {
  const asPerfumes: Perfume[] = unlisted.map((p, index) => ({
    id: index,
    name: p.name,
    brand: p.brand,
    category: "Sélections Individuelles",
    image: "",
  }));
  const [best] = searchLocalCatalog(asPerfumes, query);
  if (!best) return null;
  const key = cleNom(query);
  const brandOnly = key !== "" && cleNom(best.brand).includes(key) && !cleNom(best.name).includes(key);
  return { name: best.name, brand: best.brand, on: brandOnly ? "brand" : "perfume" };
}
