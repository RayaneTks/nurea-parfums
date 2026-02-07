import { categories, fullRangeBrands, perfumes, type Brand, type Perfume } from "@/data/perfumes";

export type GenderFilter = "tous" | "homme" | "femme";

export const SITE_NAME = "Nurea Parfums";
export const SITE_URL = "https://nureaparfums.com";

export const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const slugify = (value: string) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export const searchableCategories = categories.filter((category) => category !== "Tous");

export const perfumeBrands = Array.from(new Set(perfumes.map((perfume) => perfume.brand))).sort((a, b) =>
  a.localeCompare(b, "fr")
);

const categorySlugMap = new Map(searchableCategories.map((category) => [slugify(category), category]));

const fullRangeBrandSlugMap = new Map(
  fullRangeBrands.flatMap((brand) => [
    [brand.id, brand],
    [slugify(brand.name), brand],
  ])
);

const perfumeBrandSlugMap = new Map(perfumeBrands.map((brandName) => [slugify(brandName), brandName]));

export const getCategoryBySlug = (slug: string) => categorySlugMap.get(slug);

export interface ResolvedBrand extends Brand {
  source: "full-range" | "catalog";
}

export const buildProductPath = (perfume: Perfume) =>
  `/parfums/${encodeURIComponent(perfume.brand)}/${encodeURIComponent(perfume.name)}`;

export const buildCategoryPath = (category: string) => `/categories/${slugify(category)}`;

export const buildBrandPath = (brandName: string) => {
  const fullRangeBrand = fullRangeBrands.find((brand) => brand.name === brandName);

  if (fullRangeBrand) {
    return `/marques/${fullRangeBrand.id}`;
  }

  return `/marques/${slugify(brandName)}`;
};

export const resolveBrandFromParam = (brandParam: string): ResolvedBrand | null => {
  const fullRangeMatch = fullRangeBrandSlugMap.get(brandParam);

  if (fullRangeMatch) {
    return {
      ...fullRangeMatch,
      source: "full-range",
    };
  }

  const perfumeBrandName = perfumeBrandSlugMap.get(brandParam);
  if (!perfumeBrandName) {
    return null;
  }

  const perfumeCountByCategory = perfumes
    .filter((perfume) => perfume.brand === perfumeBrandName)
    .reduce<Record<string, number>>((acc, perfume) => {
      acc[perfume.category] = (acc[perfume.category] ?? 0) + 1;
      return acc;
    }, {});

  const dominantCategory =
    Object.entries(perfumeCountByCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Collection";

  return {
    id: slugify(perfumeBrandName),
    name: perfumeBrandName,
    category: dominantCategory,
    fullRange: false,
    source: "catalog",
  };
};

export const toCurrencyDisplay = (value?: string) => value ?? "Prix sur demande";

export const buildCanonicalUrl = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
};
