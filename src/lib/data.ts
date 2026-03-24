import {
  EXTERNAL_PERFUME_HINTS,
  type ExternalPerfumeHint,
} from "./externalSearchHints";

export const CONTACT = {
  whatsapp:
    "https://wa.me/1234567890?text=Bonjour,%20je%20souhaite%20des%20informations%20sur%20un%20parfum",
  snapchat: "https://snapchat.com/add/nureaparfums",
  email: "conciergerie@nureaparfums.com",
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
  category: Category;
  image: string;
  imageLight?: string;
  imageDark?: string;
  tags?: string[];
  aliases?: string[];
  classics?: string[];
}

export const categories: Category[] = [
  "Tout voir",
  "Gammes Complètes",
  "Sélections Individuelles",
  "Nouveautés",
];

export const allBrands: string[] = [
  "Toutes",
  "Aesop",
  "Antonio Banderas",
  "Azzaro",
  "Boucheron",
  "Cartier",
  "Creed",
  "Dior",
  "Dolce & Gabbana",
  "Franck Olivier",
  "Guerlain",
  "Giorgio Armani",
  "Hermès",
  "Hugo Boss",
  "Jean Paul Gaultier",
  "Lacoste",
  "Louis Vuitton",
  "Maison Francis Kurkdjian",
  "Rabanne",
  "Tom Ford",
  "Versace",
  "Yves Saint Laurent",
  "Zara",
  "Tiziana Terenzi",
];

