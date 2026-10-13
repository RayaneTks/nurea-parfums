import { PrismaClient } from "@prisma/client";
import { mockPerfumes } from "../src/lib/data";
import { brandSlug } from "../src/lib/slugify";

const prisma = new PrismaClient();

async function main() {
  const brandNames = [...new Set(mockPerfumes.map((p) => p.brand))].sort((a, b) =>
    a.localeCompare(b, "fr")
  );

  const brandIdByName = new Map<string, string>();

  for (const name of brandNames) {
    const slug = brandSlug(name);
    const catalogMode = "CURATED";
    const b = await prisma.brand.upsert({
      where: { name },
      create: {
        name,
        slug,
        catalogMode,
        image: null,
      },
      update: {
        slug,
        catalogMode,
      },
    });
    brandIdByName.set(name, b.id);
  }

  let seededPerfumes = 0;
  for (const p of mockPerfumes) {
    const brandId = brandIdByName.get(p.brand);
    if (!brandId) throw new Error(`Marque manquante: ${p.brand}`);
    const displayName = p.name;

    await prisma.perfume.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        brandId,
        name: displayName,
        image: p.image,
        imageLight: p.imageLight ?? null,
        status: "PUBLISHED",
      },
      update: {
        brandId,
        name: displayName,
        image: p.image,
        imageLight: p.imageLight ?? null,
        status: "PUBLISHED",
      },
    });
    seededPerfumes += 1;
  }

  console.log(`Seed OK — ${seededPerfumes} parfums, ${brandNames.length} marques.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
