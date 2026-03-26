import type { ExternalPerfumeSuggestion } from "./perfumeSearchTypes";
import { recordFragantyHttpFetch } from "./perfumeSearchInstrumentation";
import {
  MIN_PERFUME_EXTERNAL_SCORE,
  scoreExternalPerfumeRelevance,
  type ExternalPerfumeApiResult,
} from "./searchExternalPerfumeApi";

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

type FragantyListRow = {
  id?: string;
  name?: string;
  brand?: string;
};

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
    const data = json && typeof json === "object" && Array.isArray((json as { data?: unknown }).data)
      ? ((json as { data: FragantyListRow[] }).data)
      : [];

    let best: { suggestion: ExternalPerfumeSuggestion; score: number } | null = null;

    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const externalId = String(row.id ?? "").trim();
      const name = String(row.name ?? "").trim();
      const brand = String(row.brand ?? "").trim();
      if (!externalId || !name) continue;

      const score = scoreExternalPerfumeRelevance(q, name, brand);
      if (score < MIN_PERFUME_EXTERNAL_SCORE) continue;

      const suggestion: ExternalPerfumeSuggestion = {
        name,
        brand: brand || "—",
        externalId,
        source: "fraganty",
        raw: { id: externalId, name, brand: brand || "—" },
      };

      if (!best || score > best.score) {
        best = { suggestion, score };
      }
    }

    if (best) return { outcome: "hit", suggestion: best.suggestion };
    return { outcome: "miss" };
  } catch {
    return { outcome: "error" };
  } finally {
    clearTimeout(onTimeout);
  }
}
