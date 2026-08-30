/**
 * Génère les assets PWA de l'app de gestion (icônes + écrans de lancement iOS).
 *
 *   node scripts/build-admin-pwa-assets.mjs
 *
 * Sortie : `public/pwa/admin/*` + `app/admin/icon.png` / `app/admin/apple-icon.png`.
 * Ré-exécuter uniquement si le monogramme ou la couleur d'accent changent.
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "public/pwa/admin");

/** Bordeaux Nuréa — identique à `--admin-accent` et au `theme_color` du manifeste. */
const BORDEAUX = { r: 0x7b, g: 0x0b, b: 0x1d, alpha: 1 };
const MONOGRAM = resolve(ROOT, "public/branding/monogram/np-free-ivory.png");
const WORDMARK = resolve(ROOT, "public/branding/logos/nurea-logo-vertical-white.png");

async function ensureDir(file) {
  await mkdir(dirname(file), { recursive: true });
}

/** Icône carrée pleine (iOS applique lui-même le masque : pas de transparence). */
async function icon(size, logoRatio, outFile) {
  const logoSize = Math.round(size * logoRatio);
  const logo = await sharp(MONOGRAM)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await ensureDir(outFile);
  await sharp({
    create: { width: size, height: size, channels: 4, background: BORDEAUX },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(outFile);
  return outFile;
}

/** Écran de lancement iOS : aplat bordeaux + logo vertical centré. */
async function splash(width, height, outFile) {
  const logoWidth = Math.round(Math.min(width, height) * 0.42);
  const logo = await sharp(WORDMARK)
    .resize({ width: logoWidth, fit: "inside" })
    .toBuffer();

  await ensureDir(outFile);
  await sharp({
    create: { width, height, channels: 4, background: BORDEAUX },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(outFile);
  return outFile;
}

/**
 * Résolutions couvertes (portrait). `w`/`h` = points CSS, `r` = device pixel ratio.
 * Ordre indifférent : iOS choisit via les media queries générées par `admin-splash.ts`.
 */
export const SPLASH_TARGETS = [
  { w: 440, h: 956, r: 3 }, // iPhone 16 Pro Max
  { w: 430, h: 932, r: 3 }, // iPhone 15/16 Plus, 14/15 Pro Max
  { w: 428, h: 926, r: 3 }, // iPhone 12/13 Pro Max
  { w: 414, h: 896, r: 3 }, // iPhone XS Max, 11 Pro Max
  { w: 414, h: 896, r: 2 }, // iPhone XR, 11
  { w: 414, h: 736, r: 3 }, // iPhone 8 Plus
  { w: 402, h: 874, r: 3 }, // iPhone 16 Pro
  { w: 393, h: 852, r: 3 }, // iPhone 14/15/16 Pro
  { w: 390, h: 844, r: 3 }, // iPhone 12/13/14
  { w: 375, h: 812, r: 3 }, // iPhone X/XS/11 Pro, 13 mini
  { w: 375, h: 667, r: 2 }, // iPhone SE 2/3, 8
  { w: 360, h: 780, r: 3 }, // iPhone 12/13 mini
];

async function main() {
  const written = [];

  written.push(await icon(180, 0.62, resolve(ROOT, "app/admin/apple-icon.png")));
  written.push(await icon(512, 0.62, resolve(ROOT, "app/admin/icon.png")));
  written.push(await icon(192, 0.62, resolve(OUT, "icon-192.png")));
  written.push(await icon(512, 0.62, resolve(OUT, "icon-512.png")));
  // Maskable : le logo tient dans la « safe zone » centrale de 80 % imposée par
  // les masques adaptatifs Android, sinon le monogramme est rogné.
  written.push(await icon(512, 0.46, resolve(OUT, "icon-maskable-512.png")));

  for (const { w, h, r } of SPLASH_TARGETS) {
    written.push(await splash(w * r, h * r, resolve(OUT, `splash-${w}x${h}@${r}x.png`)));
  }

  await writeFile(
    resolve(OUT, "README.txt"),
    "Assets générés par scripts/build-admin-pwa-assets.mjs — ne pas éditer à la main.\n",
    "utf8",
  );

  for (const f of written) console.log("✓", f.replace(ROOT + "\\", "").replace(ROOT + "/", ""));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
