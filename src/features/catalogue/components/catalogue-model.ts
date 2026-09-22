import type { AdminBrandRow, AdminPerfumeRow } from "@/contracts/catalogue";
import { cleNom } from "@/lib/nommage";

/**
 * Filtres et comptes de l'écran Catalogue (06 E15), purs : la liste se filtre sur l'instantané admin
 * déjà chargé, sans aller-retour — la recherche répond à la frappe.
 */

export const CATALOGUE_TABS = ["parfums", "marques", "en-avant"] as const;
export type CatalogueTab = (typeof CATALOGUE_TABS)[number];

export const STOCK_FILTERS = ["bas", "rupture"] as const;
export type StockFilter = (typeof STOCK_FILTERS)[number];

export const VISIBILITY_FILTERS = ["masques"] as const;
export type VisibilityFilter = (typeof VISIBILITY_FILTERS)[number];

export const RANGE_FILTERS = ["complete"] as const;
export type RangeFilter = (typeof RANGE_FILTERS)[number];

/** Mots de la recherche, sans accents ni casse ni ponctuation (« Coco mademoiselle » → coco, mademoiselle). */
export function searchWords(query: string): string[] {
  return query
    .split(/\s+/)
    .map(cleNom)
    .filter((word) => word !== "");
}

/** Tous les mots doivent se trouver dans la clé (`cleNom` du nom et de la marque). */
export function matchesWords(searchKey: string, words: readonly string[]): boolean {
  return words.every((word) => searchKey.includes(word));
}

export type PerfumeFilters = { words: readonly string[]; stock: StockFilter | null; hidden: boolean };

export function filterPerfumes(perfumes: readonly AdminPerfumeRow[], filters: PerfumeFilters): AdminPerfumeRow[] {
  return perfumes.filter(
    (perfume) =>
      matchesWords(perfume.searchKey, filters.words) &&
      (!filters.hidden || perfume.status === "DRAFT") &&
      (filters.stock === null ||
        (filters.stock === "bas" ? perfume.stockStatus === "low" : perfume.stockStatus === "out")),
  );
}

/** Compteurs des chips, sur la recherche en cours : un chip dit ce qu'il ramènerait. */
export function perfumeCounts(perfumes: readonly AdminPerfumeRow[], words: readonly string[]) {
  const matching = perfumes.filter((perfume) => matchesWords(perfume.searchKey, words));
  return {
    total: matching.length,
    hidden: matching.filter((perfume) => perfume.status === "DRAFT").length,
    low: matching.filter((perfume) => perfume.stockStatus === "low").length,
    out: matching.filter((perfume) => perfume.stockStatus === "out").length,
  };
}

export type BrandFilters = { words: readonly string[]; hidden: boolean; complete: boolean };

export function filterBrands(brands: readonly AdminBrandRow[], filters: BrandFilters): AdminBrandRow[] {
  return brands.filter(
    (brand) =>
      matchesWords(brand.searchKey, filters.words) &&
      (!filters.hidden || brand.status === "DRAFT") &&
      (!filters.complete || brand.catalogMode === "COMPLETE"),
  );
}

export function brandCounts(brands: readonly AdminBrandRow[], words: readonly string[]) {
  const matching = brands.filter((brand) => matchesWords(brand.searchKey, words));
  return {
    total: matching.length,
    hidden: matching.filter((brand) => brand.status === "DRAFT").length,
    complete: matching.filter((brand) => brand.catalogMode === "COMPLETE").length,
  };
}

/**
 * Un chip de filtre ne se montre que s'il discrimine (05 §5.3) : ni vide, ni égal à toute la liste —
 * sauf s'il est actif, auquel cas il reste affiché et effaçable.
 */
export function chipShown(count: number, total: number, active: boolean): boolean {
  return active || (count > 0 && count < total);
}

/** Marques des parfums modifiés en dernier, sans doublon : les « récentes » du sélecteur (S05). */
export function recentBrandIds(perfumes: readonly AdminPerfumeRow[], limit = 6): string[] {
  const ordered = [...perfumes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const ids: string[] = [];
  for (const perfume of ordered) {
    if (!ids.includes(perfume.brand.id)) ids.push(perfume.brand.id);
    if (ids.length >= limit) break;
  }
  return ids;
}

/** « nurea-dior-sauvage-story » : reconnaissable dans une pellicule. */
export function fileSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function storyFileName(brandName: string, perfumeName: string, label: string | null): string {
  return ["nurea", fileSlug(brandName), fileSlug(perfumeName), "story", label ? fileSlug(label) : ""].filter(Boolean).join("-");
}

/** « 2 visuels story », « 1 visuel story ». */
export function storyCountLabel(count: number): string {
  return `${count} visuel${count > 1 ? "s" : ""} story`;
}

/** Bilan d'un dépôt de plusieurs visuels (06 E16 zone 7, PC-13). */
export function depositSummary(added: number, refused: readonly string[]): string {
  const addedText = added === 0 ? "Aucun visuel ajouté" : `${added} visuel${added > 1 ? "s ajoutés" : " ajouté"}`;
  if (refused.length === 0) return addedText;
  return `${addedText} · ${refused.length} refusé${refused.length > 1 ? "s" : ""} : ${refused[0]}`;
}
