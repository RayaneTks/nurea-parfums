/**
 * scripts/optimize-images.js
 * ──────────────────────────────────────────────────────────────
 * Convertit récursivement toutes les images .png et .jpeg/.jpg
 * du dossier public/parfums/ en .webp (qualité 80), puis
 * supprime les originaux.
 *
 * Utilisation :
 *   npm install --save-dev sharp
 *   node scripts/optimize-images.js
 * ──────────────────────────────────────────────────────────────
 */

import { readdir, stat, unlink } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import sharp from "sharp";

const PARFUMS_DIR = join(import.meta.dirname, "..", "public", "parfums");
const QUALITY = 80;
const EXTENSIONS = new Set([".png", ".jpeg", ".jpg"]);

let converted = 0;
let totalSavedBytes = 0;

async function walkAndConvert(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await walkAndConvert(fullPath);
      continue;
    }

    const ext = extname(entry.name).toLowerCase();
    if (!EXTENSIONS.has(ext)) continue;

    const outPath = join(dir, basename(entry.name, ext) + ".webp");
    const originalStats = await stat(fullPath);

    try {
      await sharp(fullPath).webp({ quality: QUALITY }).toFile(outPath);

      const newStats = await stat(outPath);
      const saved = originalStats.size - newStats.size;
      totalSavedBytes += saved;

      console.log(
        `✓ ${entry.name} → .webp  |  ${formatKB(originalStats.size)} → ${formatKB(newStats.size)}  (−${formatKB(saved)})`
      );

      await unlink(fullPath);
      converted++;
    } catch (err) {
      console.error(`✗ Erreur sur ${entry.name}:`, err.message);
    }
  }
}

function formatKB(bytes) {
  return (bytes / 1024).toFixed(0) + " Ko";
}

console.log(`\n🖼  Conversion des images dans ${PARFUMS_DIR}\n`);
console.log(`   Format cible : WebP (qualité ${QUALITY})`);
console.log(`   Extensions traitées : ${[...EXTENSIONS].join(", ")}\n`);
console.log("─".repeat(60));

await walkAndConvert(PARFUMS_DIR);

console.log("─".repeat(60));
console.log(`\n✅ ${converted} image(s) convertie(s).`);
console.log(`💾 Espace libéré : ${formatKB(totalSavedBytes)}\n`);
