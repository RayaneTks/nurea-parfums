import { PrismaClient } from "@prisma/client";
import { mockPerfumes } from "../src/lib/data";
import { brandSlug, perfumeSlug } from "../src/lib/slugify";

const prisma = new PrismaClient();

async function main() {
  const brandNames = [...new Set(mockPerfumes.map((p) => p.brand))].sort((a, b) =>
    a.localeCompare(b, "fr")
  );

  const brandIdByName = new Map<string, string>();

  for (const name of brandNames) {
    const slug = brandSlug(name);
    const hasCompleteEntry = mockPerfumes.some(
      (p) => p.brand === name && p.category === "Gammes Complètes",
    );
    const catalogMode = hasCompleteEntry ? "COMPLETE" : "CURATED";
    const b = await prisma.brand.upsert({
      where: { name },
      create: { name, slug, catalogMode },
      update: { slug, catalogMode },
    });
    brandIdByName.set(name, b.id);
  }

  for (const p of mockPerfumes) {
    const brandId = brandIdByName.get(p.brand);
    if (!brandId) throw new Error(`Marque manquante: ${p.brand}`);
    const isRange = p.category === "Gammes Complètes";
    const displayName = isRange ? p.brand : p.name;

    await prisma.perfume.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        brandId,
        name: displayName,
        slug: perfumeSlug(p.id, displayName, p.brand),
        image: p.image,
        imageLight: p.imageLight ?? null,
        status: isRange ? "DRAFT" : "PUBLISHED",
      },
      update: {
        brandId,
        name: displayName,
        slug: perfumeSlug(p.id, displayName, p.brand),
        image: p.image,
        imageLight: p.imageLight ?? null,
        status: isRange ? "DRAFT" : "PUBLISHED",
      },
    });
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
