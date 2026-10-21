// Mesure le décalage du sujet entre la variante sombre et la variante claire d'une image.
// Contours (Sobel) sur une version réduite à W px de large, puis recherche du décalage (dx, dy) qui
// maximise leur corrélation, au demi-pixel réduit près. Résultat ramené en pixels du fichier source.
// Usage : node alignement.mjs <sombre> <clair> [<sombre> <clair> ...]   (chemins ou URL)
import sharp from "sharp";

const W = 320;
const R = 14; // décalage cherché : ± R px réduits

async function load(src) {
  const buf = src.startsWith("http") ? Buffer.from(await (await fetch(src)).arrayBuffer()) : src;
  const img = sharp(buf);
  const meta = await img.metadata();
  const { data, info } = await img.resize({ width: W }).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { meta, w: info.width, h: info.height, data };
}

function edges({ w, h, data }) {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const p = (i, j) => data[(y + j) * w + (x + i)];
      const gx = -p(-1, -1) - 2 * p(-1, 0) - p(-1, 1) + p(1, -1) + 2 * p(1, 0) + p(1, 1);
      const gy = -p(-1, -1) - 2 * p(0, -1) - p(1, -1) + p(-1, 1) + 2 * p(0, 1) + p(1, 1);
      out[y * w + x] = Math.hypot(gx, gy);
    }
  // normalisation (les deux lumières n'ont pas le même contraste)
  let m = 0; for (const v of out) m += v; m /= out.length;
  let sd = 0; for (const v of out) sd += (v - m) ** 2; sd = Math.sqrt(sd / out.length) || 1;
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - m) / sd;
  return out;
}

function corr(a, b, w, h, dx, dy) {
  let s = 0, n = 0;
  for (let y = R; y < h - R; y++)
    for (let x = R; x < w - R; x++) { s += a[y * w + x] * b[(y + dy) * w + (x + dx)]; n++; }
  return s / n;
}

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const [A, B] = [await load(args[i]), await load(args[i + 1])];
  const name = args[i].split("/").pop();
  if (A.meta.width !== B.meta.width || A.meta.height !== B.meta.height) {
    console.log(`${name}\tDIMENSIONS DIFFÉRENTES ${A.meta.width}×${A.meta.height} / ${B.meta.width}×${B.meta.height}`);
    continue;
  }
  const ea = edges(A), eb = edges(B);
  let best = { c: -Infinity, dx: 0, dy: 0 };
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const c = corr(ea, eb, A.w, A.h, dx, dy);
    if (c > best.c) best = { c, dx, dy };
  }
  const k = A.meta.width / A.w;
  const at0 = corr(ea, eb, A.w, A.h, 0, 0);
  console.log(`${name}\t${A.meta.width}×${A.meta.height}\tdécalage ${(best.dx * k).toFixed(0)},${(best.dy * k).toFixed(0)} px source\tcorr ${best.c.toFixed(2)} (à 0,0 : ${at0.toFixed(2)})`);
}
