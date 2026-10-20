// Usage : node scripts/visuels/page.mjs [haut-mini=120] [qualité=45]  — fabrique la page du graphiste en un seul fichier (.tmp/audit-visuels/graphiste/index.html) à partir de data.json et template3.html, à publier sur le MÊME artefact.
// Page du graphiste en un seul fichier léger (le partage public vérifie la page ; 5 Mo échouaient).
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
const [H = "120", Q = "45", HB = "520", QB = "62"] = process.argv.slice(2);
const A = "C:/Users/User/Desktop/nurea-parfums/.tmp/audit-visuels";
const data = JSON.parse(readFileSync(`${A}/data.json`, "utf8"));
const re = async (uri, big) => {
  if (!uri) return uri;
  const buf = Buffer.from(uri.split(",")[1], "base64");
  return `data:image/webp;base64,${(await sharp(buf).resize({ height: Number(big === "ref" ? 200 : big ? HB : H), withoutEnlargement: true }).webp({ quality: Number(big === "ref" ? 50 : big ? QB : Q) }).toBuffer()).toString("base64")}`;
};
const ok = (p) => p.kind === "visuel" && !["dark", "light"].some((k) => p[k]?.verdict === "A_REFAIRE");
const out = [];
for (const p of data) {
  const q = { ...p, refs: await Promise.all((p.refs ?? []).slice(0, 1).map(async (r) => ({ ...r, img: await re(r.img, "ref") }))) };
  q.darkImg = await re(p.darkImg, p.big);
  // Validé : rien à faire, une seule image suffit (la vignette de la liste).
  q.lightImg = ok(p) && !p.big ? null : await re(p.lightImg, p.big);
  if (ok(p)) q.bottleEn = null;
  out.push(q);
}
const json = JSON.stringify(out).replace(/</g, "\u003c");
let t = readFileSync(`${A}/template3.html`, "utf8");
if (!t.includes("<DATA/>")) throw new Error("gabarit sans marqueur");
t = t.replace("<DATA/>", () => `<script id="data" type="application/json">${json}</script>`);
writeFileSync(`${A}/graphiste/index.html`, t);
console.log("taille :", (t.length / 1e6).toFixed(2), "Mo");
