import type { Category } from "./data";
import type { PerfumeSearchResponse } from "./perfumeSearchTypes";
import {
  getExternalSuggestionFromCache,
  setExternalSuggestionCache,
} from "./perfumeSearchCache";
import { searchExternalPerfumeApi } from "./searchExternalPerfumeApi";
import { searchLocalCatalog } from "./searchLocalCatalog";

/**
 * Orchestration : catalogue local d’abord, puis API externe (avec cache mémoire).
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

  const local = searchLocalCatalog(query, { category: cat });
  if (local.length > 0) {
    return { type: "local_results", query, results: local };
  }

  const q = query.trim();
  if (q.length < 3) {
    return { type: "no_results", query: q };
  }

  const cached = getExternalSuggestionFromCache(q, categoryKey);
  if (cached !== undefined) {
    if (cached === null) return { type: "no_results", query: q };
    return { type: "external_suggestion", query: q, suggestion: cached };
  }

  const suggestion = await searchExternalPerfumeApi(q, options?.signal);
  setExternalSuggestionCache(q, categoryKey, suggestion);

  if (suggestion) {
    return { type: "external_suggestion", query: q, suggestion };
  }

  return { type: "no_results", query: q };
}
