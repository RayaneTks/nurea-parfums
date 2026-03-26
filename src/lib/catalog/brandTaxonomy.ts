import type { Category } from "@/lib/data";
import type { CatalogAssortment, CatalogPositioning } from "@/lib/catalog/catalogBrowseTypes";

/** Maisons typiquement rangées « niche / signatures » dans le seed (modifiable en admin). */
export const SEED_POSITIONING_NICHE = new Set<string>([
  "Aesop",
  "Creed",
  "Maison Francis Kurkdjian",
  "Nishane",
  "Orto Parisi",
  "Sospiro",
  "Tiziana Terenzi",
]);

/** Grandes maisons designer / luxe diffusion (seed par défaut). */
export const SEED_POSITIONING_DESIGNER = new Set<string>([
  "Antonio Banderas",
  "Azzaro",
  "Boucheron",
  "Carolina Herrera",
  "Cartier",
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
  "Rabanne",
  "Ralph Lauren",
  "Tom Ford",
  "Versace",
  "Viktor & Rolf",
  "Yves Saint Laurent",
  "Zara",
]);

export function deriveAssortmentFromPerfumeCategories(categories: string[]): CatalogAssortment {
  if (categories.length === 0) return "UNSET";
  const allGammeComplete = categories.every((c) => c === "Gammes Complètes");
  if (allGammeComplete) return "COMPLETE";
  return "CURATED";
}

export function derivePositioningForSeed(brandName: string): CatalogPositioning {
  if (SEED_POSITIONING_NICHE.has(brandName)) return "NICHE";
  if (SEED_POSITIONING_DESIGNER.has(brandName)) return "DESIGNER";
  return "UNSET";
}

export const BRAND_ASSORTMENT_LABELS: Record<
  CatalogAssortment,
  { title: string; hint: string }
> = {
  UNSET: {
    title: "Non renseigné",
    hint: "À classer depuis l’admin.",
  },
  COMPLETE: {
    title: "Ligne complète",
    hint: "Toute la gamme présentée chez Nurea pour cette maison.",
  },
  CURATED: {
    title: "Sélection maison",
    hint: "Une partie de la ligne seulement — demandez le reste en conciergerie.",
  },
};

export const BRAND_POSITIONING_LABELS: Record<
  CatalogPositioning,
  { title: string; hint: string }
> = {
  UNSET: { title: "Non renseigné", hint: "" },
  NICHE: {
    title: "Niche & signatures",
    hint: "Maisons de parfumerie de création ou ultra-sélectives.",
  },
  DESIGNER: {
    title: "Designer & grandes maisons",
    hint: "Luxe classique et lignes iconiques.",
  },
  ARTISAN: {
    title: "Artisan & indépendant",
    hint: "Ateliers, indépendants, petites productions.",
  },
};

export const BROWSE_COPY = {
  drawerTitle: "Explorer le catalogue",
  drawerSubtitle:
    "Marques, univers et catégories. La barre de recherche textuelle ci-dessous reste inchangée.",
  sectionComplete: "Ligne complète chez Nurea",
  sectionCompleteSub: "Maisons dont nous présentons toute la gamme cataloguée ici.",
  sectionCurated: "Sélection par maison",
  sectionCuratedSub:
    "Références choisies : d’autres jus de la même maison peuvent être demandés via la conciergerie.",
  sectionUnivers: "Par univers",
  sectionCategories: "Par catégorie vitrine",
  sectionCategoriesSub: "Filtrer les créations selon l’emplacement dans la collection.",
  resetPanel: "Effacer filtres du panneau",
  close: "Fermer",
} as const;

export const UNIVERS_QUERY_VALUES = ["niche", "designer", "artisan"] as const;
export type UniversQuery = (typeof UNIVERS_QUERY_VALUES)[number];

export function positioningToQuery(p: CatalogPositioning): UniversQuery | null {
  if (p === "NICHE") return "niche";
  if (p === "DESIGNER") return "designer";
  if (p === "ARTISAN") return "artisan";
  return null;
}

export function queryToPositioning(q: string): CatalogPositioning | null {
  if (q === "niche") return "NICHE";
  if (q === "designer") return "DESIGNER";
  if (q === "artisan") return "ARTISAN";
  return null;
}

export const CATALOG_CATEGORY_FILTERS: Category[] = [
  "Gammes Complètes",
  "Sélections Individuelles",
  "Nouveautés",
];
