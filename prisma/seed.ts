import { PrismaClient } from "@prisma/client";
import {
  deriveAssortmentFromPerfumeCategories,
  derivePositioningForSeed,
} from "../src/lib/catalog/brandTaxonomy";
import { mockPerfumes, normalizeForFuzzy } from "../src/lib/data";
import { brandSlug, perfumeSlug } from "../src/lib/slugify";

const prisma = new PrismaClient();

async function main() {
  const brandNames = [...new Set(mockPerfumes.map((p) => p.brand))].sort((a, b) =>
    a.localeCompare(b, "fr")
  );

  const brandIdByName = new Map<string, string>();

  for (const name of brandNames) {
    const slug = brandSlug(name);
    const cats = [
      ...new Set(mockPerfumes.filter((p) => p.brand === name).map((p) => p.category)),
    ];
    const assortment = deriveAssortmentFromPerfumeCategories(cats);
    const positioning = derivePositioningForSeed(name);
    const b = await prisma.brand.upsert({
      where: { name },
      create: { name, slug, assortment, positioning },
      update: { slug, assortment, positioning },
    });
    brandIdByName.set(name, b.id);
  }

  for (const p of mockPerfumes) {
    const brandId = brandIdByName.get(p.brand);
    if (!brandId) throw new Error(`Marque manquante: ${p.brand}`);

    await prisma.perfume.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        brandId,
        name: p.name,
        slug: perfumeSlug(p.id, p.name, p.brand),
        category: p.category,
        image: p.image,
        imageLight: p.imageLight ?? null,
        imageDark: p.imageDark ?? null,
        status: "PUBLISHED",
      },
      update: {
        brandId,
        name: p.name,
        slug: perfumeSlug(p.id, p.name, p.brand),
        category: p.category,
        image: p.image,
        imageLight: p.imageLight ?? null,
        imageDark: p.imageDark ?? null,
      },
    });

    await prisma.perfumeAlias.deleteMany({ where: { perfumeId: p.id } });
    await prisma.perfumeTag.deleteMany({ where: { perfumeId: p.id } });
    await prisma.perfumeClassic.deleteMany({ where: { perfumeId: p.id } });

    if (p.aliases?.length) {
      await prisma.perfumeAlias.createMany({
        data: p.aliases.map((alias) => ({
          perfumeId: p.id,
          alias,
          normalized: normalizeForFuzzy(alias),
        })),
      });
    }
    if (p.tags?.length) {
      await prisma.perfumeTag.createMany({
        data: p.tags.map((tag) => ({ perfumeId: p.id, tag })),
      });
    }
    if (p.classics?.length) {
      await prisma.perfumeClassic.createMany({
        data: p.classics.map((line) => ({ perfumeId: p.id, line })),
      });
    }
  }

  console.log(`Seed OK — ${mockPerfumes.length} parfums, ${brandNames.length} marques.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
