import {
  EXTERNAL_PERFUME_HINTS,
} from "./externalSearchHints";
import type { ExternalPerfumeHint } from "./externalSearchTypes";

export const CONTACT = {
  whatsapp:
    "https://wa.me/33600000000?text=Bonjour%20Maison%20Nur%C3%A9a,%20je%20souhaite%20me%20renseigner%20sur...",
  snapchat: "https://snapchat.com/add/nureaparfums",
  /** Affichage footer / UI (cohérent avec l’URL snapchat.com/add/…) */
  snapchatHandle: "@nureaparfums",
  email: "contact@nureaparfum.fr",
  location: "Marseille & alentours",
};

export type Category =
  | "Tout voir"
  | "Gammes Complètes"
  | "Sélections Individuelles"
  | "Nouveautés";

export interface Perfume {
  id: number;
  name: string;
  brand: string;
  /** Renseigné par le catalogue serveur (DB / dérivé du nom). */
  brandSlug?: string;
  category: Category;
  image: string;
  imageLight?: string;
  imageDark?: string;
  /** Placeholder low-res (Data URL) */
  blurDataURL?: string;
  tags?: string[];
  aliases?: string[];
  classics?: string[];
  isFeatured?: boolean;
}

export const categories: Category[] = [
  "Tout voir",
  "Gammes Complètes",
  "Sélections Individuelles",
  "Nouveautés",
];

/** 
 * Le catalogue est désormais géré via la base de données.
 * mockPerfumes est conservé vide pour la compatibilité des types si nécessaire,
 * mais les composants doivent consommer les données de l'API / DB.
 */
export const mockPerfumes: Perfume[] = [];

/**
 * Retourne l'URL de l'image appropriée selon le thème.
 * Gère les URLs relatives (/parfums/...) et absolues (Supabase).
 */
export function getPerfumeImage(
  perfume: Perfume,
  theme: "light" | "dark" | undefined = "dark"
): string {
  const isDark = theme === "dark";
  
  if (isDark && perfume.imageDark) return perfume.imageDark;
  if (!isDark && perfume.imageLight) return perfume.imageLight;
  
  return perfume.image || "/placeholder.svg";
}

// --- Logique de recherche (Fuzzy Search) ---

export function normalizeForFuzzy(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) tmp[i] = [i];
  for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

function combinedSearchHaystack(p: Perfume): string {
  const parts = [p.name, p.brand, p.category, ...(p.tags ?? []), ...(p.aliases ?? []), ...(p.classics ?? [])];
  return normalizeForFuzzy(parts.join(" "));
}

export function fuzzySearchMatch(perfume: Perfume, query: string): boolean {
  const q = normalizeForFuzzy(query.trim());
  if (!q) return true;
  const hay = combinedSearchHaystack(perfume);
  if (hay.includes(q)) return true;
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length > 0 && tokens.every((t) => hay.includes(t))) return true;
  return rawDistanceToPerfume(q, perfume) <= (q.length > 5 ? 2 : 1);
}

function rawDistanceToPerfume(q: string, p: Perfume): number {
  const n = normalizeForFuzzy(p.name);
  const b = normalizeForFuzzy(p.brand);
  return Math.min(levenshtein(q, n), levenshtein(q, b));
}

export function suggestSimilarPerfumes(
  query: string,
  all: Perfume[],
  limit = 6
): Perfume[] {
  const q = normalizeForFuzzy(query.trim());
  if (!q) return [];
  return all
    .map((p) => ({ p, score: searchRelevanceScore(p, q) }))
    .filter((x) => x.score > 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

// --- Helpers pour l'affichage ---

function tokenMatchesExternalWord(token: string, word: string): boolean {
  if (word.length < 3) return token === word;
  return word.includes(token) || token.includes(word);
}

function maxQueryLen(h: ExternalPerfumeHint): number {
  return Math.max(...h.queries.map((q) => q.length));
}

function scoreExternalQueryPair(nq: string, hq: string): number {
  if (nq === hq) return 100;
  if (nq.includes(hq) && hq.length >= 3) return 96;
  if (hq.includes(nq) && nq.length >= 3) return 93;
  const d = levenshtein(nq, hq);
  const L = Math.max(nq.length, hq.length);
  if (L >= 4 && d <= 2 && d / L <= 0.28) return 88;
  if (L >= 6 && d <= 3 && d / L <= 0.22) return 82;

  const nt = nq.split(/\s+/).filter((t) => t.length >= 2);
  const ht = hq.split(/\s+/).filter((t) => t.length >= 2);
  if (ht.length === 0) return 0;

  let hqHits = 0;
  for (const h of ht) {
    if (nt.some((t) => tokenMatchesExternalWord(t, h))) hqHits++;
  }
  const coverHq = hqHits / ht.length;
  if (coverHq >= 1) return 86;
  if (coverHq >= 0.66 && nt.length >= 2) return 74;

  if (nt.length === 1 && ht.length === 1) {
    const t = nt[0];
    const h = ht[0];
    if (tokenMatchesExternalWord(t, h)) return 84;
  }

  return 0;
}

const EXTERNAL_HINT_MIN_SCORE = 72;

export function findExternalPerfumeHint(query: string): ExternalPerfumeHint | null {
  const raw = query.trim();
  if (raw.length < 2) return null;
  const nq = normalizeForFuzzy(raw);
  if (nq.length < 2) return null;

  const hintsSorted = [...EXTERNAL_PERFUME_HINTS].sort(
    (a, b) => maxQueryLen(b) - maxQueryLen(a)
  );

  let best: { hint: ExternalPerfumeHint; score: number } | null = null;

  for (const hint of hintsSorted) {
    for (const hqRaw of hint.queries) {
      const hq = normalizeForFuzzy(hqRaw);
      const score = scoreExternalQueryPair(nq, hq);
      if (score > (best?.score ?? 0)) {
        best = { hint, score };
      }
    }
  }

  if (!best || best.score < EXTERNAL_HINT_MIN_SCORE) return null;
  return best.hint;
}

export function getPerfumesByIds(
  ids: number[],
  perfumes: Perfume[]
): Perfume[] {
  const byId = new Map(perfumes.map((p) => [p.id, p]));
  const out: Perfume[] = [];
  const seen = new Set<number>();
  for (const id of ids) {
    const p = byId.get(id);
    if (p && !seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

export function searchRelevanceScore(perfume: Perfume, query: string): number {
  const q = normalizeForFuzzy(query.trim());
  if (!q) return 0;
  const name = normalizeForFuzzy(perfume.name);
  const brand = normalizeForFuzzy(perfume.brand);
  const hay = combinedSearchHaystack(perfume);
  let score = 0;
  if (name === q) score += 800;
  else if (name.startsWith(q)) score += 500;
  else if (name.includes(q)) score += 400;
  else if (
    q.split(/\s+/).filter((t) => t.length >= 2).every((t) => name.includes(t))
  )
    score += 380;
  if (brand.includes(q)) score += 300;
  if (hay.includes(q)) score += 200;
  score += Math.max(0, 120 - Math.min(119, rawDistanceToPerfume(query, perfume)));
  return score;
}

export function compareSearchRelevance(
  a: Perfume,
  b: Perfume,
  query: string
): number {
  return searchRelevanceScore(b, query) - searchRelevanceScore(a, query);
}

export type { ExternalPerfumeHint } from "./externalSearchTypes";
export {
  EXTERNAL_PERFUME_HINTS,
  EXTERNAL_SEARCH_FALLBACK_MESSAGE,
} from "./externalSearchHints";
