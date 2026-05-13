import { normalizeForFuzzy } from "../data";
import type { ExternalPerfumeSuggestion } from "./perfumeSearchTypes";
import { recordFragantyHttpFetch } from "./perfumeSearchInstrumentation";
import {
  MIN_PERFUME_EXTERNAL_SCORE,
  parseExternalPerfumePayload,
  scoreExternalPerfumeRelevance,
  type ExternalPerfumeApiResult,
} from "./searchExternalPerfumeApi";

/**
 * Seuil assoupli lorsque Fraganty a déjà renvoyé des lignes pour `q=` (tri côté API).
 * Évite les « miss » quand marque/nom ne passent pas le barème strict (ex. libellés atypiques).
 */
const MIN_FRAGANTY_FALLBACK_SCORE = 52;

const MIN_Q = 3;

function fragantyBaseUrl(): string {
  const u = process.env.FRAGANTY_API_BASE_URL?.trim() || "https://fraganty.ai";
  return u.replace(/\/+$/, "");
}

function fragantyLimit(): number {
  const n = Number(process.env.FRAGANTY_API_LIMIT);
  if (Number.isFinite(n) && n >= 1) return Math.min(n, 100);
  return 12;
}

function externalTimeoutMs(): number {
  return Math.min(
    Math.max(Number(process.env.PERFUME_EXTERNAL_API_TIMEOUT_MS) || 8000, 2000),
    30_000
  );
}

/**
 * Fraganty — doc : https://fraganty.ai/api-docs
 * GET /api/perfumes?q=…&limit=… avec X-API-Key.
 * On ne conserve que l’alignement catalogue local : nom, marque, identifiant (slug Fraganty).
 */
export async function searchFragantyApi(
  query: string,
  signal?: AbortSignal
): Promise<ExternalPerfumeApiResult> {
  const apiKey = process.env.FRAGANTY_API_KEY?.trim();
  if (!apiKey) return { outcome: "disabled" };

  const q = query.trim();
  if (q.length < MIN_Q) return { outcome: "too_short" };

  const timeoutMs = externalTimeoutMs();
  const controller = new AbortController();
  const onTimeout = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const base = fragantyBaseUrl();
    const limit = fragantyLimit();
    const url = new URL(`${base}/api/perfumes`);
    url.searchParams.set("q", q);
    url.searchParams.set("limit", String(limit));

    recordFragantyHttpFetch();
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-API-Key": apiKey,
      },
      signal: controller.signal,
      cache: "no-store",
    }).catch(() => null);

    if (!res) return { outcome: "error" };
    if (!res.ok) return { outcome: "error" };

    const json: unknown = await res.json();
    const rows = parseExternalPerfumePayload(json);

    let bestStrict: { suggestion: ExternalPerfumeSuggestion; score: number } | null = null;
    let bestLoose: { suggestion: ExternalPerfumeSuggestion; score: number } | null = null;

    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const externalId = String(
        (row as { id?: unknown; externalId?: unknown }).externalId ??
          (row as { id?: unknown }).id ??
          ""
      ).trim();
      const name = String((row as { name?: unknown; title?: unknown }).name ?? (row as { title?: unknown }).title ?? "").trim();
      const brand = String(
        (row as { brand?: unknown; house?: unknown; manufacturer?: unknown }).brand ??
          (row as { house?: unknown }).house ??
          (row as { manufacturer?: unknown }).manufacturer ??
          ""
      ).trim();
      if (!externalId || !name) continue;

      const suggestion: ExternalPerfumeSuggestion = {
        name,
        brand: brand || "—",
        externalId,
        source: "fraganty",
        raw: { id: externalId, name, brand: brand || "—" },
      };

      const score = scoreExternalPerfumeRelevance(q, name, brand);
      if (score >= MIN_PERFUME_EXTERNAL_SCORE) {
        if (!bestStrict || score > bestStrict.score) {
          bestStrict = { suggestion, score };
        }
      }
      if (score >= MIN_FRAGANTY_FALLBACK_SCORE) {
        if (!bestLoose || score > bestLoose.score) {
          bestLoose = { suggestion, score };
        }
      }
    }

    if (bestStrict) return { outcome: "hit", suggestion: bestStrict.suggestion };
    if (bestLoose) return { outcome: "hit", suggestion: bestLoose.suggestion };

    const nq = normalizeForFuzzy(q);
    if (nq.length >= 3) {
      for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const externalId = String(
          (row as { id?: unknown; externalId?: unknown }).externalId ??
            (row as { id?: unknown }).id ??
            ""
        ).trim();
        const name = String((row as { name?: unknown; title?: unknown }).name ?? (row as { title?: unknown }).title ?? "").trim();
        const brand = String(
          (row as { brand?: unknown; house?: unknown; manufacturer?: unknown }).brand ??
            (row as { house?: unknown }).house ??
            (row as { manufacturer?: unknown }).manufacturer ??
            ""
        ).trim();
        if (!externalId || !name) continue;
        const slugHay = normalizeForFuzzy(
          `${externalId.replace(/-/g, " ")} ${name} ${brand}`
        );
        if (!slugHay.includes(nq)) continue;
        return {
          outcome: "hit",
          suggestion: {
            name,
            brand: brand || "—",
            externalId,
            source: "fraganty",
            raw: { id: externalId, name, brand: brand || "—" },
          },
        };
      }
    }

    return { outcome: "miss" };
  } catch {
    return { outcome: "error" };
  } finally {
    clearTimeout(onTimeout);
  }
}
