import {
  EXTERNAL_PERFUME_HINTS,
} from "./externalSearchHints";
import type { ExternalPerfumeHint } from "./externalSearchTypes";

export const CONTACT = {
  whatsapp:
    "https://wa.me/1234567890?text=Bonjour,%20je%20souhaite%20des%20informations%20sur%20un%20parfum",
  snapchat: "https://snapchat.com/add/nureaparfums",
  /** Affichage footer / UI (cohérent avec l’URL snapchat.com/add/…) */
  snapchatHandle: "@nureaparfums",
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
  /** Renseigné par le catalogue serveur (DB / dérivé du nom). */
  brandSlug?: string;
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
  "Carolina Herrera",
  "Cartier",
  "Creed",
  "Dior",
  "Dolce & Gabbana",
  "Franck Olivier",
  "Giorgio Armani",
  "Gucci",
  "Guerlain",
  "Hermès",
  "Hugo Boss",
  "Jean Paul Gaultier",
  "Lacoste",
  "Louis Vuitton",
  "Maison Francis Kurkdjian",
  "Nishane",
  "Orto Parisi",
  "Rabanne",
  "Ralph Lauren",
  "Sospiro",
  "Tiziana Terenzi",
  "Tom Ford",
  "Versace",
  "Viktor & Rolf",
  "Yves Saint Laurent",
  "Zara",
];