export const mockPerfumes: Perfume[] = [
  // Gammes complètes (visuels de marque)
  {
    id: 1,
    name: "Gamme complète Rabanne",
    brand: "Rabanne",
    category: "Gammes Complètes",
    image: "/parfums/complete/RABANNE-light.png",
    imageLight: "/parfums/complete/RABANNE-light.png",
    imageDark: "/parfums/complete/RABANNE-dark.png",
    tags: ["Gamme complète"],
    classics: ["1 Million", "Invictus", "Fame", "Phantom"],
  },
  {
    id: 2,
    name: "Gamme complète Dior",
    brand: "Dior",
    category: "Gammes Complètes",
    image: "/parfums/complete/DIOR-light.png",
    imageLight: "/parfums/complete/DIOR-light.png",
    imageDark: "/parfums/complete/DIOR-dark.png",
    tags: ["Gamme complète"],
    classics: ["Sauvage", "J'adore", "Bois d'Argent", "Gris Dior"],
  },
  {
    id: 3,
    name: "Gamme complète Jean Paul Gaultier",
    brand: "Jean Paul Gaultier",
    category: "Gammes Complètes",
    image: "/parfums/complete/JPG-light.png",
    imageLight: "/parfums/complete/JPG-light.png",
    imageDark: "/parfums/complete/JPG-dark.png",
    tags: ["Gamme complète"],
    classics: ["Le Mâle", "Scandal", "Classique", "La Belle"],
  },
  {
    id: 4,
    name: "Gamme complète Hermès",
    brand: "Hermès",
    category: "Gammes Complètes",
    image: "/parfums/complete/HERMES-light.png",
    imageLight: "/parfums/complete/HERMES-light.png",
    imageDark: "/parfums/complete/HERMES-dark.png",
    tags: ["Gamme complète"],
    classics: ["Terre d'Hermès", "Twilly", "H24", "Un Jardin sur le Nil"],
  },
  {
    id: 5,
    name: "Gamme complète Lacoste",
    brand: "Lacoste",
    category: "Gammes Complètes",
    image: "/parfums/complete/LACOSTE-light.png",
    imageLight: "/parfums/complete/LACOSTE-light.png",
    imageDark: "/parfums/complete/LACOSTE-dark.png",
    tags: ["Gamme complète"],
  },
  {
    id: 6,
    name: "Gamme complète Azzaro",
    brand: "Azzaro",
    category: "Gammes Complètes",
    image: "/parfums/complete/AZZARO-light.png",
    imageLight: "/parfums/complete/AZZARO-light.png",
    imageDark: "/parfums/complete/AZZARO-dark.png",
    tags: ["Gamme complète"],
  },
  {
    id: 7,
    name: "Gamme complète Guerlain",
    brand: "Guerlain",
    category: "Gammes Complètes",
    image: "/parfums/complete/GUERLAIN-light.png",
    imageLight: "/parfums/complete/GUERLAIN-light.png",
    imageDark: "/parfums/complete/GUERLAIN-dark.png",
    tags: ["Gamme complète"],
    classics: ["Shalimar", "Habit Rouge", "L'Homme Idéal", "Aqua Allegoria"],
  },
  {
    id: 8,
    name: "Gamme complète Hugo Boss",
    brand: "Hugo Boss",
    category: "Gammes Complètes",
    image: "/parfums/complete/BOSS-light.png",
    imageLight: "/parfums/complete/BOSS-light.png",
    imageDark: "/parfums/complete/BOSS-dark.png",
    tags: ["Gamme complète"],
  },
  {
    id: 24,
    name: "Gamme complète Dolce & Gabbana",
    brand: "Dolce & Gabbana",
    category: "Gammes Complètes",
    image: "/parfums/complete/D&G-light.png",
    imageLight: "/parfums/complete/D&G-light.png",
    imageDark: "/parfums/complete/D&G-dark.png",
    tags: ["Gamme complète"],
    classics: ["Light Blue", "The One", "K", "Devotion"],
  },

  // Sélections individuelles
  {
    id: 9,
    name: "Baccarat Rouge 540",
    brand: "Maison Francis Kurkdjian",
    category: "Sélections Individuelles",
    image: "/parfums/baccarat-rouge-light.png",
    imageLight: "/parfums/baccarat-rouge-light.png",
    imageDark: "/parfums/baccarat-rouge-dark.png",
    tags: ["Signature"],
    aliases: ["bakara", "bacara", "bacarras", "rouj", "kurkian", "mfk", "francis"],
  },
  {
    id: 10,
    name: "Aventus",
    brand: "Creed",
    category: "Sélections Individuelles",
    image: "/parfums/creed-aventus.webp",
    tags: ["Iconique"],
    aliases: ["cred", "aventu", "aventhus"],
  },
  {
    id: 11,
    name: "Eros",
    brand: "Versace",
    category: "Sélections Individuelles",
    image: "/parfums/eros.webp",
  },
  {
    id: 12,
    name: "Kirke",
    brand: "Tiziana Terenzi",
    category: "Sélections Individuelles",
    image: "/parfums/kirke.webp",
    aliases: ["kirk", "terenzi", "tiziana"],
  },
  {
    id: 13,
    name: "Oud Touch",
    brand: "Franck Olivier",
    category: "Sélections Individuelles",
    image: "/parfums/oud-touch.webp",
  },
  {
    id: 14,
    name: "Pasha",
    brand: "Cartier",
    category: "Sélections Individuelles",
    image: "/parfums/pasha.webp",
  },
  {
    id: 15,
    name: "Sun Java",
    brand: "Franck Olivier",
    category: "Sélections Individuelles",
    image: "/parfums/sun-java.webp",
  },
  {
    id: 16,
    name: "Zara Tobacco",
    brand: "Zara",
    category: "Sélections Individuelles",
    image: "/parfums/zara-tobacco.webp",
  },

  // Nouveautés
  {
    id: 17,
    name: "MYSLF",
    brand: "Yves Saint Laurent",
    category: "Nouveautés",
    image: "/parfums/myslf.webp",
    tags: ["Nouveauté"],
  },
  {
    id: 18,
    name: "Y Elixir",
    brand: "Yves Saint Laurent",
    category: "Nouveautés",
    image: "/parfums/y-elixir-light.png",
    imageLight: "/parfums/y-elixir-light.png",
    imageDark: "/parfums/y-elixir-dark.png",
    tags: ["Nouveauté"],
  },
  {
    id: 19,
    name: "Quatre En Rouge",
    brand: "Boucheron",
    category: "Nouveautés",
    image: "/parfums/quatre-en-rouge-light.jpeg",
    imageLight: "/parfums/quatre-en-rouge-light.jpeg",
    imageDark: "/parfums/quatre-en-rouge-dark.jpeg",
    tags: ["Nouveauté"],
    aliases: ["quatre", "en rouge", "boucheron"],
  },
  {
    id: 20,
    name: "La Nuit de L'Homme",
    brand: "Yves Saint Laurent",
    category: "Nouveautés",
    image: "/parfums/la-nuit-light.png",
    imageLight: "/parfums/la-nuit-light.png",
    imageDark: "/parfums/la-nuit-dark.png",
    tags: ["Nouveauté"],
    aliases: ["la nuit", "homme", "ysl nuit"],
  },
  {
    id: 21,
    name: "Stronger With You Intensely",
    brand: "Giorgio Armani",
    category: "Nouveautés",
    image: "/parfums/stronger-with-you-intensely.jpeg",
    tags: ["Nouveauté"],
    aliases: ["stronger with you", "intensely", "armani you"],
  },
  {
    id: 22,
    name: "Blue Seduction",
    brand: "Antonio Banderas",
    category: "Nouveautés",
    image: "/parfums/blue-seduction.jpeg",
    tags: ["Nouveauté"],
    aliases: ["seduction", "blue", "banderas"],
  },
  {
    id: 23,
    name: "Marrakech Intense",
    brand: "Aesop",
    category: "Nouveautés",
    image: "/parfums/marrakech-intense.jpeg",
    tags: ["Nouveauté"],
    aliases: ["marrakech", "aesop intense"],
  },
  {
    id: 25,
    name: "Y",
    brand: "Yves Saint Laurent",
    category: "Nouveautés",
    image: "/parfums/y-ysl-light.png",
    imageLight: "/parfums/y-ysl-light.png",
    imageDark: "/parfums/y-ysl-dark.png",
    tags: ["Nouveauté"],
    aliases: ["yves saint laurent y", "parfum y"],
  },
  {
    id: 26,
    name: "Stronger With You",
    brand: "Giorgio Armani",
    category: "Nouveautés",
    image: "/parfums/stronger-with-you.jpeg",
    tags: ["Nouveauté"],
    aliases: ["stronger", "swy", "with you"],
  },
];

