import { mockPerfumes, categories, type Category } from "@/lib/data";
import { prisma } from "@/lib/db/prisma";
import {
  prismaCatalogInCooldown,
  registerPrismaCatalogFailure,
  registerPrismaCatalogSuccess,
} from "@/lib/db/prismaRuntimeCircuit";
import {
  deriveAssortmentFromPerfumeCategories,
  derivePositioningForSeed,
} from "@/lib/catalog/brandTaxonomy";
import type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";
import { brandSlug } from "@/lib/slugify";

function isCategory(s: string): s is Category {
  return (categories as readonly string[]).includes(s);
}

function browseFromMock(): CatalogBrowseBrand[] {
  const byBrand = new Map<string, { categories: Set<string>; count: number }>();
  for (const p of mockPerfumes) {
    const cur = byBrand.get(p.brand) ?? { categories: new Set<string>(), count: 0 };
    cur.categories.add(p.category);
    cur.count += 1;
    byBrand.set(p.brand, cur);
  }
  const rows: CatalogBrowseBrand[] = [];
  for (const [name, { categories: cats, count }] of byBrand) {
    const catList = [...cats].filter(isCategory);
    const slug = brandSlug(name);
    rows.push({
      id: `mock:${slug}`,
      name,
      slug,
      assortment: deriveAssortmentFromPerfumeCategories(catList),
      positioning: derivePositioningForSeed(name),
      publishedCount: count,
      categories: catList.sort((x, y) => x.localeCompare(y, "fr")),
    });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return rows;
}

/**
 * Données pour le panneau « Explorer » : marques publiées, assortiment, univers, catégories.
 */
export async function getCatalogBrowse(): Promise<CatalogBrowseBrand[]> {
  if (!process.env.DATABASE_URL?.trim()) {
    return browseFromMock();
  }

  if (prismaCatalogInCooldown()) {
    return browseFromMock();
  }

  try {
    const rows = await prisma.brand.findMany({
      where: {
        perfumes: {
          some: { status: "PUBLISHED", deletedAt: null },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        assortment: true,
        positioning: true,
        perfumes: {
          where: { status: "PUBLISHED", deletedAt: null },
          select: { category: true },
        },
      },
      orderBy: { name: "asc" },
    });
    registerPrismaCatalogSuccess();
    return rows.map((b) => {
      const catSet = new Set<string>();
      for (const p of b.perfumes) catSet.add(p.category);
      const catList = [...catSet].filter(isCategory);
      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        assortment: b.assortment,
        positioning: b.positioning,
        publishedCount: b.perfumes.length,
        categories: catList.sort((x, y) => x.localeCompare(y, "fr")),
      };
    });
  } catch (e) {
    registerPrismaCatalogFailure();
    console.error("[getCatalogBrowse] fallback mock:", e);
    return browseFromMock();
  }
}

export type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";
