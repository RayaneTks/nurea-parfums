import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  buildObjectPath,
  type CreateImageUploadUrlData,
  type ImageUploadTicket,
} from "@/contracts/catalogue";
import { logEvent } from "@/server/core/log";
import { inTransaction, type Tx } from "@/server/db/transaction";
import { ConfigurationError } from "@/server/env";

/**
 * Seul fichier qui parle au stockage d'images Supabase (04 §4.3, §12) : URL signée d'envoi, URL publique,
 * suppression d'objets. Remplace `src/lib/supabase/adminStorage.ts`.
 *
 * Trois règles, écrites ici une fois :
 * 1. **Le chemin est décidé par le serveur** selon l'usage (`perfumes/`, `brands/`, `stories/<parfum>/`) ;
 *    le nom de fichier de l'appareil est jeté, seule l'extension survit.
 * 2. **L'URL publique se recalcule** depuis le chemin : elle n'est jamais reçue du client.
 * 3. **On ne supprime qu'après le COMMIT, et seulement ce qui est à nous** : une URL qui ne commence pas
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
 * URL signée d'envoi direct navigateur → Supabase (le serveur ne relaie jamais les octets). Le chemin
 * rendu est celui qu'il faudra renvoyer pour ranger un visuel story ; l'URL publique sert au visuel du
 * catalogue ou au logo.
 */
export async function createImageUpload(input: CreateImageUploadUrlData): Promise<ImageUploadTicket> {
  const path = buildObjectPath(input, objectStamp());
  const publicUrl = publicUrlOf(path);
  // `upsert` : un renvoi du même envoi (réseau coupé après l'écriture) ne doit pas échouer ; le chemin est neuf.
  const { data, error } = await storageBucket().createSignedUploadUrl(path, { upsert: true });
  if (error || !data) {
    throw new Error(`Stockage : URL signée refusée pour ${path} (${error?.message ?? "réponse vide"})`);
  }
  return { path, signedUrl: data.signedUrl, token: data.token, publicUrl };
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
