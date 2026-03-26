import { normalizePerfumeQuery } from "@/lib/normalizePerfumeQuery";
import type { ExternalPerfumeSuggestion } from "@/lib/perfumeSearchTypes";
import { prisma } from "@/lib/db/prisma";
import {
  prismaCatalogInCooldown,
  registerPrismaCatalogFailure,
} from "@/lib/db/prismaRuntimeCircuit";
import { Prisma, type SearchCacheStatus } from "@prisma/client";

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

function rowToSuggestion(row: {
  suggestionName: string | null;
  suggestionBrand: string | null;
  suggestionExternalId: string | null;
  payload: unknown;
  source: string | null;
}): ExternalPerfumeSuggestion | null {
  if (!row.suggestionName || !row.suggestionExternalId) return null;
  const raw =
    row.payload && typeof row.payload === "object"
      ? (row.payload as Record<string, unknown>)
      : undefined;
  return {
    name: row.suggestionName,
    brand: row.suggestionBrand ?? "—",
    externalId: row.suggestionExternalId,
    source: row.source ?? "external",
    raw,
  };
}

/**
 * undefined = miss, null = entrée cache « sans suggestion » (négatif ou erreur).
 */
export async function getExternalSuggestionFromCache(
  query: string,
  categoryKey: string
): Promise<ExternalPerfumeSuggestion | null | undefined> {
  const rawQ = query.trim();
  const nq = normalizePerfumeQuery(rawQ);
  const ck = categoryKey;

  if (process.env.DATABASE_URL?.trim() && !prismaCatalogInCooldown()) {
    try {
      const row = await prisma.searchExternalCache.findUnique({
        where: {
          normalizedQuery_categoryKey: {
            normalizedQuery: nq,
            categoryKey: ck,
          },
        },
      });
      if (!row) return undefined;
      if (row.expiresAt.getTime() <= Date.now()) {
        await prisma.searchExternalCache.delete({ where: { id: row.id } }).catch(() => {});
        return undefined;
      }
      if (row.status === "FOUND") {
        return rowToSuggestion(row);
      }
      return null;
    } catch (e) {
      registerPrismaCatalogFailure();
      console.error("[externalSearchCache] lecture DB:", e);
    }
  }

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
  const nq = normalizePerfumeQuery(rawQ);
  const ck = categoryKey;

  let status: SearchCacheStatus;
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
  const source = value?.source ?? null;

  const suggestionName =
    status === "FOUND" && value ? value.name : null;
  const suggestionBrand =
    status === "FOUND" && value ? value.brand : null;
  const suggestionExternalId =
    status === "FOUND" && value ? value.externalId : null;
  const payload: Prisma.InputJsonValue | typeof Prisma.JsonNull =
    status === "FOUND" && value?.raw
      ? (value.raw as Prisma.InputJsonValue)
      : Prisma.JsonNull;

  if (process.env.DATABASE_URL?.trim() && !prismaCatalogInCooldown()) {
    try {
      await prisma.searchExternalCache.upsert({
        where: {
          normalizedQuery_categoryKey: {
            normalizedQuery: nq,
            categoryKey: ck,
          },
        },
        create: {
          rawQuery: rawQ,
          normalizedQuery: nq,
          categoryKey: ck,
          status,
          source,
          checkedAt: new Date(),
          expiresAt,
          suggestionName,
          suggestionBrand,
          suggestionExternalId,
          payload,
        },
        update: {
          rawQuery: rawQ,
          status,
          source,
          checkedAt: new Date(),
          expiresAt,
          suggestionName,
          suggestionBrand,
          suggestionExternalId,
          payload,
        },
      });
      return;
    } catch (e) {
      registerPrismaCatalogFailure();
      console.error("[externalSearchCache] écriture DB:", e);
    }
  }

  memoryStore.set(memKey(rawQ, ck), {
    expires: expiresAt.getTime(),
    value: status === "FOUND" ? value : null,
  });
}
