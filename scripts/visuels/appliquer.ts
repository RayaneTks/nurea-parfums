// Usage : npx dotenv -e .env -- npx tsx --conditions=react-server scripts/visuels/appliquer.ts <dossier-travail> [--brouillons] [--apply]  — envoie les WebP + vignettes -640 et met les fiches à jour ; journal de retour arrière dans le dossier. Sans --apply : simulation.
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { publicUrlOf } from "@/server/catalogue/storage";
import { toWebpThumbnail } from "@/server/catalogue/webp";
import { thumbnailOf } from "@/lib/images/thumbnails";

/**
 * Remplacement des visuels (26/09/2026). Sans --apply : simulation. Avec : envoi du WebP sous
 * perfumes/<horodatage>-<aléa>.webp (forme de la gestion), puis mise à jour de la fiche.
 * Les anciens objets ne sont PAS supprimés : leurs URL vont dans le fichier de retour arrière.
 * Chaque visuel envoyé reçoit sa vignette `-640.webp` (OBLIGATOIRE : la vitrine la sert sans vérifier).
 */
const dir = process.argv[2]!;
const apply = process.argv.includes("--apply");
// --brouillons : accepte les fiches masquées (premier visuel d'un parfum qui n'en avait pas).
const drafts = process.argv.includes("--brouillons");
type Step = { target: string; kind: "perfume" | "brand"; id: number | null; slug: string | null; role: "dark" | "light"; out: string };
const plan: Step[] = JSON.parse(readFileSync(`${dir}/plan.json`, "utf8")) as Step[];
const prisma = new PrismaClient();
const bucket = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, ""), process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
}).storage.from(process.env.SUPABASE_STORAGE_BUCKET?.trim() || "catalog");

const stamp = () => `${String(Date.now()).padStart(13, "0")}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;

async function main() {
  const targets = new Map<string, Step[]>();
  for (const s of plan) targets.set(s.target, [...(targets.get(s.target) ?? []), s]);
  const rollback: unknown[] = [];
  let done = 0;
  for (const [target, steps] of targets) {
    const first = steps[0]!;
    const row = first.kind === "perfume"
      ? await prisma.perfume.findUnique({ where: { id: first.id! }, select: { name: true, status: true, image: true, imageLight: true } })
      : await prisma.brand.findUnique({ where: { slug: first.slug! }, select: { name: true, status: true, image: true, imageLight: true } });
    if (!row || (row.status !== "PUBLISHED" && !drafts)) { console.log(`IGNORÉ  ${target} : ${row ? row.status : "introuvable"}`); continue; }
    const data: { image?: string; imageLight?: string } = {};
    for (const s of steps) {
      const path = `perfumes/${stamp()}.webp`;
      if (apply) {
        const bytes = readFileSync(s.out);
        const { error } = await bucket.upload(path, bytes, { contentType: "image/webp", upsert: false, cacheControl: "31536000" });
        if (error) throw new Error(`envoi refusé ${path} : ${error.message}`);
        const thumb = await toWebpThumbnail(bytes);
        const t = await bucket.upload(thumbnailOf(path), thumb.data, { contentType: "image/webp", upsert: false, cacheControl: "31536000" });
        if (t.error) throw new Error(`vignette refusée ${thumbnailOf(path)} : ${t.error.message}`);
      }
      data[s.role === "dark" ? "image" : "imageLight"] = publicUrlOf(path);
    }
    rollback.push({ target, kind: first.kind, id: first.id, slug: first.slug, before: { image: row.image, imageLight: row.imageLight }, after: data });
    console.log(`${apply ? "REMPLACÉ" : "PRÉVU   "} ${target.padEnd(18)} ${row.name.padEnd(28)} ${Object.keys(data).join(" + ")}`);
    if (apply) {
      if (first.kind === "perfume") await prisma.perfume.update({ where: { id: first.id! }, data });
      else await prisma.brand.update({ where: { slug: first.slug! }, data });
    }
    done++;
  }
  if (apply) writeFileSync(`${dir}/retour-arriere-${Date.now()}.json`, JSON.stringify(rollback, null, 1));
  console.log(`\n${apply ? "appliqué" : "simulation"} : ${done} fiche(s)`);
}
main().finally(() => prisma.$disconnect());
