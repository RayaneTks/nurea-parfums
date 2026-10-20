// Usage : node scripts/visuels/planches.mjs <dossier-images> <dossier-travail>  — planches numérotées des images reçues (meta.json + planche-N.png).
import { readdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
const [src, dir] = process.argv.slice(2);
const files = readdirSync(src).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
const meta = [];
for (const [i, f] of files.entries()) {
  const m = await sharp(`${src}/${f}`).metadata();
  meta.push({ n: i + 1, file: f, w: m.width, h: m.height });
}
writeFileSync(`${dir}/meta.json`, JSON.stringify(meta, null, 1));
const sizes = {}; for (const m of meta) sizes[`${m.w}x${m.h}`] = (sizes[`${m.w}x${m.h}`] || 0) + 1;
console.log("images:", meta.length, "dimensions:", sizes);
const W = 240, H = 400, cols = 6, rows = 3, per = cols * rows;
for (let s = 0; s * per < meta.length; s++) {
  const comps = [];
  for (const [i, m] of meta.slice(s * per, (s + 1) * per).entries()) {
    const x = (i % cols) * W, y = Math.floor(i / cols) * H;
    comps.push({ input: await sharp(`${src}/${m.file}`).resize({ width: W - 8, height: H - 40, fit: "contain", background: "#808080" }).toBuffer(), left: x + 4, top: y + 4 });
    comps.push({ input: Buffer.from(`<svg width="${W}" height="34" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#fff"/><text x="8" y="24" font-size="22" font-family="Arial" font-weight="bold" fill="#c00">${m.n}</text></svg>`), left: x, top: y + H - 36 });
  }
  await sharp({ create: { width: W * cols, height: H * rows, channels: 3, background: "#ffffff" } }).composite(comps).png().toFile(`${dir}/planche-${s + 1}.png`);
}
console.log("planches:", Math.ceil(meta.length / per));
