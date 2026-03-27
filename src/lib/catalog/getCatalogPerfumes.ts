import type { Category, Perfume } from "@/lib/data";
import { unstable_noStore as noStore } from "next/cache";
import { categories, mockPerfumes } from "@/lib/data";
import { prisma } from "@/lib/db/prisma";
import {
  prismaCatalogInCooldown,
  registerPrismaCatalogFailure,
  registerPrismaCatalogSuccess,
} from "@/lib/db/prismaRuntimeCircuit";

function isCategory(s: string): s is Category {
  return (categories as readonly string[]).includes(s);
}

function rowToPerfume(row: {
  id: number;
  name: string;
  image: string;
  imageLight: string | null;
  brand: { name: string; slug: string; catalogMode: "CURATED" | "COMPLETE" };
}): Perfume {
  const cat: Category =
    row.brand.catalogMode === "COMPLETE"
      ? "Gammes Complètes"
      : "Sélections Individuelles";
  if (!isCategory(cat)) {
    throw new Error(`Catégorie catalogue invalide en base : ${cat}`);
  }
  return {
    id: row.id,
    name: row.name,
    brand: row.brand.name,
    brandSlug: row.brand.slug,
    category: cat,
    image: row.image,
    imageLight: row.imageLight ?? undefined,
    tags: row.brand.catalogMode === "COMPLETE" ? ["Gamme complète"] : undefined,
  };
}

/**
 * Catalogue publié : PostgreSQL si `DATABASE_URL`, sinon `mockPerfumes` (comportement actuel).
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
      where: { status: "PUBLISHED", brand: { catalogMode: "CURATED" } },
      include: {
        brand: { select: { name: true, slug: true, catalogMode: true } },
      },
      orderBy: { id: "asc" },
    });
    const rangeBrands = await prisma.brand.findMany({
      where: { catalogMode: "COMPLETE" },
      select: { id: true, name: true, slug: true, image: true },
      orderBy: { name: "asc" },
    });

    const maxId = perfumes.reduce((acc, p) => Math.max(acc, p.id), 0);
    const asPerfumesFromBrands: Perfume[] = rangeBrands
      .filter((b) => Boolean(b.image))
      .map((b, idx) => ({
        id: maxId + idx + 1,
        name: b.name,
        brand: b.name,
        brandSlug: b.slug,
        category: "Gammes Complètes",
        image: b.image!,
        tags: ["Gamme complète"],
      }));

    registerPrismaCatalogSuccess();
    return [...perfumes.map(rowToPerfume), ...asPerfumesFromBrands];
  } catch (e) {
    registerPrismaCatalogFailure();
    console.error("[getCatalogPerfumes] database unavailable:", e);
    return fromMock();
  }
}
