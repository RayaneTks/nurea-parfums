import type { AdminBrandRow, AdminPerfumeRow } from "@/lib/admin/catalogue-types";

export type CatalogueTab = "perfumes" | "brands" | "featured";

/** Filtre unique appliqué à la liste courante — jamais deux filtres cumulés. */
export type PerfumeFilter = "all" | "published" | "draft" | "lowStock";
export type BrandFilter = "all" | "complete" | "curated" | "published" | "draft";

export type { AdminBrandRow, AdminPerfumeRow };

export const PERFUME_FILTERS: readonly PerfumeFilter[] = [
  "all",
  "published",
  "draft",
  "lowStock",
];

export const BRAND_FILTERS: readonly BrandFilter[] = [
  "all",
  "published",
  "draft",
  "complete",
  "curated",
];

export function parsePerfumeFilter(v: string | null | undefined): PerfumeFilter {
  return PERFUME_FILTERS.includes(v as PerfumeFilter) ? (v as PerfumeFilter) : "all";
}

export function parseBrandFilter(v: string | null | undefined): BrandFilter {
  return BRAND_FILTERS.includes(v as BrandFilter) ? (v as BrandFilter) : "all";
}

export function parseTab(v: string | null | undefined): CatalogueTab {
  return v === "brands" || v === "featured" ? v : "perfumes";
}

/** Nombre maximum de parfums mis en avant sur la vitrine. */
export const FEATURED_LIMIT = 2;
