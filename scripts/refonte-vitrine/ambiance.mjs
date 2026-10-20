#!/usr/bin/env node
/**
 * Couleur d'ambiance des parfums — docs/refonte-vitrine/04-PLAN-EXECUTION.md § B.3.
 *
 * Calcule, sur la vignette sombre (…-640.webp), la teinte dominante d'un visuel et en dérive deux
 * fonds (thème sombre, thème clair) dont le contraste avec le texte est vérifié. On stocke la teinte
 * et la chroma source (`Perfume.ambientHue`, `Perfume.ambientChroma`) ; un échec de contraste dans
 * un thème = repli (les deux NULL), jamais une teinte inventée.
 *
 * Cible : `DATABASE_URL`, lue AVANT l'import de Prisma — qui chargerait sinon `.env`, c'est-à-dire la
 * production. Production : `--confirm-host <hôte>` exigé, même pour l'essai à blanc.
 *
 *   node scripts/refonte-vitrine/ambiance.mjs --confirm-host <hôte>            essai à blanc (défaut)
 *   node scripts/refonte-vitrine/ambiance.mjs --confirm-host <hôte> --apply    écrit en base
 *   … --ids <id,id,…>                seulement ces fiches (après chaque fournée de visuels neufs)
 *   … --set <id> <teinte> <chroma>   forçage manuel (répétable), écrit avec --apply
 *   node scripts/refonte-vitrine/ambiance.mjs --demo [--write-demo]            catalogue de démonstration, sans base
 *
 * Sorties : .tmp/refonte-vitrine/ambiance-rapport.json (taux de repli) et ambiance.html (planche des
 * pastilles, à relire : une teinte boueuse se corrige par --set). --apply journalise chaque écriture,
 * avec l'ancienne valeur, dans .tmp/refonte-vitrine/ambiance-journal-<horodatage>.json, AVANT d'écrire.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

// Lu AVANT tout import de @prisma/client, qui charge `.env` (la production) dans process.env.
const DATABASE_URL = process.env.DATABASE_URL;

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

export function derive(theme, hue, cSrc) {
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

/** Ce que la base reçoit : teinte et chroma source, ou les deux NULL (repli). */
export function stored(a) {
  if (a.hue === null || !a.dark || !a.light) return { ambientHue: null, ambientChroma: null };
  return { ambientHue: a.hue % 360, ambientChroma: Math.min(0.4, a.chroma) };
}

/** Recalcule les deux fonds d'une teinte forcée (`--set`), avec le même contrôle de contraste. */
function forced(hue, chroma) {
  return { hue, chroma, forced: true, dark: derive("dark", hue, chroma), light: derive("light", hue, chroma) };
}

const OUT_DIR = ".tmp/refonte-vitrine";
const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ENTITIES[c]);

/** Planche de relecture (hors dépôt) : visuel, fond sombre, fond clair, contraste du texte le plus pâle. */
function planche(rows) {
  const swatch = (d, cls) =>
    `<div class="sw ${cls}" style="background:${d?.hex ?? "transparent"}">${d ? `${d.hex} · ${d.contrastText3}:1` : "repli"}</div>`;
  const tile = (r) => `<figure>
  <img src="${esc(r.image)}" alt="" loading="lazy" width="96" height="144">
  ${swatch(r.dark, "sombre")}${swatch(r.light, "clair")}
  <figcaption>${r.id} · ${esc(r.brand)} — ${esc(r.name)}<br>${r.hue ?? "–"}° · C ${r.chroma ?? "–"}${r.forced ? " (forcé)" : ""}</figcaption>
</figure>`;
  const fallback = rows.filter((r) => stored(r).ambientHue === null).length;
  return `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Ambiance — ${rows.length} parfums</title>
<style>
body{margin:0;padding:16px;background:#120B0B;color:#F3EDE9;font:13px system-ui}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
figure{margin:0;padding:8px;border:1px solid #3E3635;border-radius:12px}
img{display:block;width:96px;height:144px;object-fit:cover;border-radius:6px}
.sw{height:44px;margin-top:6px;border-radius:6px;display:flex;align-items:center;padding:0 8px;border:1px dashed #3E3635}
.sombre{color:#9A908C}.clair{color:#655A5A}figcaption{margin-top:6px;color:#BEB5B1}
</style>
<h1>${rows.length} parfums · ${fallback} en repli</h1><main>${rows.map(tile).join("\n")}</main></html>`;
}

async function listFromDb(prisma) {
  const rows = await prisma.perfume.findMany({
    where: { status: "PUBLISHED", image: { not: "" } },
    select: { id: true, name: true, line: true, image: true, brand: { select: { name: true } } },
    orderBy: { id: "asc" },
  });
  return rows.map((p) => ({ id: p.id, name: p.name, brand: p.brand.name, line: p.line, image: p.image }));
}

