import type { Category } from "@/lib/data";
import type { CatalogAssortment, CatalogPositioning } from "@/lib/catalog/catalogBrowseTypes";

export const SEED_POSITIONING_NICHE = new Set<string>([
  "Aesop",
  "Creed",
  "Maison Francis Kurkdjian",
  "Nishane",
  "Orto Parisi",
  "Sospiro",
  "Tiziana Terenzi",
]);

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
    hint: "",
  },
  COMPLETE: {
    title: "Gamme complète",
    hint: "Toute la gamme est disponible.",
  },
  CURATED: {
    title: "Parfums sélectionnés",
    hint: "Une partie de la gamme est affichée.",
  },
};

export const BRAND_POSITIONING_LABELS: Record<
  CatalogPositioning,
  { title: string; hint: string }
> = {
  UNSET: { title: "Non renseigné", hint: "" },
  NICHE: {
    title: "Niche",
    hint: "Parfumerie de niche et créations exclusives.",
  },
  DESIGNER: {
    title: "Marque",
    hint: "Grandes marques et lignes iconiques.",
  },
  ARTISAN: {
    title: "Artisan",
    hint: "Ateliers et productions indépendantes.",
  },
};

export const BROWSE_COPY = {
  drawerTitle: "Filtrer",
  drawerSubtitle: "Par marque et par type.",
  sectionComplete: "Gamme complète",
  sectionCompleteSub: "Toute la gamme est disponible.",
  sectionCurated: "Parfums sélectionnés",
  sectionCuratedSub:
    "Une partie de la gamme — demandez le reste en conciergerie.",
  sectionUnivers: "Par type",
  sectionCategories: "Par catégorie",
  sectionCategoriesSub: "Filtrer par emplacement dans la collection.",
  resetPanel: "Réinitialiser",
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
