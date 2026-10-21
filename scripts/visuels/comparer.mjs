// Usage : node scripts/visuels/comparer.mjs <dossier-travail>  — planches RÉF | NOUVEAU SOMBRE | CLAIR | EN LIGNE par parfum + 5 lots JSON pour la relecture. Lit catalogue.json, mapping.json et .tmp/audit-visuels/data.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import sharp from "sharp";
const [D] = process.argv.slice(2);
const A = "C:/Users/User/Desktop/nurea-parfums/.tmp/audit-visuels";
const data = JSON.parse(readFileSync(`${A}/data.json`, "utf8"));
const cat = JSON.parse(readFileSync(`${D}/catalogue.json`, "utf8"));
const mapping = JSON.parse(readFileSync(`${D}/mapping.json`, "utf8"));
mkdirSync(`${D}/cmp`, { recursive: true }); mkdirSync(`${D}/live`, { recursive: true });
const H = 640; const lots = [];
for (const m of mapping) {
  const t = `p${m.id}`; const row = cat.find((p) => p.id === m.id); const e = data.find((x) => String(x.id) === String(m.id));
  const parts = [], labels = [];
  const refs = (e?.refs ?? []).filter((r) => r.img);
  for (const r of refs) { parts.push(await sharp(Buffer.from(r.img.split(",")[1], "base64")).resize({ height: H }).flatten({ background: "#fff" }).png().toBuffer()); labels.push("RÉF"); }
  const supplier = row.image && Number((row.image.match(/perfumes\/(\d+)-/) || [])[1]) >= 1791800000000;
  if (supplier) { const b = Buffer.from(await (await fetch(row.image)).arrayBuffer()); parts.push(await sharp(b).resize({ height: H }).flatten({ background: "#fff" }).png().toBuffer()); labels.push("RÉF FOURNISSEUR"); }
  for (const r of ["dark", "light"]) { const f = `${D}/out/${t}-${r}.webp`; if (existsSync(f)) { parts.push(await sharp(f).resize({ height: H }).png().toBuffer()); labels.push(`NOUVEAU ${r === "dark" ? "SOMBRE" : "CLAIR"}`); } }
  if (!supplier && row.image) for (const r of ["dark", "light"]) { const u = r === "dark" ? row.image : row.imageLight; if (!u) continue; const f = `${D}/live/${t}-${r}.webp`; const b = Buffer.from(await (await fetch(u.replace(/\.webp$/, "-640.webp")).then((x) => (x.ok ? x : fetch(u)))).arrayBuffer()); writeFileSync(f, b); parts.push(await sharp(f).resize({ height: H }).png().toBuffer()); labels.push(`EN LIGNE ${r === "dark" ? "SOMBRE" : "CLAIR"}`); }
  let x = 0; const comp = [];
  for (const [i, p] of parts.entries()) { const mt = await sharp(p).metadata(); const L = labels[i]; comp.push({ input: p, left: x, top: 40 }, { input: Buffer.from(`<svg width="${mt.width}" height="36" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${L.startsWith("NOUVEAU") ? "#1f5fd1" : L.startsWith("RÉF") ? "#fff" : "#444"}"/><text x="6" y="25" font-size="20" font-family="Arial" font-weight="bold" fill="${L.startsWith("RÉF") ? "#000" : "#fff"}">${L}</text></svg>`), left: x, top: 0 }); x += mt.width + 10; }
  const img = `${D}/cmp/${t}.png`;
  await sharp({ create: { width: x, height: H + 40, channels: 3, background: "#888" } }).composite(comp).png().toFile(img);
  lots.push({ target: t, id: m.id, brand: row.brand, name: row.name, image: img, kind: e?.kind === "visuel" ? "REMPLACEMENT d'un visuel déjà en ligne (verdicts actuels: " + JSON.stringify({ dark: e.dark, light: e.light }) + ")" : "PREMIER VISUEL", newDark: existsSync(`${D}/out/${t}-dark.webp`) ? `${D}/out/${t}-dark.webp` : null, newLight: existsSync(`${D}/out/${t}-light.webp`) ? `${D}/out/${t}-light.webp` : null });
}
const n = 5, s = Math.ceil(lots.length / n);
for (let i = 0; i < n; i++) writeFileSync(`${D}/cmp/lot-${i + 1}.json`, JSON.stringify(lots.slice(i * s, (i + 1) * s), null, 1));
console.log("cibles:", lots.length);
