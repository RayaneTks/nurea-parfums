import { normalizePerfumeQuery } from "./normalizePerfumeQuery";
import type { ExternalPerfumeSuggestion } from "./perfumeSearchTypes";

type CacheEntry = { expires: number; value: ExternalPerfumeSuggestion | null };

const DEFAULT_TTL_MS = 5 * 60 * 1000;

const store = new Map<string, CacheEntry>();

function cacheKey(query: string, categoryKey: string): string {
  return `${normalizePerfumeQuery(query)}|${categoryKey}`;
}

export function getExternalSuggestionFromCache(
  query: string,
  categoryKey: string
): ExternalPerfumeSuggestion | null | undefined {
  const k = cacheKey(query, categoryKey);
  const row = store.get(k);
  if (!row) return undefined;
  if (Date.now() > row.expires) {
    store.delete(k);
    return undefined;
  }
  return row.value;
}

export function setExternalSuggestionCache(
  query: string,
  categoryKey: string,
  value: ExternalPerfumeSuggestion | null,
  ttlMs = DEFAULT_TTL_MS
): void {
  const k = cacheKey(query, categoryKey);
  store.set(k, { expires: Date.now() + ttlMs, value });
}
