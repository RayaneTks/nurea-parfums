import type { Category, Perfume } from "@/lib/data";
import { categories, mockPerfumes } from "@/lib/data";
import { prisma } from "@/lib/db/prisma";
import { brandSlug as slugForBrand } from "@/lib/slugify";
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
  category: string;
  image: string;
  imageLight: string | null;
  imageDark: string | null;
  brand: { name: string; slug: string };
  aliases: { alias: string }[];
  tags: { tag: string }[];
  classics: { line: string }[];
}): Perfume {
  const cat = row.category;
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
    imageDark: row.imageDark ?? undefined,
    tags: row.tags.length ? row.tags.map((t) => t.tag) : undefined,
    aliases: row.aliases.length ? row.aliases.map((a) => a.alias) : undefined,
    classics: row.classics.length ? row.classics.map((c) => c.line) : undefined,
  };
}

/**
 * Catalogue publié : PostgreSQL si `DATABASE_URL`, sinon `mockPerfumes` (comportement actuel).
 */
export async function getCatalogPerfumes(): Promise<Perfume[]> {
  const fromMock = (): Perfume[] =>
    mockPerfumes.map((p) => ({ ...p, brandSlug: slugForBrand(p.brand) }));

  if (!process.env.DATABASE_URL?.trim()) {
    return fromMock();
  }

  if (prismaCatalogInCooldown()) {
    return fromMock();
  }

  try {
    const rows = await prisma.perfume.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
      },
      include: {
        brand: true,
        aliases: true,
        tags: true,
        classics: true,
      },
      orderBy: { id: "asc" },
    });
    registerPrismaCatalogSuccess();
    return rows.map(rowToPerfume);
  } catch (e) {
    registerPrismaCatalogFailure();
    console.error("[getCatalogPerfumes] fallback mock:", e);
    return fromMock();
  }
}