export const mockPerfumes: Perfume[] = [
  // Gammes complètes (visuels de marque)
  {
    id: 1,
    name: "Rabanne",
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
    name: "Dior",
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
    name: "Jean Paul Gaultier",
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
    name: "Hermès",
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
    name: "Lacoste",
    brand: "Lacoste",
    category: "Gammes Complètes",
    image: "/parfums/complete/LACOSTE-light.png",
    imageLight: "/parfums/complete/LACOSTE-light.png",
    imageDark: "/parfums/complete/LACOSTE-dark.png",
    tags: ["Gamme complète"],
  },
  {
    id: 6,
    name: "Azzaro",
    brand: "Azzaro",
    category: "Gammes Complètes",
    image: "/parfums/complete/AZZARO-light.png",
    imageLight: "/parfums/complete/AZZARO-light.png",
    imageDark: "/parfums/complete/AZZARO-dark.png",
    tags: ["Gamme complète"],
  },
  {
    id: 7,
    name: "Guerlain",
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
    name: "Hugo Boss",
    brand: "Hugo Boss",
    category: "Gammes Complètes",
    image: "/parfums/complete/BOSS-light.png",
    imageLight: "/parfums/complete/BOSS-light.png",
    imageDark: "/parfums/complete/BOSS-dark.png",
    tags: ["Gamme complète"],
  },
  {
    id: 24,
    name: "Dolce & Gabbana",
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

  {
    id: 27,
    name: "Bad Boy",
    brand: "Carolina Herrera",
    category: "Sélections Individuelles",
    image: "/parfums/bad-boy.webp",
    aliases: ["bad boy", "carolina herrera"],
  },
  {
    id: 28,
    name: "Blue Jeans",
    brand: "Versace",
    category: "Sélections Individuelles",
    image: "/parfums/blue-jeans.webp",
    aliases: ["blue jeans", "versace jeans"],
  },
  {
    id: 29,
    name: "Carat",
    brand: "Cartier",
    category: "Sélections Individuelles",
    image: "/parfums/carat.webp",
    aliases: ["cartier carat"],
  },
  {
    id: 30,
    name: "Déclaration",
    brand: "Cartier",
    category: "Sélections Individuelles",
    image: "/parfums/declaration.webp",
    aliases: ["declaration", "déclaration cartier"],
  },
  {
    id: 31,
    name: "Dylan Blue",
    brand: "Versace",
    category: "Sélections Individuelles",
    image: "/parfums/dylan-blue.webp",
    aliases: ["dylan blue", "dylan versace"],
  },
  {
    id: 32,
    name: "Eau Passion",
    brand: "Antonio Banderas",
    category: "Sélections Individuelles",
    image: "/parfums/eau-passion.webp",
    aliases: ["eau passion", "passion banderas"],
  },
  {
    id: 33,
    name: "Erba Gold",
    brand: "Sospiro",
    category: "Sélections Individuelles",
    image: "/parfums/erba-gold.webp",
    aliases: ["erba gold", "sospiro gold"],
  },
  {
    id: 34,
    name: "Erba Pura",
    brand: "Sospiro",
    category: "Sélections Individuelles",
    image: "/parfums/erba-pura.webp",
    aliases: ["erba pura", "sospiro"],
  },
  {
    id: 35,
    name: "Grand Soir",
    brand: "Maison Francis Kurkdjian",
    category: "Sélections Individuelles",
    image: "/parfums/grand-soir.webp",
    aliases: ["grand soir", "mfk grand"],
  },
  {
    id: 36,
    name: "Gucci Oud",
    brand: "Gucci",
    category: "Sélections Individuelles",
    image: "/parfums/gucci-oud.webp",
    aliases: ["gucci oud", "oud gucci"],
  },
  {
    id: 37,
    name: "La Panthère",
    brand: "Cartier",
    category: "Sélections Individuelles",
    image: "/parfums/la-panthere.webp",
    aliases: ["la panthere", "panthere cartier"],
  },
  {
    id: 38,
    name: "Afternoon Swim",
    brand: "Louis Vuitton",
    category: "Sélections Individuelles",
    image: "/parfums/lv-afternoon.webp",
    aliases: ["afternoon swim", "lv afternoon"],
  },
  {
    id: 39,
    name: "Contre Moi",
    brand: "Louis Vuitton",
    category: "Sélections Individuelles",
    image: "/parfums/lv-contre-moi.webp",
    aliases: ["contre moi", "lv contre"],
  },
  {
    id: 40,
    name: "L'Immensité",
    brand: "Louis Vuitton",
    category: "Sélections Individuelles",
    image: "/parfums/lv-immensite.webp",
    aliases: ["immensite", "immensité", "lv immensité"],
  },
  {
    id: 41,
    name: "Mille Feux",
    brand: "Louis Vuitton",
    category: "Sélections Individuelles",
    image: "/parfums/lv-mille-feux.webp",
    aliases: ["mille feux", "lv mille"],
  },
  {
    id: 42,
    name: "Nuit de Feu",
    brand: "Louis Vuitton",
    category: "Sélections Individuelles",
    image: "/parfums/lv-nuit-feu.webp",
    aliases: ["nuit de feu", "lv nuit"],
  },
  {
    id: 43,
    name: "Sur la Route",
    brand: "Louis Vuitton",
    category: "Sélections Individuelles",
    image: "/parfums/lv-route.webp",
    aliases: ["sur la route", "lv route"],
  },
  {
    id: 44,
    name: "Symphony",
    brand: "Louis Vuitton",
    category: "Sélections Individuelles",
    image: "/parfums/lv-symphony.webp",
    aliases: ["symphony", "lv symphony"],
  },
  {
    id: 45,
    name: "Hacivat",
    brand: "Nishane",
    category: "Sélections Individuelles",
    image: "/parfums/nishane-hacivat.webp",
    aliases: ["hacivat", "nishane"],
  },
  {
    id: 46,
    name: "Tiramisú",
    brand: "Orto Parisi",
    category: "Sélections Individuelles",
    image: "/parfums/orto-parisi.webp",
    aliases: ["orto parisi", "tiramisu", "tiramisú"],
  },
  {
    id: 47,
    name: "Polo Red",
    brand: "Ralph Lauren",
    category: "Sélections Individuelles",
    image: "/parfums/polo-red.webp",
    aliases: ["polo red", "ralph lauren polo"],
  },
  {
    id: 48,
    name: "Spicebomb",
    brand: "Viktor & Rolf",
    category: "Sélections Individuelles",
    image: "/parfums/spicebomb.webp",
    aliases: ["spicebomb", "spice bomb", "viktor rolf"],
  },
  {
    id: 49,
    name: "Sun Java Black",
    brand: "Franck Olivier",
    category: "Sélections Individuelles",
    image: "/parfums/sun-java-black.webp",
    aliases: ["sun java black", "java black"],
  },
  {
    id: 50,
    name: "Sun Java White",
    brand: "Franck Olivier",
    category: "Sélections Individuelles",
    image: "/parfums/sun-java-white.webp",
    aliases: ["sun java white", "java white"],
  },
  {
    id: 51,
    name: "Bitter Peach",
    brand: "Tom Ford",
    category: "Sélections Individuelles",
    image: "/parfums/tf-bitter-peach.webp",
    aliases: ["bitter peach", "tf peach"],
  },
  {
    id: 52,
    name: "Black Orchid",
    brand: "Tom Ford",
    category: "Sélections Individuelles",
    image: "/parfums/tf-black-orchid.webp",
    aliases: ["black orchid", "orchid tom ford"],
  },
  {
    id: 53,
    name: "Café Rose",
    brand: "Tom Ford",
    category: "Sélections Individuelles",
    image: "/parfums/tf-cafe-rose.webp",
    aliases: ["cafe rose", "café rose", "tom ford rose"],
  },
  {
    id: 54,
    name: "Neroli Portofino",
    brand: "Tom Ford",
    category: "Sélections Individuelles",
    image: "/parfums/tf-neroli.webp",
    aliases: ["neroli", "portofino", "neroli portofino"],
  },
  {
    id: 55,
    name: "Soleil Blanc",
    brand: "Tom Ford",
    category: "Sélections Individuelles",
    image: "/parfums/tf-soleil-blanc.webp",
    aliases: ["soleil blanc", "soleil tom ford"],
  },
  {
    id: 56,
    name: "Tobacco Vanille",
    brand: "Tom Ford",
    category: "Sélections Individuelles",
    image: "/parfums/tf-tobacco-vanille.webp",
    aliases: ["tobacco vanille", "tobacco vanilla", "tv tom ford"],
  },
  {
    id: 57,
    name: "Vanille Fatale",
    brand: "Tom Ford",
    category: "Sélections Individuelles",
    image: "/parfums/tf-vanille-fatale.webp",
    aliases: ["vanille fatale", "vanilla fatale"],
  },
  {
    id: 58,
    name: "Velvet Orchid",
    brand: "Tom Ford",
    category: "Sélections Individuelles",
    image: "/parfums/tf-velvet-orchid.webp",
    aliases: ["velvet orchid", "orchid velvet"],
  },
  {
    id: 59,
    name: "The Dreamer",
    brand: "Versace",
    category: "Sélections Individuelles",
    image: "/parfums/the-dreamer.webp",
    aliases: ["the dreamer", "dreamer versace"],
  },
];

export const getPerfumeImage = (
  perfume: Perfume,
  theme?: "light" | "dark"
): string => {
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

/** Articles / liaisons souvent tapés dans la requête mais non discriminants pour le catalogue. */
const QUERY_STOP_WORDS = new Set([
  "de",
  "la",
  "le",
  "les",
  "du",
  "des",
  "un",
  "une",
  "et",
  "ou",
  "à",
  "a",
  "en",
  "au",
  "aux",
  "d",
  "l",
  "the",
  "of",
  "and",
  "par",
  "pour",
  "sur",
]);

function extractQueryTokens(query: string): string[] {
  return normalizeForFuzzy(query)
    .split(/\s+/)
    .map((t) => t.replace(/[''\u2019]/g, ""))
    .filter((t) => t.length > 0 && !QUERY_STOP_WORDS.has(t));
}

/** Distance max d’édition (typo / phonétique) entre deux mots, selon leur longueur commune. */
function maxDistForWordPair(token: string, word: string): number {
  const n = Math.min(token.length, word.length);
  if (n <= 3) return 1;
  if (n <= 6) return 2;
  if (n <= 12) return 3;
  return 4;
}

function matchesSingleCharQuery(
  perfume: Perfume,
  char: string,
  haystack: string
): boolean {
  const name = normalizeForFuzzy(perfume.name);
  const brand = normalizeForFuzzy(perfume.brand);
  const words = haystack.split(/\s+/);
  return (
    name === char ||
    brand === char ||
    words.includes(char) ||
    (char.length === 1 && name === char)
  );
}

/** Un mot de la requête doit correspondre au moins à un mot indexable (sous-chaîne ≥3, typo ou phonétique). */
function tokenMatchesCatalogToken(
  token: string,
  haystack: string,
  hayPh: string
): boolean {
  if (token.length < 2) return false;
  if (token.length >= 3 && haystack.includes(token)) return true;
  const tPh = phoneticFold(token);
  if (token.length >= 4 && hayPh.includes(tPh)) return true;

  const words = haystack.split(/\s+/).filter((w) => w.length > 0);
  for (const w of words) {
    if (w.length < 2 && token.length >= 2) continue;
    if (w === token) return true;
    const cap = maxDistForWordPair(token, w);
    if (levenshtein(token, w) <= cap) return true;
    if (levenshtein(tPh, phoneticFold(w)) <= cap) return true;
  }
  return false;
}

/**
 * Recherche catalogue : nom, marque, tags, alias, classiques.
 * — Phrase entière ou partie (includes).
 * — Plusieurs mots : **tous** les mots significatifs doivent matcher (évite les faux positifs sur chaînes aléatoires).
 * — Tolérance aux fautes / phonétique par mot.
 */
export function fuzzySearchMatch(perfume: Perfume, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const haystack = combinedSearchHaystack(perfume);
  const nq = normalizeForFuzzy(q).replace(/\s+/g, " ");
  const hayPh = phoneticFold(haystack);
  const nqPh = phoneticFold(q);

  if (nq.length >= 2 && haystack.includes(nq)) return true;
  if (nqPh.length >= 3 && hayPh.includes(nqPh)) return true;

  const tokens = extractQueryTokens(q);
  const compact = q.replace(/\s+/g, " ").trim();
  if (compact.length === 1 && /^[a-z0-9]$/i.test(compact)) {
    return matchesSingleCharQuery(
      perfume,
      normalizeForFuzzy(compact),
      haystack
    );
  }

  if (tokens.length === 0) return true;

  for (const t of tokens) {
    if (!tokenMatchesCatalogToken(t, haystack, hayPh)) return false;
  }
  return true;
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

/** Correspondance mot ↔ mot pour les entrées hors catalogue (un peu plus souple que le catalogue). */
function tokenMatchesExternalWord(a: string, b: string): boolean {
  if (a.length < 2 || b.length < 2) return false;
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))) return true;
  return levenshtein(a, b) <= maxDistForWordPair(a, b);
}

/**
 * Score 0–100 : requête utilisateur ↔ une variante de requête d’une entrée hors catalogue.
 */
function scoreExternalQueryPair(nq: string, hq: string): number {
  if (hq.length < 2) return 0;
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

/**
 * Meilleure entrée hors catalogue pour la requête, avec seuil de confiance
 * (évite d’associer une chaîne aléatoire à un parfum connu).
 */
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
