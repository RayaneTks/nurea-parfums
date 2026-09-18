import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  IMAGE_NOT_RECEIVED_MESSAGE,
  IMAGE_TOO_HEAVY_MESSAGE,
  MAX_IMAGE_BYTES,
  UPLOAD_PATH_MESSAGE,
  buildUploadPath,
  convertedImagePath,
  parseUploadPath,
  type CreateImageUploadUrlData,
  type ImageUploadTicket,
  type ImageUsage,
} from "@/contracts/catalogue";
import { DomainError } from "@/domain/errors";
import { imageDimensions, toWebp } from "@/server/catalogue/webp";
import { logEvent } from "@/server/core/log";
import { inTransaction, type Tx } from "@/server/db/transaction";
import { ConfigurationError } from "@/server/env";

/**
 * Seul fichier qui parle au stockage d'images Supabase (04 §4.3, §12) : URL signée d'envoi, lecture de
 * l'original, écriture du WebP converti, URL publique, suppression d'objets. Remplace
 * `src/lib/supabase/adminStorage.ts`.
 *
 * Quatre règles, écrites ici une fois :
 * 1. **Le chemin est décidé par le serveur** selon l'usage (`perfumes/`, `brands/`, `stories/<parfum>/`) ;
 *    le nom de fichier de l'appareil est jeté, seule l'extension survit.
 * 2. **L'appareil envoie l'original, le serveur écrit le WebP** (décision du 17/09/2026) : l'original part
 *    sous `tmp/<dossier>/<horodatage>-<aléa>.<ext>` par URL signée ; `convertUpload` le lit, le convertit
 *    (`webp.ts`) et écrit `<dossier>/<horodatage>-<aléa>.webp` — chemin déterministe : renvoyer la même
 *    demande réécrit le même objet. L'action enregistre l'URL, PUIS supprime l'original (`thenRemoveUpload`).
 * 3. **L'URL publique se recalcule** depuis le chemin : elle n'est jamais reçue du client.
 * 4. **On ne supprime qu'après le COMMIT, et seulement ce qui est à nous** : une URL qui ne commence pas
 *    EXACTEMENT par `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/` n'est
 *    jamais supprimée (07 §1.3, garde-fou 2) — la préproduction référence les visuels de la production dans
 *    sa copie de la base, elle ne doit pas pouvoir les effacer. Une suppression qui échoue est journalisée,
 *    jamais propagée : l'écriture en base est déjà validée, l'objet resté est un orphelin pour
 *    `scripts/storage-orphans.ts`.
 *
 * Les variables sont lues à l'appel, jamais au chargement : la vitrine partage le process (04 §17.1).
 */

const DEFAULT_BUCKET = "catalog";

function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  if (!url) throw new ConfigurationError("NEXT_PUBLIC_SUPABASE_URL");
  return url;
}

function bucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_BUCKET;
}

function storageBucket() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new ConfigurationError("SUPABASE_SERVICE_ROLE_KEY");
  const client = createClient(supabaseUrl(), key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client.storage.from(bucketName());
}

/** Préfixe exact des URL publiques des objets de CE projet et de CE bucket. */
export function publicObjectPrefix(): string {
  return `${supabaseUrl()}/storage/v1/object/public/${bucketName()}/`;
}

/** Un chemin d'objet sûr : segments alphanumériques (`._-`), ni `..`, ni `/` de tête, ni requête. */
const SAFE_PATH = /^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;

function isSafePath(path: string): boolean {
  return SAFE_PATH.test(path) && !path.split("/").some((segment) => segment === ".." || segment === ".");
}

/** URL publique recalculée depuis un chemin décidé par le serveur. */
export function publicUrlOf(path: string): string {
  if (!isSafePath(path)) throw new RangeError(`publicUrlOf : chemin d'objet refusé « ${path} »`);
  return `${publicObjectPrefix()}${path}`;
}

/**
 * Le chemin d'un objet de NOTRE bucket désigné par cette URL, ou `null` : autre hôte, autre projet, autre
 * bucket (y compris un bucket dont le nom commence pareil), chemin relatif, requête ou `..`.
 * Seule porte d'entrée d'une suppression.
 */
