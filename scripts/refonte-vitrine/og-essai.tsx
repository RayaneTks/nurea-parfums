// Rend les vignettes de partage (T17) sans serveur ni base : site + fiches du catalogue de démo.
// node_modules/.bin/tsx scripts/refonte-vitrine/og-essai.tsx <dossier-de-sortie> [id-parfum]
import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import demo from "../../src/lib/catalog/demo-catalogue.json";
import { deriveAmbientHex } from "../../src/lib/catalog/ambient";
import { thumbnailOf } from "../../src/lib/images/thumbnails";
import { vignetteParfum, vignetteSite } from "../../app/(shop)/_og/vignettes";

const out = process.argv[2]!;
const save = async (r: Response, n: string) => {
  const b = Buffer.from(await r.arrayBuffer());
  await writeFile(`${out}/${n}.jpg`, b);
  const m = await sharp(b).metadata();
  console.log(n, r.status, r.headers.get("content-type"), m.width, m.height, b.length);
};
await save(await vignetteSite(), "site");
for (const id of [80, 131, Number(process.argv[3] ?? 299)]) {
  const p = (demo as { id: number; name: string; brand: string; image: string; ambientHue: number; ambientChroma: number }[]).find((x) => x.id === id)!;
  const img = await fetch(thumbnailOf(p.image)).then((r) => r.arrayBuffer());
  const png = await sharp(Buffer.from(img)).resize(420, 630, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await save(await vignetteParfum({ marque: p.brand, nom: p.name, visuel: `data:image/png;base64,${png.toString("base64")}`, ambiance: deriveAmbientHex("dark", p.ambientHue, p.ambientChroma) }), `fiche-${id}`);
}
