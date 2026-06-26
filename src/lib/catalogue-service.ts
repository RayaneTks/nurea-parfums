import { unstable_cache } from "next/cache";
import type { Category, Perfume } from "@/lib/data";
import { mockPerfumes } from "@/lib/data";
import { getBlurPlaceholder } from "@/lib/blurPlaceholder";
import { prisma } from "@/lib/db/prisma";
import {
  prismaCatalogInCooldown,
  registerPrismaCatalogFailure,
  registerPrismaCatalogSuccess,
} from "@/lib/db/prismaRuntimeCircuit";
import type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";
import type {
  AdminBrandRow,
  AdminPerfumeRow,
} from "@/lib/admin/catalogue-types";

/** Cache données catalogue affichées sur le site public. */
export const PUBLIC_CATALOGUE_CACHE_TAG = "public-catalogue";

/** Cache snapshot admin (même invalidation que le public après mutation). */
export const ADMIN_CATALOGUE_CACHE_TAG = "admin-catalogue";

export type CachedPublicCatalogue = {
  perfumes: Perfume[];
  browseBrands: CatalogBrowseBrand[];
};

function perfumesFromMock(): Perfume[] {
  return mockPerfumes.map((p) => ({
    ...p,
    brandSlug: p.brandSlug ?? p.brand.toLowerCase().trim().replace(/\s+/g, "-"),
  }));
}

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

async function loadPublicCatalogFromDb(): Promise<CachedPublicCatalogue> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { perfumes: perfumesFromMock(), browseBrands: browseFromMock() };
  }

  if (prismaCatalogInCooldown()) {
    return { perfumes: perfumesFromMock(), browseBrands: browseFromMock() };
  }

  try {
    const [perfumes, rangeBrands, browseRows] = await Promise.all([
      prisma.perfume.findMany({
        where: {
          status: "PUBLISHED",
          brand: { status: "PUBLISHED" },
          name: { not: "" },
          image: { not: "" },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
          imageLight: true,
          isFeatured: true,
          brand: {
            select: {
              name: true,
              slug: true,
              catalogMode: true,
            },
          },
        },
        orderBy: { id: "asc" },
      }),
      prisma.brand.findMany({
        where: {
          catalogMode: "COMPLETE",
          status: "PUBLISHED",
          name: { not: "" },
          AND: [{ image: { not: null } }, { image: { not: "" } }],
        },
        select: { id: true, name: true, slug: true, image: true, imageLight: true },
        orderBy: { name: "asc" },
      }),
      prisma.brand.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { catalogMode: "COMPLETE" },
            { perfumes: { some: { status: "PUBLISHED" } } },
          ],
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
      }),
    ]);

    const maxId = perfumes.reduce((acc, p) => Math.max(acc, p.id), 0);

    const asPerfumesFromBrands: Perfume[] = rangeBrands
      .filter((b) => {
        const img = b.image?.trim() ?? "";
        return (
          img !== "" &&
          !img.includes("placeholder.svg") &&
          !img.startsWith("/parfums/") &&
          b.name.trim() !== ""
        );
      })
      .map((b, idx) => ({
        id: maxId + idx + 1,
        name: b.name,
        brand: b.name,
        brandSlug: b.slug,
        category: "Gammes Complètes" as const,
        image: b.image!,
        imageLight: b.imageLight ?? undefined,
        blurDataURL: getBlurPlaceholder(b.image),
        tags: ["Gamme complète"],
      }));

    const mappedPerfumes: Perfume[] = perfumes
      .filter((p) => {
        const img = p.image?.trim() ?? "";
        return (
          img !== "" &&
          !img.includes("placeholder.svg") &&
          !img.startsWith("/parfums/") &&
          p.brand.name.trim() !== "" &&
          p.name.trim() !== ""
        );
      })
      .map((p) => {
        const isComplete = p.brand.catalogMode === "COMPLETE";
        return {
          id: p.id,
          name: p.name,
          brand: p.brand.name,
          brandSlug: p.brand.slug,
          category: (isComplete
            ? "Gammes Complètes"
            : "Sélections Individuelles") as Category,
          image: p.image,
          imageLight: p.imageLight ?? undefined,
          blurDataURL: getBlurPlaceholder(p.image),
          isFeatured: p.isFeatured,
          tags: isComplete ? ["Gamme complète"] : undefined,
        };
      });

    const browseBrands: CatalogBrowseBrand[] = browseRows.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      assortment: b.catalogMode,
      publishedCount: b.perfumes.length,
      categories:
        b.catalogMode === "COMPLETE"
          ? ["Gammes Complètes"]
          : ["Sélections Individuelles"],
    }));

    registerPrismaCatalogSuccess();
    return {
      perfumes: [...mappedPerfumes, ...asPerfumesFromBrands],
      browseBrands,
    };
  } catch (e) {
    registerPrismaCatalogFailure();
    console.error("[catalogue-service] public catalogue DB error:", e);
    return { perfumes: perfumesFromMock(), browseBrands: browseFromMock() };
  }
}

const getPublicCatalogueCached = unstable_cache(
  loadPublicCatalogFromDb,
  ["public-catalogue-v1"],
  { tags: [PUBLIC_CATALOGUE_CACHE_TAG] },
);

/**
 * Catalogue public (parfums + panneau Explorer) — une couche Prisma par invalidation du tag
 * `public-catalogue` (ex. après mutation admin).
 */
export async function getCachedCatalogue(): Promise<CachedPublicCatalogue> {
  return getPublicCatalogueCached();
}

async function loadAdminCatalogueFromDb(): Promise<{
  brands: AdminBrandRow[];
  perfumes: AdminPerfumeRow[];
}> {
  const [brands, perfumes] = await Promise.all([
    prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        catalogMode: true,
        status: true,
        image: true,
        imageLight: true,
        _count: { select: { perfumes: true } },
      },
    }),
    prisma.perfume.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        image: true,
        imageLight: true,
        isFeatured: true,
        status: true,
        stock: true,
        brand: {
          select: {
            id: true,
            name: true,
            image: true,
            imageLight: true,
            catalogMode: true,
            status: true,
          },
        },
      },
    }),
  ]);
  return { brands, perfumes };
}

const getAdminCatalogueCached = unstable_cache(
  loadAdminCatalogueFromDb,
  ["admin-catalogue-snapshot-v2"],
  { tags: [ADMIN_CATALOGUE_CACHE_TAG] },
);

/** Snapshot complet marques + parfums pour l’admin (SSR + API catalogue). */
export async function getCachedAdminCatalogue(): Promise<{
  brands: AdminBrandRow[];
  perfumes: AdminPerfumeRow[];
}> {
  return getAdminCatalogueCached();
}