export function ownedObjectPath(url: string, prefix: string = publicObjectPrefix()): string | null {
  if (!url.startsWith(prefix)) return null;
  const path = url.slice(prefix.length);
  return isSafePath(path) ? path : null;
}

/** Horodatage (ms) et aléa, forme de la production : `1757500000000-1a2b3c4d`. */
function objectStamp(): string {
  return `${String(Date.now()).padStart(13, "0")}-${globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
}

/**
 * URL signée d'envoi direct navigateur → Supabase de l'ORIGINAL, sous `tmp/` (le serveur de Next ne relaie
 * jamais les octets de l'appareil : une action serveur a un corps plafonné). Le chemin rendu est la `source`
 * à renvoyer pour la conversion.
 */
export async function createImageUpload(input: CreateImageUploadUrlData): Promise<ImageUploadTicket> {
  const path = buildUploadPath(input, objectStamp());
  // `upsert` : un renvoi du même envoi (réseau coupé après l'écriture) ne doit pas échouer ; le chemin est neuf.
  const { data, error } = await storageBucket().createSignedUploadUrl(path, { upsert: true });
  if (error || !data) {
    throw new Error(`Stockage : URL signée refusée pour ${path} (${error?.message ?? "réponse vide"})`);
  }
  return { path, signedUrl: data.signedUrl, token: data.token };
}

/** Objet absent : l'API Storage répond 404, ou 400 avec `statusCode: "404"` selon sa version. */
function isMissingObject(error: unknown): boolean {
  const { status, statusCode } = (error ?? {}) as { status?: unknown; statusCode?: unknown };
  return status === 404 || statusCode === "404" || statusCode === 404 || statusCode === "not_found";
}

/**
 * Octets d'un objet de NOTRE bucket (le client est lié au bucket configuré), ou `null` s'il n'y est pas.
 * Au-delà de 12 Mo : `VALIDATION`, avant toute conversion.
 */
async function readObject(path: string): Promise<Buffer | null> {
  const { data, error } = await storageBucket().download(path);
  if (error || !data) {
    if (isMissingObject(error)) return null;
    throw new Error(`Stockage : lecture refusée pour ${path} (${error instanceof Error ? error.message : "réponse vide"})`);
  }
  if (data.size > MAX_IMAGE_BYTES) throw new DomainError("VALIDATION", IMAGE_TOO_HEAVY_MESSAGE, "source");
  return Buffer.from(await data.arrayBuffer());
}

/** Écrit (ou réécrit à l'identique) un objet converti. Le chemin porte un horodatage-aléa : contenu immuable. */
async function writeObject(path: string, bytes: Buffer, contentType: string): Promise<void> {
  const { error } = await storageBucket().upload(path, bytes, { contentType, upsert: true, cacheControl: "31536000" });
  if (error) throw new Error(`Stockage : écriture refusée pour ${path} (${error.message})`);
}

/** Le WebP écrit à son chemin définitif, et ce qu'il faut en ranger en base. */
export type StoredImage = { path: string; url: string; width: number; height: number; bytes: number };

/**
 * Convertit l'original `source` (chemin `tmp/…` délivré pour cet usage) en WebP et l'écrit à son chemin
 * définitif. N'écrit rien en base : l'action enregistre l'URL dans sa transaction, puis supprime l'original.
 *
 * Idempotent : le chemin définitif se déduit de `source`. Renvoyer la même demande réécrit le même objet ;
 * si l'original est déjà supprimé (demande déjà servie, réponse perdue), le WebP en place est rendu tel quel.
 * Refus `VALIDATION` (champ `source`) : chemin d'une autre forme — rien n'est lu —, original jamais arrivé,
 * plus de 12 Mo, format illisible.
 */
export async function convertUpload(source: string, usage: ImageUsage): Promise<StoredImage> {
  const original = parseUploadPath(source);
  if (original === null || original.usage !== usage) throw new DomainError("VALIDATION", UPLOAD_PATH_MESSAGE, "source");
  const path = convertedImagePath(original);
  const url = publicUrlOf(path);

  const bytes = await readObject(original.path);
  if (bytes === null) {
    const stored = await readObject(path);
    if (stored === null) throw new DomainError("VALIDATION", IMAGE_NOT_RECEIVED_MESSAGE, "source");
    return { path, url, ...(await imageDimensions(stored)), bytes: stored.length };
  }
  const webp = await toWebp(bytes, usage);
  await writeObject(path, webp.data, "image/webp");
  return { path, url, width: webp.width, height: webp.height, bytes: webp.bytes };
}

/**
 * Supprime un original `tmp/…` ; tout autre chemin est ignoré. Ne lève jamais : un original resté est
 * retiré par `scripts/storage-orphans.ts` au-delà de 24 h.
 */
export async function removeUpload(source: string): Promise<void> {
  const original = parseUploadPath(source);
  if (original === null) return;
  try {
    const { error } = await storageBucket().remove([original.path]);
    if (error) throw error;
  } catch (cause) {
    logEvent("error", "storage.remove.upload", { reason: describe(cause), orphans: [original.path] });
  }
}

/**
 * Le geste qui consomme un original (conversion, puis enregistrement de l'URL dans sa transaction), puis
 * la suppression de cet original — que le geste ait abouti ou non : un original n'est jamais réutilisé
 * (« Réessayer » renvoie le fichier). Un renvoi de la même demande reste servi (`convertUpload`).
 */
export async function thenRemoveUpload<T>(source: string, work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } finally {
    await removeUpload(source);
  }
}

/**
 * Supprime les objets de notre bucket désignés par ces URL ; ignore les autres. Ne lève jamais.
 * À n'appeler qu'APRÈS le commit : passer par `commitThenRemoveObjects`.
 */
export async function removeOwnedObjects(urls: readonly string[]): Promise<{ removed: string[]; ignored: string[] }> {
  const unique = [...new Set(urls.map((url) => url.trim()).filter((url) => url !== ""))];
  if (unique.length === 0) return { removed: [], ignored: [] };

  let prefix: string;
  try {
    prefix = publicObjectPrefix();
  } catch (cause) {
    logEvent("error", "storage.remove", { reason: describe(cause), orphans: unique.length });
    return { removed: [], ignored: unique };
  }

  const paths: string[] = [];
  const ignored: string[] = [];
  for (const url of unique) {
    const path = ownedObjectPath(url, prefix);
    if (path === null) ignored.push(url);
    else paths.push(path);
  }
  if (ignored.length > 0) logEvent("info", "storage.remove.ignored", { count: ignored.length });
  if (paths.length === 0) return { removed: [], ignored };

  try {
    const { error } = await storageBucket().remove(paths);
    if (error) throw error;
    return { removed: paths, ignored };
  } catch (cause) {
    // Best-effort : la ligne est déjà supprimée ; l'objet resté relève de scripts/storage-orphans.ts.
    logEvent("error", "storage.remove", { reason: describe(cause), orphans: paths });
    return { removed: [], ignored };
  }
}

function describe(cause: unknown): string {
  return cause instanceof Error ? cause.message.slice(0, 500) : String(cause);
}

/** Le résultat d'une transaction, et les URL d'objets devenus inutiles qu'elle a lues avant ses DELETE. */
export type WithObjectRemoval<T> = { data: T; remove: readonly string[] };

/**
 * Ouvre la transaction, puis — seulement si elle a été VALIDÉE — supprime les objets qu'elle désigne.
 * `inTransaction` lève sur un ROLLBACK : aucune suppression n'est alors tentée. Les URL viennent de la
 * tentative validée (un rejeu d'interblocage recalcule tout) ; rien n'est supprimé pendant la transaction.
 */
export async function commitThenRemoveObjects<T>(work: (tx: Tx) => Promise<WithObjectRemoval<T>>): Promise<T> {
  const { data, remove } = await inTransaction(work);
  if (remove.length > 0) await removeOwnedObjects(remove);
  return data;
}
