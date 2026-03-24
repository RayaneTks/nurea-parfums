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

/** Retourne true si la requête matche le parfum (exact ou flou : typos, bacarra → Baccarat). */
export function fuzzySearchMatch(perfume: Perfume, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const nq = normalizeForFuzzy(q);
  const nqPh = phoneticFold(q);
  const nqLen = nq.length;
  const targets = collectSearchTargets(perfume);
  const phTargets = targets.map((t) => phoneticFold(t));

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const targetPh = phTargets[i];
    if (target.includes(nq)) return true;
    if (nqPh.length >= 2 && targetPh.includes(nqPh)) return true;
    if (nqLen >= 2 && target.length >= 2) {
      const maxDist = nqLen <= 4 ? 2 : nqLen <= 7 ? 3 : 4;
      if (levenshtein(nq, target) <= maxDist) return true;
      if (levenshtein(nqPh, targetPh) <= maxDist) return true;
      const words = target.split(/\s+/);
      for (const word of words) {
        if (word.length >= 2 && levenshtein(nq, word) <= maxDist) return true;
        if (word.length >= 2 && levenshtein(nqPh, phoneticFold(word)) <= maxDist)
          return true;
      }
    }
  }
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

