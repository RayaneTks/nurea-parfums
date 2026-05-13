import { PrismaClient } from "@prisma/client";
import { mockPerfumes } from "../src/lib/data";
import { brandSlug, perfumeSlug } from "../src/lib/slugify";

const prisma = new PrismaClient();

async function main() {
  const completeEntryByBrand = new Map(
    mockPerfumes
      .filter((p) => p.category === "Gammes Complètes")
      .map((p) => [p.brand, p] as const),
  );

  const brandNames = [...new Set(mockPerfumes.map((p) => p.brand))].sort((a, b) =>
    a.localeCompare(b, "fr")
  );

  const brandIdByName = new Map<string, string>();

  for (const name of brandNames) {
    const slug = brandSlug(name);
    const completeEntry = completeEntryByBrand.get(name);
    const hasCompleteEntry = Boolean(completeEntry);
    const catalogMode = hasCompleteEntry ? "COMPLETE" : "CURATED";
    const b = await prisma.brand.upsert({
      where: { name },
      create: {
        name,
        slug,
        catalogMode,
        image: completeEntry?.image ?? null,
      },
      update: {
        slug,
        catalogMode,
        image: completeEntry?.image ?? null,
      },
    });
    brandIdByName.set(name, b.id);
  }

  // Une marque "Gamme complète" ne doit pas exposer de parfums individuels.
  await prisma.perfume.deleteMany({
    where: {
      brand: { catalogMode: "COMPLETE" },
    },
  });

  let seededPerfumes = 0;
  for (const p of mockPerfumes) {
    if (p.category === "Gammes Complètes") continue;
    const brandId = brandIdByName.get(p.brand);
    if (!brandId) throw new Error(`Marque manquante: ${p.brand}`);
    const displayName = p.name;

    await prisma.perfume.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        brandId,
        name: displayName,
        slug: perfumeSlug(p.id, displayName, p.brand),
        image: p.image,
        imageLight: p.imageLight ?? null,
        status: "PUBLISHED",
      },
      update: {
        brandId,
        name: displayName,
        slug: perfumeSlug(p.id, displayName, p.brand),
        image: p.image,
        imageLight: p.imageLight ?? null,
        status: "PUBLISHED",
      },
    });
    seededPerfumes += 1;
  }

  const completeCount = [...completeEntryByBrand.keys()].length;
  console.log(
    `Seed OK — ${seededPerfumes} parfums, ${brandNames.length} marques (${completeCount} en gamme complète).`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
