// Usage : npx dotenv -e .env -- npx tsx --conditions=react-server scripts/visuels/convertir.ts <dossier-images> <dossier-travail>  — lit mapping.json, écrit out/p<id>-dark|light.webp (1024×1536, sombre = le plus foncé) et plan.json.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { toWebp } from "@/server/catalogue/webp";

const [src, dir] = process.argv.slice(2) as [string, string];
const meta: { n: number; file: string; w: number; h: number }[] = JSON.parse(readFileSync(`${dir}/meta.json`, "utf8")) as { n: number; file: string; w: number; h: number }[];
const mapping: { imgs: number[]; kind: "perfume" | "brand"; id?: number; slug?: string }[] = JSON.parse(readFileSync(`${dir}/mapping.json`, "utf8")) as { imgs: number[]; kind: "perfume" | "brand"; id?: number; slug?: string }[];
mkdirSync(`${dir}/out`, { recursive: true });

async function luminance(file: string): Promise<number> {
  const { channels } = await sharp(file).stats();
  return 0.2126 * channels[0]!.mean + 0.7152 * channels[1]!.mean + 0.0722 * channels[2]!.mean;
}

const plan = [];
for (const m of mapping) {
  const imgs = await Promise.all(m.imgs.map(async (n) => {
    const e = meta.find((x) => x.n === n)!;
    return { n, file: `${src}/${e.file}`, w: e.w, h: e.h, lum: await luminance(`${src}/${e.file}`) };
  }));
  imgs.sort((a, b) => a.lum - b.lum); // le plus sombre d'abord
  const roles = imgs.length === 1 ? [["dark", imgs[0]!]] : [["dark", imgs[0]!], ["light", imgs[1]!]];
  const target = m.kind === "perfume" ? `p${m.id}` : `b-${m.slug}`;
  for (const [role, img] of roles as [string, typeof imgs[number]][]) {
    const webp = await toWebp(readFileSync(img.file), "parfum");
    const out = `${dir}/out/${target}-${role}.webp`;
    writeFileSync(out, webp.data);
    plan.push({ target, kind: m.kind, id: m.id ?? null, slug: m.slug ?? null, role, n: img.n, source: img.file, srcSize: `${img.w}x${img.h}`, lum: Math.round(img.lum), out, bytes: webp.bytes, lowRes: img.w < 1000 || img.h < 1400 });
  }
}
writeFileSync(`${dir}/plan.json`, JSON.stringify(plan, null, 1));
console.log("conversions:", plan.length, "| basse définition:", plan.filter((p) => p.lowRes).map((p) => `${p.target}-${p.role}(#${p.n} ${p.srcSize})`).join(", ") || "aucune");
