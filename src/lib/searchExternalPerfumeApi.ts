import { normalizeForFuzzy } from "./data";
import type { ExternalPerfumeSuggestion } from "./perfumeSearchTypes";

const MIN_QUERY_LEN = 3;
const MIN_SCORE = 72;

type RawHit = {
  externalId?: string;
  id?: string;
  name?: string;
  title?: string;
  brand?: string;
  house?: string;
  manufacturer?: string;
};

function levenshtein(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  const dp: number[][] = Array(an + 1)
    .fill(null)
    .map(() => Array(bn + 1).fill(0));
  for (let i = 0; i <= an; i++) dp[i][0] = i;
  for (let j = 0; j <= bn; j++) dp[0][j] = j;
  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[an][bn];
}

/**
 * Score 0–100 : pertinence requête ↔ ligne API (nom + marque).
 */
function scoreExternalHit(
  query: string,
  name: string,
  brand: string
): number {
  const nq = normalizeForFuzzy(query);
  if (nq.length < MIN_QUERY_LEN) return 0;
  const full = normalizeForFuzzy(`${brand} ${name}`.trim());
  const nn = normalizeForFuzzy(name);
  const nb = normalizeForFuzzy(brand);

  if (full === nq || nn === nq) return 100;
  if (full.startsWith(nq) && nq.length >= 4) return 95;
  if (nn.startsWith(nq) && nq.length >= 3) return 92;
  if (full.includes(nq) && nq.length >= 4) return 88;
  if (nn.includes(nq) && nq.length >= 3) return 85;
  if (nb.includes(nq) && nq.length >= 3) return 78;

  const L = Math.max(nq.length, full.length);
  if (L >= 4) {
    const d = levenshtein(nq, full);
    if (d <= 2 && d / L <= 0.28) return 82;
    if (d <= 3 && d / L <= 0.22) return 76;
  }

  const qt = nq.split(/\s+/).filter((t) => t.length >= 2);
  const ft = full.split(/\s+/).filter((t) => t.length >= 2);
  if (qt.length === 0 || ft.length === 0) return 0;
  let hits = 0;
  for (const q of qt) {
    if (ft.some((t) => t === q || (q.length >= 3 && (t.includes(q) || q.includes(t))))) {
      hits++;
    }
  }
  const cover = hits / qt.length;
  if (cover >= 1) return 84;
  if (cover >= 0.66 && qt.length >= 2) return 74;

  return 0;
}

function parseHits(payload: unknown): RawHit[] {
  if (!payload || typeof payload !== "object") return [];
  const o = payload as Record<string, unknown>;

  if (Array.isArray(o.results)) return o.results as RawHit[];
  if (Array.isArray(o.data)) return o.data as RawHit[];
  if (Array.isArray(o.items)) return o.items as RawHit[];
  if (Array.isArray(o.hits)) return o.hits as RawHit[];

  const nested = o.data;
  if (nested && typeof nested === "object" && Array.isArray((nested as { results?: RawHit[] }).results)) {
    return (nested as { results: RawHit[] }).results;
  }

  return [];
}

function rawToSuggestion(hit: RawHit, raw: Record<string, unknown>): ExternalPerfumeSuggestion | null {
  const name = (hit.name ?? hit.title ?? "").trim();
  const brand = (hit.brand ?? hit.house ?? hit.manufacturer ?? "").trim();
  const externalId = String(hit.externalId ?? hit.id ?? "").trim();
  if (!name || !externalId) return null;
  return {
    name,
    brand: brand || "—",
    externalId,
    raw,
  };
}

function buildRequestUrl(baseUrl: string, query: string): string {
  const enc = encodeURIComponent(query);
  if (baseUrl.includes("{{query}}")) {
    return baseUrl.split("{{query}}").join(enc);
  }
  const absolute =
    baseUrl.startsWith("http://") || baseUrl.startsWith("https://")
      ? baseUrl
      : `https://${baseUrl}`;
  const u = new URL(absolute);
  u.searchParams.set("q", query);
  return u.toString();
}

/**
 * Appelle l’API externe configurée. Clé et URL uniquement côté serveur.
 * Retourne null si désactivée, erreur réseau, timeout, ou aucun résultat pertinent.
 */
export async function searchExternalPerfumeApi(
  query: string,
  signal?: AbortSignal
): Promise<ExternalPerfumeSuggestion | null> {
  const q = query.trim();
  if (q.length < MIN_QUERY_LEN) return null;

  const baseUrl = process.env.PERFUME_EXTERNAL_API_URL?.trim();
  if (!baseUrl) return null;

  const timeoutMs = Math.min(
    Math.max(Number(process.env.PERFUME_EXTERNAL_API_TIMEOUT_MS) || 8000, 2000),
    30_000
  );

  const controller = new AbortController();
  const onTimeout = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const url = buildRequestUrl(baseUrl, q);
    const headers: HeadersInit = {
      Accept: "application/json",
    };

    const key = process.env.PERFUME_EXTERNAL_API_KEY?.trim();
    const rapidHost = process.env.PERFUME_EXTERNAL_RAPIDAPI_HOST?.trim();

    if (key) {
      if (rapidHost) {
        (headers as Record<string, string>)["X-RapidAPI-Key"] = key;
        (headers as Record<string, string>)["X-RapidAPI-Host"] = rapidHost;
      } else {
        (headers as Record<string, string>)["Authorization"] = `Bearer ${key}`;
      }
    }

    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
      cache: "no-store",
    }).catch(() => null);

    if (!res) return null;

    if (!res.ok) return null;

    const json: unknown = await res.json();
    const hits = parseHits(json);

    let best: { suggestion: ExternalPerfumeSuggestion; score: number } | null = null;

    for (const hit of hits) {
      const name = (hit.name ?? hit.title ?? "").trim();
      const brand = (hit.brand ?? hit.house ?? hit.manufacturer ?? "").trim();
      const score = scoreExternalHit(q, name, brand);
      if (score < MIN_SCORE) continue;
      const sug = rawToSuggestion(hit, hit as Record<string, unknown>);
      if (!sug) continue;
      if (!best || score > best.score) {
        best = { suggestion: sug, score };
      }
    }

    return best?.suggestion ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(onTimeout);
  }
}
