import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import {
  prismaCatalogInCooldown,
  registerPrismaCatalogFailure,
  registerPrismaCatalogSuccess,
} from "@/lib/db/prismaRuntimeCircuit";
import type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";
import type { Category } from "@/lib/data";
import { mockPerfumes } from "@/lib/data";

function browseFromMock(): CatalogBrowseBrand[] {
  const byBrand = new Map<
    string,
    { slug: string; complete: boolean; curatedCount: number }
  >();
  for (const p of mockPerfumes) {
    const key = p.brand;
    const row = byBrand.get(key) ?? {
      slug: p.brand.toLowerCase().trim().replace(/\s+/g, "-"),
      complete: false,
      curatedCount: 0,
    };
    if (p.category === "Gammes Complètes") {
      row.complete = true;
    } else {
      row.curatedCount += 1;
    }
    byBrand.set(key, row);
  }

  return [...byBrand.entries()]
    .map(([name, row]) => ({
      id: row.slug,
      name,
      slug: row.slug,
      assortment: row.complete ? ("COMPLETE" as const) : ("CURATED" as const),
      publishedCount: row.complete ? 0 : row.curatedCount,
      categories: [
        (row.complete ? "Gammes Complètes" : "Sélections Individuelles") as Category,
      ],
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/**
 * Données pour le panneau « Explorer » : marques publiées, assortiment, univers, catégories.
 */
export async function getCatalogBrowse(): Promise<CatalogBrowseBrand[]> {
  noStore();
  if (!process.env.DATABASE_URL?.trim()) {
    return browseFromMock();
  }

  if (prismaCatalogInCooldown()) {
    return browseFromMock();
  }

  try {
    const rows = await prisma.brand.findMany({
      where: {
        status: "PUBLISHED",
        OR: [{ catalogMode: "COMPLETE" }, { perfumes: { some: { status: "PUBLISHED" } } }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        catalogMode: true,
        perfumes: {
          where: { status: "PUBLISHED" },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    });
    registerPrismaCatalogSuccess();
    return rows.map((b) => {
      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        assortment: b.catalogMode,
        publishedCount: b.perfumes.length,
        categories:
          b.catalogMode === "COMPLETE"
            ? ["Gammes Complètes"]
            : ["Sélections Individuelles"],
      };
    });
  } catch (e) {
    registerPrismaCatalogFailure();
    console.error("[getCatalogBrowse] database unavailable:", e);
    return browseFromMock();
  }
}

export type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";
