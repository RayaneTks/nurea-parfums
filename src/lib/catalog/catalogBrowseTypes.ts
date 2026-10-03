import type { Category } from "@/lib/data";

type CatalogAssortment = "UNSET" | "COMPLETE" | "CURATED";

export type CatalogBrowseBrand = {
  id: string;
  name: string;
  slug: string;
  assortment: CatalogAssortment;
  publishedCount: number;
  categories: Category[];
};
