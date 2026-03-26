import { PrismaClient } from "@prisma/client";
import { mockPerfumes, normalizeForFuzzy } from "../src/lib/data";

const prisma = new PrismaClient();

function slugifySegment(s: string): string {
  const x = normalizeForFuzzy(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return x || "x";
}

function brandSlug(name: string): string {
  return slugifySegment(name);
}

function perfumeSlug(id: number, name: string, brandName: string): string {
  return `p-${id}-${slugifySegment(brandName)}-${slugifySegment(name)}`.slice(0, 180);
}

async function main() {
  const brandNames = [...new Set(mockPerfumes.map((p) => p.brand))].sort((a, b) =>
    a.localeCompare(b, "fr")
  );

  const brandIdByName = new Map<string, string>();

  for (const name of brandNames) {
    const slug = brandSlug(name);
    const b = await prisma.brand.upsert({
      where: { name },
      create: { name, slug },
      update: { slug },
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
