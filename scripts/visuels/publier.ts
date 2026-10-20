// Usage : npx dotenv -e .env -- npx tsx scripts/visuels/publier.ts <ids.json> [--apply]  — passe en ligne les fiches DRAFT qui ont un visuel ET une marque PUBLISHED ; journal dans .tmp/retours-arriere/.
import { readFileSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
// Publie les parfums en brouillon qui viennent de recevoir leur premier visuel (image sombre posée),
// seulement si leur marque est en ligne. Sans --apply : simulation. Écrit un fichier de retour arrière.
const ids: number[] = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as number[];
const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();
const back = [];
for (const id of ids) {
  const p = await prisma.perfume.findUniqueOrThrow({ where: { id }, select: { id: true, name: true, status: true, image: true, brand: { select: { name: true, status: true } } } });
  if (p.status === "PUBLISHED") { console.log("déjà en ligne", id, p.name); continue; }
  if (!p.image) { console.log("SANS IMAGE, laissé masqué", id, p.name); continue; }
  if (p.brand.status !== "PUBLISHED") { console.log("MARQUE MASQUÉE, laissé masqué", id, p.brand.name, p.name); continue; }
  if (apply) await prisma.perfume.update({ where: { id }, data: { status: "PUBLISHED" } });
  back.push({ id, before: "DRAFT", after: "PUBLISHED" });
  console.log(apply ? "PUBLIÉ" : "PRÉVU", id, p.brand.name, p.name);
}
if (apply && back.length) writeFileSync(`.tmp/retours-arriere/publication-${Date.now()}.json`, JSON.stringify(back, null, 1));
await prisma.$disconnect();
