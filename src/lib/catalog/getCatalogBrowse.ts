import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import {
  prismaCatalogInCooldown,
  registerPrismaCatalogFailure,
  registerPrismaCatalogSuccess,
} from "@/lib/db/prismaRuntimeCircuit";
import type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";

/**
 * Données pour le panneau « Explorer » : marques publiées, assortiment, univers, catégories.
 */
export async function getCatalogBrowse(): Promise<CatalogBrowseBrand[]> {
  noStore();
  if (!process.env.DATABASE_URL?.trim()) {
    return [];
  }

  if (prismaCatalogInCooldown()) {
    return [];
  }

  try {
    const rows = await prisma.brand.findMany({
      where: { OR: [{ catalogMode: "COMPLETE" }, { perfumes: { some: { status: "PUBLISHED" } } }] },
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
    return [];
  }
}

export type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";
