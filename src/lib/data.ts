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
  const nqLen = nq.length;
  const targets = [
    normalizeForFuzzy(perfume.name),
    normalizeForFuzzy(perfume.brand),
    ...(perfume.tags ?? []).map((t) => normalizeForFuzzy(t)),
    ...(perfume.aliases ?? []).map((a) => normalizeForFuzzy(a)),
  ];
  for (const target of targets) {
    if (target.includes(nq)) return true;
    if (nqLen >= 3 && target.length >= 2) {
      const maxDist = nqLen <= 4 ? 1 : nqLen <= 7 ? 2 : 3;
      if (levenshtein(nq, target) <= maxDist) return true;
      const words = target.split(/\s+/);
      for (const word of words) {
        if (word.length >= 2 && levenshtein(nq, word) <= maxDist) return true;
      }
    }
  }
  return false;
}