function parseSets(args) {
  const sets = new Map();
  args.forEach((a, i) => {
    if (a !== "--set") return;
    const [id, hue, chroma] = args.slice(i + 1, i + 4).map(Number);
    if (![id, hue, chroma].every(Number.isFinite) || hue < 0 || hue > 359 || chroma < 0 || chroma > 0.4)
      throw new Error("--set <id> <teinte 0–359> <chroma 0–0,4>");
    sets.set(id, [hue, chroma]);
  });
  return sets;
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const demo = args.includes("--demo");
  const apply = args.includes("--apply");
  const sets = parseSets(args);
  if (demo && apply) throw new Error("--apply écrit en base : incompatible avec --demo.");

  const demoUrl = new URL("../../src/lib/catalog/demo-catalogue.json", import.meta.url);
  let prisma = null;
  let list;
  if (demo) {
    list = JSON.parse(readFileSync(demoUrl, "utf8"));
  } else {
    const { assertHostConfirmed } = await import("../lib/garde-hote.ts");
    const url = assertHostConfirmed(DATABASE_URL, opt("--confirm-host"), "ambiance");
    const { PrismaClient } = await import("@prisma/client");
    prisma = new PrismaClient({ datasourceUrl: url });
    console.log(`Base : ${new URL(url).hostname} · ${apply ? "ÉCRITURE" : "essai à blanc"}`);
    list = await listFromDb(prisma);
    // `--ids 12,34` : seulement ces fiches (une fournée de visuels neufs).
    const only = (opt("--ids") ?? "").split(",").filter(Boolean).map(Number);
    if (only.length) list = list.filter((p) => only.includes(p.id));
  }

  const rows = [];
  for (const p of list) {
    let a;
    if (sets.has(p.id)) a = forced(...sets.get(p.id));
    else {
      const res = await fetch(thumb(p.image));
      if (res.ok) a = await ambiance(Buffer.from(await res.arrayBuffer()));
      else {
        console.error(`✗ ${p.id} ${p.name} : HTTP ${res.status}, repli`);
        a = { hue: null, chroma: null, dark: null, light: null };
      }
    }
    rows.push({ id: p.id, brand: p.brand, name: p.name, line: p.line ?? null, image: thumb(p.image), ...a });
  }

  const fallback = rows.filter((r) => stored(r).ambientHue === null).length;
  const rate = Math.round((1000 * fallback) / Math.max(1, rows.length)) / 10;
  console.log(`${rows.length} visuels, ${fallback} en repli (${rate} %)`);
  mkdirSync(OUT_DIR, { recursive: true });
  const suffix = demo ? "-demo" : "";
  writeFileSync(`${OUT_DIR}/ambiance-rapport${suffix}.json`, JSON.stringify({ total: rows.length, fallback, rate, rows }, null, 2) + "\n");
  writeFileSync(`${OUT_DIR}/ambiance${suffix}.html`, planche(rows));
  console.log(`Planche : ${OUT_DIR}/ambiance${suffix}.html`);

  if (demo && args.includes("--write-demo")) {
    const byId = new Map(rows.map((r) => [r.id, stored(r)]));
    const next = list.map(({ ambientHue: _h, ambientChroma: _c, ...p }) => {
      const s = byId.get(p.id);
      return s?.ambientHue == null ? p : { ...p, ...s };
    });
    // Même forme que le fichier d'origine : une clé par ligne, sans retrait.
    writeFileSync(demoUrl, JSON.stringify(next, null, 2).replace(/^ +/gm, "") + "\n");
    console.log(`demo-catalogue.json : ${next.filter((p) => p.ambientHue !== undefined).length} ambiances écrites`);
  }

  if (prisma && apply) {
    const journal = [];
    const path = `${OUT_DIR}/ambiance-journal-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    for (const r of rows) {
      const next = stored(r);
      const before = await prisma.perfume.findUnique({ where: { id: r.id }, select: { ambientHue: true, ambientChroma: true } });
      journal.push({ id: r.id, before: { ambientHue: before?.ambientHue ?? null, ambientChroma: before?.ambientChroma?.toString() ?? null }, after: next });
      writeFileSync(path, JSON.stringify(journal, null, 2) + "\n");
      await prisma.perfume.update({
        where: { id: r.id },
        data: { ambientHue: next.ambientHue, ambientChroma: next.ambientChroma === null ? null : next.ambientChroma.toFixed(3) },
      });
      console.log(`écrit ${r.id} ${r.brand} — ${r.name} : ${next.ambientHue ?? "repli"}`);
    }
    console.log(`Journal : ${path}`);
  }
  await prisma?.$disconnect();
}

if (process.argv[1]?.endsWith("ambiance.mjs")) await main();
