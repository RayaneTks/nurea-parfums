import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { assertHostConfirmed, hostOf } from "../../lib/garde-hote";
import { cleNom } from "../../../src/lib/nommage";

type BottleImage = {
  brand: string;
  name: string;
  file: string;
  source: string;
};

const args = process.argv.slice(2);
const valueAfter = (flag: string) => {
  const index = args.indexOf(flag);
  return index < 0 ? undefined : args[index + 1];
};
const apply = args.includes("--apply");
const expected = Number(valueAfter("--attendu"));
const confirmedHost = valueAfter("--confirm-host");
const sourceRoot = resolve(valueAfter("--source-dir") ?? resolve(process.cwd(), "../nurea-visuels-site"));
const journalPath = resolve(
  valueAfter("--journal") ?? "migration-artifacts/catalogue-images-fournisseur-2026-10.json",
);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("Aucune DATABASE_URL n'est définie.");
assertHostConfirmed(databaseUrl, confirmedHost, "Images fournisseur Nuréa");
const host = hostOf(databaseUrl);
const manifest = JSON.parse(readFileSync(resolve(sourceRoot, "data/bottle-images.json"), "utf8")) as BottleImage[];

const { db } = await import("../../../src/server/db/client");
const requestedBrands = [...new Set(manifest.map((item) => item.brand))];
const products = await db.perfume.findMany({
  where: { brand: { is: { name: { in: requestedBrands } } } },
  select: { id: true, name: true, image: true, status: true, brand: { select: { name: true } } },
});
const key = (brand: string, name: string) => `${cleNom(brand)}|${cleNom(name)}`;
const byProduct = new Map(products.map((product) => [key(product.brand.name, product.name), product]));
const planned = manifest.map((item) => {
  const product = byProduct.get(key(item.brand, item.name));
  if (!product) throw new Error(`Fiche absente du catalogue : ${item.brand} — ${item.name}`);
  if (product.status !== "DRAFT") throw new Error(`Fiche non brouillon, refus de toucher la production : ${item.brand} — ${item.name}`);
  return { item, product };
});
const missingImages = planned.filter(({ product }) => !product.image?.trim());
const alreadyIllustrated = planned.length - missingImages.length;

console.log(`Base : ${host}`);
console.log(`Références fournisseur : ${planned.length}`);
console.log(`Flacons déjà renseignés : ${alreadyIllustrated}`);
console.log(`Images à ajouter : ${missingImages.length}`);
if (!apply) {
  console.log("Essai à blanc : aucune image ni fiche n'a été modifiée.");
  await db.$disconnect();
  process.exit(0);
}
if (!Number.isInteger(expected) || expected !== missingImages.length) {
  throw new Error(`Compte refusé : --attendu doit être ${missingImages.length}.`);
}
if (missingImages.length === 0) {
  console.log("Aucune image à ajouter.");
  await db.$disconnect();
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const bucketName = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "catalog";
if (!supabaseUrl || !serviceKey) throw new Error("Configuration Supabase de stockage manquante.");
const storage = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(bucketName);
const publicPrefix = `${supabaseUrl}/storage/v1/object/public/${bucketName}/`;
const uniqueStamp = () => `${String(Date.now()).padStart(13, "0")}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;

const entries = await Promise.all(
  missingImages.map(async ({ item, product }) => {
    const bytes = readFileSync(resolve(sourceRoot, item.file));
    const framed = await sharp(bytes).rotate().resize(1024, 1536, { fit: "contain", background: "#ffffff" }).png().toBuffer();
    const main = await (await import("../../../src/server/catalogue/webp")).toWebp(framed, "parfum");
    const thumb = await (await import("../../../src/server/catalogue/webp")).toWebpThumbnail(main.data);
    const objectPath = `perfumes/${uniqueStamp()}.webp`;
    return {
      id: product.id,
      brand: item.brand,
      name: item.name,
      source: item.source,
      oldImage: product.image,
      image: `${publicPrefix}${objectPath}`,
      objectPath,
      main: main.data,
      thumbnail: thumb.data,
    };
  }),
);

const journal = {
  date: new Date().toISOString(),
  host,
  bucket: bucketName,
  entries: entries.map(({ main: _main, thumbnail: _thumbnail, ...entry }) => ({ ...entry, uploaded: false, saved: false })),
};
mkdirSync(dirname(journalPath), { recursive: true });
writeFileSync(journalPath, `${JSON.stringify(journal, null, 2)}\n`, "utf8");

try {
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry) continue;
    const thumbPath = entry.objectPath.replace(/\.webp$/, "-640.webp");
    const mainUpload = await storage.upload(entry.objectPath, entry.main, { contentType: "image/webp", cacheControl: "31536000" });
    if (mainUpload.error) throw new Error(`Envoi du flacon refusé (${entry.brand} — ${entry.name}) : ${mainUpload.error.message}`);
    const thumbUpload = await storage.upload(thumbPath, entry.thumbnail, { contentType: "image/webp", cacheControl: "31536000" });
    if (thumbUpload.error) throw new Error(`Envoi de la vignette refusé (${entry.brand} — ${entry.name}) : ${thumbUpload.error.message}`);
    journal.entries[index]!.uploaded = true;
    writeFileSync(journalPath, `${JSON.stringify(journal, null, 2)}\n`, "utf8");

    const [{ inTransaction }, writer, { updatePerfumeInput }] = await Promise.all([
      import("../../../src/server/db/transaction"),
      import("../../../src/server/catalogue/writer"),
      import("../../../src/contracts/catalogue"),
    ]);
    await inTransaction((tx) => writer.updatePerfume(tx, updatePerfumeInput.parse({ id: entry.id, image: entry.image })));
    journal.entries[index]!.saved = true;
    writeFileSync(journalPath, `${JSON.stringify(journal, null, 2)}\n`, "utf8");
    console.log(`Image ajoutée : ${entry.brand} — ${entry.name}`);
  }
  console.log(`Terminé : ${entries.length} flacons enregistrés. Journal : ${journalPath}`);
} finally {
  await db.$disconnect();
}
