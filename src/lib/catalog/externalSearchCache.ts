import { normalizePerfumeQuery } from "@/lib/search/normalizePerfumeQuery";
import type { ExternalPerfumeSuggestion } from "@/lib/search/perfumeSearchTypes";

type MemoryEntry = {
  expires: number;
  value: ExternalPerfumeSuggestion | null;
};

const memoryStore = new Map<string, MemoryEntry>();

function positiveTtlMs(): number {
  const n = Number(process.env.SEARCH_CACHE_POSITIVE_TTL_MS);
  return Number.isFinite(n) && n >= 60_000 ? n : 7 * 24 * 60 * 60 * 1000;
}

function negativeTtlMs(): number {
  const n = Number(process.env.SEARCH_CACHE_NEGATIVE_TTL_MS);
  return Number.isFinite(n) && n >= 60_000 ? n : 24 * 60 * 60 * 1000;
}

function errorTtlMs(): number {
  const n = Number(process.env.SEARCH_CACHE_ERROR_TTL_MS);
  return Number.isFinite(n) && n >= 10_000 ? n : 120_000;
}

function memKey(query: string, categoryKey: string): string {
  return `${normalizePerfumeQuery(query)}|${categoryKey}`;
}

/**
 * undefined = miss, null = entrée cache « sans suggestion » (négatif ou erreur).
 */
export async function getExternalSuggestionFromCache(
  query: string,
  categoryKey: string
): Promise<ExternalPerfumeSuggestion | null | undefined> {
  const rawQ = query.trim();
  const ck = categoryKey;

  const k = memKey(rawQ, ck);
  const mem = memoryStore.get(k);
  if (!mem) return undefined;
  if (Date.now() > mem.expires) {
    memoryStore.delete(k);
    return undefined;
  }
  return mem.value;
}

export async function setExternalSuggestionCache(
  query: string,
  categoryKey: string,
  value: ExternalPerfumeSuggestion | null,
  kind: "found" | "not_found" | "error" = value ? "found" : "not_found"
): Promise<void> {
  const rawQ = query.trim();
  const ck = categoryKey;

  let status: "ERROR" | "FOUND" | "NOT_FOUND";
  let ttl: number;
  if (kind === "error") {
    status = "ERROR";
    ttl = errorTtlMs();
  } else if (value) {
    status = "FOUND";
    ttl = positiveTtlMs();
  } else {
    status = "NOT_FOUND";
    ttl = negativeTtlMs();
  }

  const expiresAt = new Date(Date.now() + ttl);

  memoryStore.set(memKey(rawQ, ck), {
    expires: expiresAt.getTime(),
    value: status === "FOUND" ? value : null,
  });
}
