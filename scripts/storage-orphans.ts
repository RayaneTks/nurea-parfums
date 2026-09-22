/**
 * Objets orphelins du bucket d'images (04 §7.3, §12 ; 06 F-4.5-04) — tâche explicite, lancée à la main.
 *
 * Un objet est RÉFÉRENCÉ s'il est désigné par :
 * - `Brand.image`, `Brand.imageLight`, `Perfume.image`, `Perfume.imageLight` (visuels du catalogue) ;
 * - `SaleLine.imageUrl` (la vignette gardée par l'historique d'une vente : un parfum supprimé laisse son
 *   visuel à ses lignes de documents, 02 §4.5) ;
 * - `PerfumeMedia.path` et `PerfumeMedia.url` (visuels story).
 * Tout autre objet est un orphelin : image convertie puis formulaire abandonné, suppression d'objet échouée
 * après un commit (best-effort journalisé de `storage.ts`), visuel story sans ligne (WebP écrit, rangement
 * refusé ou en panne).
 *
 * Originaux temporaires (`tmp/…`, décision du 17/09/2026) : l'appareil y envoie l'original, le serveur le
 * convertit en WebP puis le supprime. Rien ne les référence jamais ; un original de PLUS DE 24 H est un
 * orphelin (envoi dont la conversion n'a jamais été demandée, suppression échouée), quel que soit
 * `--min-age-hours` : une conversion ne dure que quelques secondes.
 *
 * Par défaut le script LISTE et ne supprime rien. `--apply` supprime les orphelins, par lots de 100.
 * Un objet plus récent que `--min-age-hours` (24 par défaut) n'est jamais compté : un envoi est peut-être
 * en cours (visuel déposé, fiche pas encore enregistrée).
 *
 * Gardes (07 §1.3, garde-fous 2 et 5) :
 * - `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont lus AVANT tout import de
 *   `@prisma/client`, qui charge `.env` (la production) : sans valeur explicite, refus ;
 * - la base et le bucket doivent être le MÊME projet : une base de préproduction (qui référence les visuels
 *   de la production) comparée au bucket de production désignerait comme orphelins tous les objets
 *   ajoutés depuis la copie — `--apply` les effacerait de la vitrine ;
 * - la production n'est acceptée qu'avec `--confirm-host <hôte>` reproduisant l'hôte de la base ET
 *   `--confirm-storage-host <hôte>` reproduisant celui du stockage.
 *
 * Usage :
 *   DATABASE_URL=<url> NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<clé> \
 *     npx tsx scripts/storage-orphans.ts [--apply] [--min-age-hours 24] [--bucket catalog] \
 *     [--confirm-host <hôte base>] [--confirm-storage-host <hôte stockage>]
 */
import { assertHostConfirmed, HostRefusedError, hostOf, isProductionUrl, PRODUCTION_PROJECT_REF } from "./lib/garde-hote";

// Lus AVANT tout import de @prisma/client (qui charge `.env`, la production, sans écraser l'existant).
const DATABASE_URL = process.env.DATABASE_URL;
const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const USAGE =
  "Usage : DATABASE_URL=<url> NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<clé> npx tsx scripts/storage-orphans.ts [--apply] [--min-age-hours 24] [--bucket catalog] [--confirm-host <hôte base>] [--confirm-storage-host <hôte stockage>]";

/** Dossier des originaux en attente de conversion (`UPLOAD_FOLDER` de `src/contracts/catalogue.ts`). */
export const UPLOAD_FOLDER = "tmp";
/** Âge au-delà duquel un original temporaire est un orphelin. */
export const UPLOAD_MAX_AGE_HOURS = 24;

/** Dossiers où la gestion range ses objets (04 §12), originaux temporaires compris. */
const PREFIXES = ["perfumes", "brands", "stories", UPLOAD_FOLDER] as const;
const PAGE = 1000;
const REMOVE_BATCH = 100;

export type Options = {
  apply: boolean;
  minAgeHours: number;
  bucket: string;
  confirmHost?: string;
  confirmStorageHost?: string;
};

