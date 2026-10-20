#!/usr/bin/env node
/**
 * Couleur d'ambiance d'un parfum — 04-PLAN-EXECUTION.md § B.3.
 *
 * Calcule, sur la vignette sombre (…-640.webp), la teinte dominante d'un visuel et en dérive deux
 * fonds (thème sombre, thème clair) dont le contraste avec le texte est vérifié. Lecture seule :
 * cette version ne touche pas la base (l'écriture arrive avec T7).
 *
 *   node scripts/refonte-vitrine/ambiance.mjs --planche          → public/planche/ambiance.json
 *   node scripts/refonte-vitrine/ambiance.mjs --ids 60,188 --out x.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const PLANCHE_IDS = [60, 188, 299, 23, 57, 117];

// ── OKLCH ⇄ sRGB ────────────────────────────────────────────────────────────
const toLin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const fromLin = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function rgbToOklch([r, g, b]) {
  const [R, G, B] = [toLin(r), toLin(g), toLin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(a, bb), ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360];
}

export function oklchToRgb(L, C, h) {
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.round(Math.min(1, Math.max(0, fromLin(c))) * 255));
}

const hex = (rgb) => "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
const lum = (rgb) => { const [r, g, b] = rgb.map(toLin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (x, y) => { const [a, b] = [lum(x), lum(y)].sort((p, q) => q - p); return (a + 0.05) / (b + 0.05); };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Jetons de texte (§ B.2) et bornes de l'ambiance (§ B.3).
const THEMES = {
  dark: { L: 0.27, k: 0.6, cMin: 0.03, cMax: 0.08, step: -0.01, text1: oklchToRgb(0.95, 0.008, 60), text3: oklchToRgb(0.66, 0.014, 40) },
  light: { L: 0.93, k: 0.35, cMin: 0.02, cMax: 0.05, step: +0.01, text1: oklchToRgb(0.22, 0.012, 20), text3: oklchToRgb(0.48, 0.014, 20) },
};
const MIN_TEXT1 = 7, MIN_TEXT3 = 4.5, MIN_WEIGHT = 0.08;

function derive(theme, hue, cSrc) {
  const t = THEMES[theme];
  const C = clamp(cSrc * t.k, t.cMin, t.cMax);
  for (let i = 0, L = t.L; i <= 5; i++, L += t.step) {
    const rgb = oklchToRgb(L, C, hue);
    const c1 = contrast(t.text1, rgb), c3 = contrast(t.text3, rgb);
    if (c1 >= MIN_TEXT1 && c3 >= MIN_TEXT3)
      return { oklch: `oklch(${L.toFixed(2)} ${C.toFixed(3)} ${Math.round(hue)})`, hex: hex(rgb), contrastText1: +c1.toFixed(2), contrastText3: +c3.toFixed(2) };
  }
  return null;
}

export async function ambiance(buffer) {
  const { data } = await sharp(buffer).resize(64, 96, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const bins = new Array(24).fill(0), kept = [];
  const total = data.length / 3;
  for (let i = 0; i < data.length; i += 3) {
    const [L, C, h] = rgbToOklch([data[i], data[i + 1], data[i + 2]]);
    if (C < 0.04 || L < 0.15 || L > 0.85) continue;
    kept.push([C, h]);
    bins[Math.floor(h / 15) % 24] += C;
  }
  const weight = kept.reduce((s, [C]) => s + C, 0) / total;
  if (kept.length / total < MIN_WEIGHT) return { hue: null, chroma: null, kept: +(kept.length / total).toFixed(3), dark: null, light: null };
  const top = bins.indexOf(Math.max(...bins));
  const near = new Set([(top + 23) % 24, top, (top + 1) % 24]);
  const sel = kept.filter(([, h]) => near.has(Math.floor(h / 15) % 24));
  let x = 0, y = 0;
  for (const [C, h] of sel) { x += C * Math.cos((h * Math.PI) / 180); y += C * Math.sin((h * Math.PI) / 180); }
  const hue = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  const cs = sel.map(([C]) => C).sort((a, b) => a - b);
  const chroma = cs[Math.floor(cs.length / 2)];
  return { hue: Math.round(hue), chroma: +chroma.toFixed(3), kept: +(kept.length / total).toFixed(3), weight: +weight.toFixed(4), dark: derive("dark", hue, chroma), light: derive("light", hue, chroma) };
}

const thumb = (url) => url.replace(/\.webp$/, "-640.webp");

async function main() {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const planche = args.includes("--planche");
  const ids = planche ? PLANCHE_IDS : (opt("--ids") ?? "").split(",").filter(Boolean).map(Number);
  const out = opt("--out") ?? (planche ? "public/planche/ambiance.json" : null);
  const catalogue = JSON.parse(readFileSync(new URL("../../src/lib/catalog/demo-catalogue.json", import.meta.url), "utf8"));
  const list = ids.length ? ids.map((id) => catalogue.find((p) => p.id === id)).filter(Boolean) : catalogue;
  const result = [];
  for (const p of list) {
    const res = await fetch(thumb(p.image));
    if (!res.ok) { console.error(`✗ ${p.id} ${p.name} : HTTP ${res.status}`); continue; }
    const a = await ambiance(Buffer.from(await res.arrayBuffer()));
    result.push({ id: p.id, brand: p.brand, name: p.name, line: p.line ?? null, image: thumb(p.image), imageLight: p.imageLight ? thumb(p.imageLight) : null, ...a });
    console.log(`${p.id} ${p.brand} — ${p.name} : ${a.hue ?? "repli"}° C${a.chroma ?? "-"} · sombre ${a.dark?.hex ?? "repli"} (${a.dark?.contrastText3 ?? "-"}) · clair ${a.light?.hex ?? "repli"} (${a.light?.contrastText3 ?? "-"})`);
  }
  const fallback = result.filter((r) => !r.dark || !r.light).length;
  console.log(`${result.length} visuels, ${fallback} en repli (${Math.round((100 * fallback) / Math.max(1, result.length))} %)`);
  if (out) writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
}

if (process.argv[1]?.endsWith("ambiance.mjs")) await main();
