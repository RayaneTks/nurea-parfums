/**
 * `npm run catalogue:references` — la liste des références du catalogue, rangée par marque, en
 * texte brut prêt à envoyer (fournisseur, inventaire). Lecture seule.
 *
 * TOUTES les fiches : en ligne, masquées et sans visuel. Le nom et la marque seulement — ni prix,
 * ni stock, ni statut : la liste peut sortir de la maison. `--statut` ajoute « (pas en ligne) » aux
 * fiches qui ne sont pas visibles sur la vitrine, pour l'usage interne.
 *
 * Cible : `DATABASE_URL`, lue AVANT l'import de Prisma — qui chargerait sinon `.env`, c'est-à-dire
 * la production. Production : `--confirm-host <hôte>` exigé (garde partagée des scripts) ; sans,
 * le message de refus donne l'hôte à recopier.
 *
 *   npx dotenv -e .env -- npm run catalogue:references -- --confirm-host <hôte>
 *   … -- --confirm-host <hôte> --statut --sortie references.txt
 */
import { writeFileSync } from "node:fs";
import { HostRefusedError, assertHostConfirmed } from "./lib/garde-hote";

// Lu avant tout import de @prisma/client.
const DATABASE_URL = process.env.DATABASE_URL;

function argument(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

export type Reference = { brand: string; name: string; online: boolean };

/** Le texte de la liste : marques A→Z en capitales, parfums A→Z dessous. */
export function formatReferences(refs: readonly Reference[], options: { statut: boolean; date: Date }): string {
  const byBrand = new Map<string, Reference[]>();
  for (const ref of refs) {
    const list = byBrand.get(ref.brand) ?? [];
    list.push(ref);
    byBrand.set(ref.brand, list);
  }
  const fr = (a: string, b: string) => a.localeCompare(b, "fr", { sensitivity: "base" });
  const brands = [...byBrand.keys()].sort(fr);
  const jour = options.date.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });

  const lines = [
    `NURÉA PARFUMS — Références au catalogue (${jour})`,
    `${brands.length} marques, ${refs.length} parfums`,
  ];
  for (const brand of brands) {
    const perfumes = byBrand.get(brand)!.sort((a, b) => fr(a.name, b.name));
    lines.push("", `${brand.toLocaleUpperCase("fr-FR")} (${perfumes.length})`);
    for (const p of perfumes) {
      lines.push(`- ${p.name}${options.statut && !p.online ? " (pas en ligne)" : ""}`);
    }
  }
  return lines.join("\n") + "\n";
}

async function main(): Promise<void> {
  const url = assertHostConfirmed(DATABASE_URL, argument("--confirm-host"), "catalogue:references");
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    const rows = await db.perfume.findMany({
      where: { name: { not: "" } },
      select: { name: true, status: true, image: true, brand: { select: { name: true, status: true } } },
    });
    const refs = rows
      .filter((p) => p.name.trim() !== "" && p.brand.name.trim() !== "")
      .map((p) => ({
        brand: p.brand.name.trim(),
        name: p.name.trim(),
        online: p.status === "PUBLISHED" && p.brand.status === "PUBLISHED" && p.image.trim() !== "",
      }));
    const text = formatReferences(refs, { statut: process.argv.includes("--statut"), date: new Date() });
    const sortie = argument("--sortie");
    if (sortie) {
      writeFileSync(sortie, text, "utf8");
      console.log(`Liste écrite dans ${sortie} (${refs.length} parfums).`);
    } else {
      process.stdout.write(text);
    }
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1]?.endsWith("export-references.ts")) {
  main().catch((e: unknown) => {
    console.error(e instanceof HostRefusedError ? e.message : e);
    process.exit(1);
  });
}