export function parseArgs(argv: readonly string[]): Options {
  const options: Options = { apply: false, minAgeHours: 24, bucket: "catalog" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--min-age-hours" && next !== undefined) {
      options.minAgeHours = Number(next);
      i += 1;
    } else if (arg === "--bucket" && next !== undefined) {
      options.bucket = next;
      i += 1;
    } else if (arg === "--confirm-host" && next !== undefined) {
      options.confirmHost = next;
      i += 1;
    } else if (arg === "--confirm-storage-host" && next !== undefined) {
      options.confirmStorageHost = next;
      i += 1;
    } else {
      throw new Error(`Argument inconnu : ${arg}\n${USAGE}`);
    }
  }
  if (!Number.isFinite(options.minAgeHours) || options.minAgeHours < 0) throw new Error("--min-age-hours : un nombre d'heures ≥ 0.");
  return options;
}

/** Préfixe exact des URL publiques des objets de ce projet et de ce bucket (même règle que `storage.ts`). */
export function publicPrefix(storageUrl: string, bucket: string): string {
  return `${storageUrl.trim().replace(/\/+$/, "")}/storage/v1/object/public/${bucket}/`;
}

/** Chemins d'objets de NOTRE bucket désignés par des références (URL publiques ou chemins bruts). */
export function referencedPaths(references: { urls: readonly (string | null)[]; paths: readonly string[] }, prefix: string): Set<string> {
  const out = new Set<string>();
  for (const url of references.urls) {
    const value = (url ?? "").trim();
    if (value.startsWith(prefix)) out.add(decodeURIComponent(value.slice(prefix.length).split(/[?#]/)[0] ?? ""));
  }
  for (const path of references.paths) out.add(path.trim());
  return out;
}

export type StoredObject = { path: string; createdAt: Date | null };

/**
 * Orphelins : objets non référencés et assez anciens (un envoi récent est peut-être en cours). Un original
 * temporaire (`tmp/…`) n'est jamais référencé : il est orphelin au-delà de 24 h, quel que soit `minAgeHours`.
 */
export function findOrphans(objects: readonly StoredObject[], referenced: ReadonlySet<string>, now: Date, minAgeHours: number): StoredObject[] {
  const olderThan = (object: StoredObject, hours: number) =>
    object.createdAt === null || object.createdAt.getTime() <= now.getTime() - hours * 3_600_000;
  return objects.filter((object) =>
    object.path.startsWith(`${UPLOAD_FOLDER}/`)
      ? olderThan(object, UPLOAD_MAX_AGE_HOURS)
      : !referenced.has(object.path) && olderThan(object, minAgeHours),
  );
}

/**
 * Même projet des deux côtés : base de production ⇔ stockage de production. Sinon, refus avant toute
 * lecture — c'est la garde qui empêche une base de préproduction d'effacer les visuels de la production.
 */
export function assertSameProject(databaseUrl: string, storageUrl: string): void {
  const databaseIsProduction = isProductionUrl(databaseUrl);
  const storageIsProduction = storageUrl.includes(PRODUCTION_PROJECT_REF);
  if (databaseIsProduction !== storageIsProduction) {
    throw new HostRefusedError(
      `Orphelins : la base (${hostOf(databaseUrl)}) et le stockage (${hostOf(storageUrl)}) ne sont pas le même projet. ` +
        "Une base qui n'est pas celle du bucket désignerait comme orphelins des visuels en service.",
    );
  }
}

type Bucket = {
  list: (
    path: string,
    options: { limit: number; offset: number; sortBy: { column: string; order: string } },
  ) => Promise<{ data: { name: string; id: string | null; created_at?: string | null }[] | null; error: { message: string } | null }>;
  remove: (paths: string[]) => Promise<{ error: { message: string } | null }>;
};

/** Tous les objets sous un dossier, récursivement, page par page. */
async function listAll(bucket: Bucket, folder: string): Promise<StoredObject[]> {
  const out: StoredObject[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await bucket.list(folder, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`Liste de ${folder || "/"} refusée : ${error.message}`);
    const entries = data ?? [];
    for (const entry of entries) {
      const path = folder ? `${folder}/${entry.name}` : entry.name;
      if (entry.id === null) out.push(...(await listAll(bucket, path)));
      else out.push({ path, createdAt: entry.created_at ? new Date(entry.created_at) : null });
    }
    if (entries.length < PAGE) return out;
  }
}

async function main(): Promise<number> {
  let options: Options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (cause) {
    console.error(cause instanceof Error ? cause.message : String(cause));
    return 1;
  }
  if (!STORAGE_URL || !SERVICE_KEY) {
    console.error(`NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont exigés, explicitement.\n${USAGE}`);
    return 1;
  }

  let databaseUrl: string;
  try {
    databaseUrl = assertHostConfirmed(DATABASE_URL, options.confirmHost, "Orphelins du stockage");
    assertSameProject(databaseUrl, STORAGE_URL);
    if (STORAGE_URL.includes(PRODUCTION_PROJECT_REF) && options.confirmStorageHost !== hostOf(STORAGE_URL)) {
      throw new HostRefusedError(
        `Orphelins du stockage : le bucket est celui de la production (${hostOf(STORAGE_URL)}). Relance avec --confirm-storage-host ${hostOf(STORAGE_URL)} si c'est voulu.`,
      );
    }
  } catch (cause) {
    console.error(cause instanceof Error ? cause.message : String(cause));
    return 1;
  }

  const { PrismaClient } = await import("@prisma/client");
  const { createClient } = await import("@supabase/supabase-js");
  const db = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    const [brands, perfumes, lines, media] = await Promise.all([
      db.brand.findMany({ select: { image: true, imageLight: true } }),
      db.perfume.findMany({ select: { image: true, imageLight: true } }),
      db.saleLine.findMany({ where: { imageUrl: { not: null } }, select: { imageUrl: true } }),
      db.perfumeMedia.findMany({ select: { path: true, url: true } }),
    ]);
    const prefix = publicPrefix(STORAGE_URL, options.bucket);
    const referenced = referencedPaths(
      {
        urls: [
          ...brands.flatMap((brand) => [brand.image, brand.imageLight]),
          ...perfumes.flatMap((perfume) => [perfume.image, perfume.imageLight]),
          ...lines.map((line) => line.imageUrl),
          ...media.map((item) => item.url),
        ],
        paths: media.map((item) => item.path),
      },
      prefix,
    );

    const bucket = createClient(STORAGE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(
      options.bucket,
    ) as unknown as Bucket;
    const objects = (await Promise.all(PREFIXES.map((folder) => listAll(bucket, folder)))).flat();
    const orphans = findOrphans(objects, referenced, new Date(), options.minAgeHours);

    console.info(`Bucket ${options.bucket} sur ${hostOf(STORAGE_URL)} : ${objects.length} objet(s), ${referenced.size} référence(s).`);
    console.info(
      `${orphans.length} orphelin(s) de plus de ${options.minAgeHours} h (originaux ${UPLOAD_FOLDER}/ : plus de ${UPLOAD_MAX_AGE_HOURS} h) :`,
    );
    for (const orphan of orphans) console.info(`  ${orphan.path}`);

    if (!options.apply) {
      if (orphans.length > 0) console.info("Rien n'est supprimé sans --apply.");
      return 0;
    }
    let removed = 0;
    for (let i = 0; i < orphans.length; i += REMOVE_BATCH) {
      const batch = orphans.slice(i, i + REMOVE_BATCH).map((orphan) => orphan.path);
      const { error } = await bucket.remove(batch);
      if (error) {
        console.error(`Suppression refusée pour un lot de ${batch.length} : ${error.message}`);
        return 1;
      }
      removed += batch.length;
    }
    console.info(`${removed} orphelin(s) supprimé(s).`);
    return 0;
  } finally {
    await db.$disconnect();
  }
}

// Exécuté seulement comme script (les fonctions pures ci-dessus restent importables par un test).
if (process.argv[1] && /storage-orphans\.ts$/.test(process.argv[1])) {
  // `exitCode` plutôt que `process.exit()` : laisser Prisma et fetch fermer leurs poignées (sous Windows,
  // une sortie forcée pendant leur fermeture fait échouer libuv et masque le vrai code de sortie).
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (cause) => {
      console.error(cause);
      process.exitCode = 1;
    },
  );
}
