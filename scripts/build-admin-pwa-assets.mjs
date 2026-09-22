/**
 * Génère les assets PWA de l'app de gestion (icônes + écrans de lancement iOS).
 *
 *   node scripts/build-admin-pwa-assets.mjs
 *
 * Sortie : `public/pwa/admin/*` + `app/admin/icon.png` / `app/admin/apple-icon.png`.
 * Ré-exécuter uniquement si le monogramme ou la couleur d'accent changent.
 *
 * IDEMPOTENT (critère de 07 J16) : un fichier n'est RÉÉCRIT que si ses octets changent. Relancé sans
 * qu'aucune source ait bougé, le script ne touche rien et l'état du dépôt reste vide — sans quoi on
 * ne saurait jamais, en relisant une PR, si les dix-sept binaires ont vraiment changé ou s'ils ont
 * seulement été réécrits.
 */
import sharp from "sharp";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "public/pwa/admin");

/** Bordeaux Nuréa — identique à `--admin-accent` et au `theme_color` du manifeste. */
const BORDEAUX = { r: 0x7b, g: 0x0b, b: 0x1d, alpha: 1 };
const MONOGRAM = resolve(ROOT, "public/branding/monogram/np-free-ivory.png");
const WORDMARK = resolve(ROOT, "public/branding/logos/nurea-logo-vertical-white.png");

/** Ce que l'exécution a fait, fichier par fichier : `=` inchangé, `✓` réécrit. */
const results = [];

async function ensureDir(file) {
  await mkdir(dirname(file), { recursive: true });
}

/**
 * Écrit `buffer` dans `file` seulement s'il diffère de ce qui s'y trouve déjà.
 *
 * `text` : la comparaison ignore la fin de ligne. Sur un poste en `core.autocrlf=true`, le fichier a
 * été sorti du dépôt en CRLF ; le réécrire en LF ne change rien au contenu suivi, mais laisserait une
 * modification fantôme dans l'état du dépôt.
 */
async function writeIfChanged(file, content, { text = false } = {}) {
  const wanted = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  if (existsSync(file)) {
    const current = readFileSync(file);
    const same = text
      ? current.toString("utf8").replace(/\r\n/g, "\n") === wanted.toString("utf8")
      : current.equals(wanted);
    if (same) {
      results.push(["=", file]);
      return;
    }
  }
  await ensureDir(file);
  await writeFile(file, wanted);
  results.push(["✓", file]);
}

/** Icône carrée pleine (iOS applique lui-même le masque : pas de transparence). */
async function icon(size, logoRatio, outFile) {
  const logoSize = Math.round(size * logoRatio);
  const logo = await sharp(MONOGRAM)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const png = await sharp({
    create: { width: size, height: size, channels: 4, background: BORDEAUX },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
  await writeIfChanged(outFile, png);
}

/** Écran de lancement iOS : aplat bordeaux + logo vertical centré. */
async function splash(width, height, outFile) {
  const logoWidth = Math.round(Math.min(width, height) * 0.42);
  const logo = await sharp(WORDMARK)
    .resize({ width: logoWidth, fit: "inside" })
    .toBuffer();

  const png = await sharp({
    create: { width, height, channels: 4, background: BORDEAUX },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
  await writeIfChanged(outFile, png);
}

/**
 * Résolutions couvertes (portrait). `w`/`h` = points CSS, `r` = device pixel ratio.
 *
 * UNE seule liste, `src/lib/pwa/splash-targets.json`, lue ici et par `src/lib/pwa/admin-splash.ts`
 * qui en tire les media queries (04 §14.1). Deux listes à « garder alignées » avaient fini par
 * diverger (01 §4.7) : le fichier est lu, jamais recopié.
 */
const SPLASH_TARGETS = JSON.parse(readFileSync(resolve(ROOT, "src/lib/pwa/splash-targets.json"), "utf8"));

async function main() {
  await icon(180, 0.62, resolve(ROOT, "app/admin/apple-icon.png"));
  await icon(512, 0.62, resolve(ROOT, "app/admin/icon.png"));
  await icon(192, 0.62, resolve(OUT, "icon-192.png"));
  await icon(512, 0.62, resolve(OUT, "icon-512.png"));
  // Maskable : le logo tient dans la « safe zone » centrale de 80 % imposée par
  // les masques adaptatifs Android, sinon le monogramme est rogné.
  await icon(512, 0.46, resolve(OUT, "icon-maskable-512.png"));

  for (const { w, h, r } of SPLASH_TARGETS) {
    await splash(w * r, h * r, resolve(OUT, `splash-${w}x${h}@${r}x.png`));
  }

  await writeIfChanged(
    resolve(OUT, "README.txt"),
    "Assets générés par scripts/build-admin-pwa-assets.mjs — ne pas éditer à la main.\n",
    { text: true },
  );

  for (const [mark, file] of results) console.log(mark, file.replace(ROOT + "\\", "").replace(ROOT + "/", ""));
  const changed = results.filter(([mark]) => mark === "✓").length;
  console.log(changed === 0 ? "Rien n'a changé." : `${changed} fichier(s) réécrit(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
