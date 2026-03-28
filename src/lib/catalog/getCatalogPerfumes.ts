import type { Category, Perfume } from "@/lib/data";
import { unstable_noStore as noStore } from "next/cache";
import { categories, mockPerfumes } from "@/lib/data";
import { prisma } from "@/lib/db/prisma";
import { getBlurPlaceholder } from "@/lib/blurPlaceholder";
import {
  prismaCatalogInCooldown,
  registerPrismaCatalogFailure,
  registerPrismaCatalogSuccess,
} from "@/lib/db/prismaRuntimeCircuit";

function isCategory(s: string): s is Category {
  return (categories as readonly string[]).includes(s);
}

/**
 * Catalogue publié : PostgreSQL si `DATABASE_URL`, sinon `mockPerfumes` (vide désormais).
 */
export async function getCatalogPerfumes(): Promise<Perfume[]> {
  noStore();
  const fromMock = (): Perfume[] =>
    mockPerfumes.map((p) => ({
      ...p,
      brandSlug: p.brandSlug ?? p.brand.toLowerCase().trim().replace(/\s+/g, "-"),
    }));

  if (!process.env.DATABASE_URL?.trim()) {
    return fromMock();
  }

  if (prismaCatalogInCooldown()) {
    return fromMock();
  }

  try {
    const perfumes = await prisma.perfume.findMany({
      where: { status: "PUBLISHED", brand: { status: "PUBLISHED" } },
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
            catalogMode: true
          }
        }
      },
      orderBy: { id: "asc" },
    });

    const rangeBrands = await prisma.brand.findMany({
      where: { catalogMode: "COMPLETE", status: "PUBLISHED" },
      select: { id: true, name: true, slug: true, image: true, imageLight: true },
      orderBy: { name: "asc" },
    });

    const maxId = perfumes.reduce((acc, p) => Math.max(acc, p.id), 0);
    
    // 1. Transformation des marques en "Gammes Complètes"
    const asPerfumesFromBrands: Perfume[] = rangeBrands
      .filter((b) => Boolean(b.image))
      .map((b, idx) => ({
        id: maxId + idx + 1,
        name: b.name,
        brand: b.name,
        brandSlug: b.slug,
        category: "Gammes Complètes",
        image: b.image!,
        imageLight: b.imageLight ?? undefined,
        blurDataURL: getBlurPlaceholder(b.image),
        tags: ["Gamme complète"],
      }));

    // 2. Transformation des parfums individuels
    const mappedPerfumes: Perfume[] = perfumes.map(p => {
      const isComplete = p.brand.catalogMode === "COMPLETE";
      return {
        id: p.id,
        name: p.name,
        brand: p.brand.name,
        brandSlug: p.brand.slug,
        category: isComplete ? "Gammes Complètes" : "Sélections Individuelles",
        image: p.image,
        imageLight: p.imageLight ?? undefined,
        blurDataURL: getBlurPlaceholder(p.image),
        isFeatured: p.isFeatured,
        tags: isComplete ? ["Gamme complète"] : undefined,
      };
    });

    registerPrismaCatalogSuccess();
    return [...mappedPerfumes, ...asPerfumesFromBrands];
  } catch (e: any) {
    registerPrismaCatalogFailure();
    console.error("[getCatalogPerfumes] database error:", e);
    return fromMock();
  }
}