export const getPerfumeImage = (
  perfume: Perfume,
  theme?: "light" | "dark"
): string => {
  if (theme === "dark" && perfume.imageDark) return perfume.imageDark;
  if (theme === "light" && perfume.imageLight) return perfume.imageLight;
  return perfume.image;
};

export const normalizeText = (text: string | null | undefined): string =>
  text?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

/** Pour la recherche floue : enlève accents + réduit les répétitions de lettres (bacarra → bacara, baccarat → bacarat). */
export const normalizeForFuzzy = (text: string): string => {
  const n = normalizeText(text).replace(/\s+/g, " ");
  return n.replace(/(.)\1+/g, "$1");
};

/**
 * Approximation phonétique (français / saisie « comme ça se prononce ») pour comparer requête et textes.
 * Ne remplace pas une vraie phonétique API, mais aide pour ph/qu/ch, etc.
 */
export const phoneticFold = (text: string): string => {
  let x = normalizeForFuzzy(text).replace(/\s+/g, " ");
  x = x.replace(/ph/g, "f");
  x = x.replace(/qu/g, "k");
  x = x.replace(/ch/g, "c");
  x = x.replace(/gn/g, "n");
  x = x.replace(/ae/g, "e");
  x = x.replace(/oe/g, "e");
  return x.replace(/(.)\1+/g, "$1");
};

function collectSearchTargets(perfume: Perfume): string[] {
  return [
    normalizeForFuzzy(perfume.name),
    normalizeForFuzzy(perfume.brand),
    ...(perfume.tags ?? []).map((t) => normalizeForFuzzy(t)),
    ...(perfume.aliases ?? []).map((a) => normalizeForFuzzy(a)),
    ...(perfume.classics ?? []).map((c) => normalizeForFuzzy(c)),
  ];
}

/** Tout le texte indexable d'un parfum (nom, marque, tags, alias, classiques). */
export function combinedSearchHaystack(perfume: Perfume): string {
  return collectSearchTargets(perfume).join(" ");
}

/** Distance de Levenshtein entre deux chaînes. */
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

function maxDistForToken(len: number): number {
  if (len <= 3) return 2;
  if (len <= 6) return 3;
  return 4;
}

/** Un mot de la requête matche le parfum (sous-chaîne, typo, phonétique, préfixe). */
function tokenMatchesQueryWord(
  token: string,
  words: string[],
  haystack: string
): boolean {
  if (token.length < 2) return true;
  if (haystack.includes(token)) return true;
  const maxD = maxDistForToken(token.length);
  const tPh = phoneticFold(token);
  for (const w of words) {
    if (w.length < 2) continue;
    if (levenshtein(token, w) <= maxD) return true;
    if (levenshtein(tPh, phoneticFold(w)) <= maxD) return true;
    if (token.length >= 3 && w.length >= 3) {
      if (w.startsWith(token.slice(0, 3)) || token.startsWith(w.slice(0, 3)))
        return true;
    }
  }
  return false;
}

/**
 * Recherche tolérante : nom, marque, tags, alias, classiques.
 * — Phrase entière ou partie du catalogue (includes).
 * — Plusieurs mots : une partie des mots suffit (recherche « boostée » type moteur).
 * — Typos / phonétique par mot.
 */
