import type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";
import { getCachedCatalogue } from "@/lib/catalogue-service";

/**
 * Données panneau « Explorer » (même cache que `getCatalogPerfumes`).
 */
export async function getCatalogBrowse(): Promise<CatalogBrowseBrand[]> {
  const { browseBrands } = await getCachedCatalogue();
  return browseBrands;
}

export type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";
