import type { Category } from "@/lib/data";

export type CatalogAssortment = "UNSET" | "COMPLETE" | "CURATED";
export type CatalogPositioning = "UNSET" | "NICHE" | "DESIGNER" | "ARTISAN";

export type CatalogBrowseBrand = {
  id: string;
  name: string;
  slug: string;
  assortment: CatalogAssortment;
  positioning: CatalogPositioning;
  publishedCount: number;
  categories: Category[];
};