export function fuzzySearchMatch(perfume: Perfume, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const haystack = combinedSearchHaystack(perfume);
  const nq = normalizeForFuzzy(q);
  const hayPh = phoneticFold(haystack);
  const nqPh = phoneticFold(q);

  if (haystack.includes(nq)) return true;
  if (nqPh.length >= 3 && hayPh.includes(nqPh)) return true;

  const name = normalizeForFuzzy(perfume.name);
  const brand = normalizeForFuzzy(perfume.brand);
  const words = haystack.split(/\s+/).filter((w) => w.length > 0);
  const tokens = nq.split(/\s+/).filter((t) => t.length > 0);
  const meaningful = tokens.filter((t) => t.length >= 2);

  if (meaningful.length === 0) return true;

  if (meaningful.length === 1) {
    const t = meaningful[0];
    return tokenMatchesQueryWord(t, words, haystack);
  }

  let hits = 0;
  for (const t of meaningful) {
    if (tokenMatchesQueryWord(t, words, haystack)) hits++;
  }
  const need = Math.max(1, Math.ceil(meaningful.length * 0.4));
  if (hits >= need) return true;

  const phraseMax =
    nq.length <= 6 ? 3 : nq.length <= 14 ? 5 : Math.min(8, Math.floor(nq.length / 2));
  if (levenshtein(nq, name) <= phraseMax) return true;
  if (levenshtein(nq, brand) <= phraseMax) return true;
  if (levenshtein(nq, `${brand} ${name}`) <= phraseMax + 2) return true;

  return false;
}

/** Distance minimale requête ↔ parfum (pour suggestions quand aucun résultat exact). */
function rawDistanceToPerfume(query: string, perfume: Perfume): number {
  const q = normalizeForFuzzy(query);
  const qPh = phoneticFold(query);
  let best = Infinity;
  for (const target of collectSearchTargets(perfume)) {
    const tPh = phoneticFold(target);
    best = Math.min(best, levenshtein(qPh, tPh));
    best = Math.min(best, levenshtein(q, target));
    for (const word of target.split(/\s+/)) {
      if (word.length >= 1) best = Math.min(best, levenshtein(q, word));
      if (word.length >= 2)
        best = Math.min(best, levenshtein(qPh, phoneticFold(word)));
    }
  }
  return best;
}

/** Suggestions les plus proches de la requête (style « vous cherchez X ? voici Y »). */
export function suggestSimilarPerfumes(
  query: string,
  perfumes: Perfume[],
  limit = 6
): Perfume[] {
  const q = query.trim();
  if (!q) return perfumes.slice(0, limit);
  return [...perfumes]
    .map((p) => ({ p, s: rawDistanceToPerfume(q, p) }))
    .sort((a, b) => a.s - b.s)
    .slice(0, limit)
    .map((x) => x.p);
}

function maxQueryLen(hint: ExternalPerfumeHint): number {
  return Math.max(0, ...hint.queries.map((q) => q.length));
}

export function findExternalPerfumeHint(query: string): ExternalPerfumeHint | null {
  const raw = query.trim();
  if (raw.length < 2) return null;
  const nq = normalizeForFuzzy(raw);
  const tokens = nq.split(/\s+/).filter((t) => t.length >= 2);

  const hintsSorted = [...EXTERNAL_PERFUME_HINTS].sort(
    (a, b) => maxQueryLen(b) - maxQueryLen(a)
  );

  for (const hint of hintsSorted) {
    for (const hqRaw of hint.queries) {
      const hq = normalizeForFuzzy(hqRaw);
      if (hq.length < 2) continue;
      if (nq.includes(hq) || hq.includes(nq)) return hint;
      if (levenshtein(nq, hq) <= Math.min(4, 1 + Math.floor(hq.length / 5)))
        return hint;
      const hqTokens = hq.split(/\s+/).filter((t) => t.length >= 2);
      let overlap = 0;
      for (const t of tokens) {
        if (
          hqTokens.some(
            (ht) =>
              ht.includes(t) ||
              t.includes(ht) ||
              levenshtein(t, ht) <= 2
          )
        )
          overlap++;
      }
      if (tokens.length >= 2 && overlap >= 2) return hint;
      if (tokens.length === 1 && overlap >= 1) return hint;
    }
  }
  return null;
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

export type { ExternalPerfumeHint } from "./externalSearchHints";
export {
  EXTERNAL_PERFUME_HINTS,
  EXTERNAL_SEARCH_FALLBACK_MESSAGE,
} from "./externalSearchHints";
