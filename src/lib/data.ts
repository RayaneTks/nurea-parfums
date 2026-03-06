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
  tags?: string[];
}

export const categories: Category[] = [
  "Tout voir",
  "Gammes Complètes",
  "Sélections Individuelles",
  "Nouveautés",
];

export const allBrands: string[] = [
  "Toutes",
  "Azzaro",
  "Cartier",
  "Creed",
  "Dior",
  "Dolce & Gabbana",
  "Franck Olivier",
  "Guerlain",
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
    image: "/parfums/complete/RABANNE.png",
    tags: ["Gamme complète"],
  },
  {
    id: 2,
    name: "Gamme complète Dior",
    brand: "Dior",
    category: "Gammes Complètes",
    image: "/parfums/complete/DIOR.png",
    tags: ["Gamme complète"],
  },
  {
    id: 3,
    name: "Gamme complète Jean Paul Gaultier",
    brand: "Jean Paul Gaultier",
    category: "Gammes Complètes",
    image: "/parfums/complete/JPG.png",
    tags: ["Gamme complète"],
  },
  {
    id: 4,
    name: "Gamme complète Hermès",
    brand: "Hermès",
    category: "Gammes Complètes",
    image: "/parfums/complete/HERMES.png",
    tags: ["Gamme complète"],
  },
  {
    id: 5,
    name: "Gamme complète Lacoste",
    brand: "Lacoste",
    category: "Gammes Complètes",
    image: "/parfums/complete/LACOSTE.png",
    tags: ["Gamme complète"],
  },
  {
    id: 6,
    name: "Gamme complète Azzaro",
    brand: "Azzaro",
    category: "Gammes Complètes",
    image: "/parfums/complete/AZZARO.png",
    tags: ["Gamme complète"],
  },
  {
    id: 7,
    name: "Gamme complète Guerlain",
    brand: "Guerlain",
    category: "Gammes Complètes",
    image: "/parfums/complete/GUERLAIN.png",
    tags: ["Gamme complète"],
  },
  {
    id: 8,
    name: "Gamme complète Hugo Boss",
    brand: "Hugo Boss",
    category: "Gammes Complètes",
    image: "/parfums/complete/BOSS.png",
    tags: ["Gamme complète"],
  },

  // Sélections individuelles
  {
    id: 9,
    name: "Baccarat Rouge 540",
    brand: "Maison Francis Kurkdjian",
    category: "Sélections Individuelles",
    image: "/parfums/baccarat-rouge.jpeg",
    tags: ["Signature"],
  },
  {
    id: 10,
    name: "Aventus",
    brand: "Creed",
    category: "Sélections Individuelles",
    image: "/parfums/creed-aventus.png",
    tags: ["Iconique"],
  },
  {
    id: 11,
    name: "Eros",
    brand: "Versace",
    category: "Sélections Individuelles",
    image: "/parfums/eros.png",
  },
  {
    id: 12,
    name: "Kirke",
    brand: "Tiziana Terenzi",
    category: "Sélections Individuelles",
    image: "/parfums/kirke.png",
  },
  {
    id: 13,
    name: "Oud Touch",
    brand: "Franck Olivier",
    category: "Sélections Individuelles",
    image: "/parfums/oud-touch.png",
  },
  {
    id: 14,
    name: "Pasha",
    brand: "Cartier",
    category: "Sélections Individuelles",
    image: "/parfums/pasha.png",
  },
  {
    id: 15,
    name: "Sun Java",
    brand: "Franck Olivier",
    category: "Sélections Individuelles",
    image: "/parfums/sun-java.png",
  },
  {
    id: 16,
    name: "Zara Tobacco",
    brand: "Zara",
    category: "Sélections Individuelles",
    image: "/parfums/zara-tobacco.png",
  },

  // Nouveautés
  {
    id: 17,
    name: "MYSLF",
    brand: "Yves Saint Laurent",
    category: "Nouveautés",
    image: "/parfums/myslf.png",
    tags: ["Nouveauté"],
  },
  {
    id: 18,
    name: "Y Elixir",
    brand: "Yves Saint Laurent",
    category: "Nouveautés",
    image: "/parfums/y-elixir.png",
    tags: ["Nouveauté"],
  },
];

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

