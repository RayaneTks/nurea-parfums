import "server-only";
import {
  MAX_MEDIA_MESSAGE,
  MAX_MEDIA_PER_PERFUME,
  MEDIA_NOT_FOUND_MESSAGE,
  STORY_PATH_MESSAGE,
  isStoryPathOf,
  type PerfumeMediaItem,
} from "@/contracts/catalogue";
import { DomainError } from "@/domain/errors";
import { newId } from "@/domain/ids";
import type { Tx } from "@/server/db/transaction";
import { recordWrite } from "@/server/db/unit-of-work";

/**
 * Seul fichier qui écrit `PerfumeMedia`, les visuels story d'un parfum (04 §4.3, §12 ; 03 §3).
 *
 * Ces planches ne servent pas la vitrine : elles servent la personne qui, à 22 h, cherche le visuel d'un
 * parfum pour le publier en story. Elles vivent donc du côté gestion, rangées sur la fiche du parfum.
 *
 * Règles tenues ici, sous le verrou de la ligne `Perfume` (rang 4, 04 §4.2) : chemin exactement
 * `stories/<perfumeId>/…` (revérifié, même si le contrat l'a déjà fait), rang calculé (deux dépôts
 * simultanés ne prennent pas le même), 24 visuels au plus. Le retrait rend l'URL de l'objet : c'est
 * l'action qui le supprime du bucket, APRÈS le commit (`storage.commitThenRemoveObjects`).
 *
 * *Accès SQL paramétré, provisoire* : le client Prisma généré au moment du jalon J11 ne connaît pas encore
 * le modèle `PerfumeMedia` (le moteur est tenu par un serveur de développement sous Windows). Les requêtes
 * restent limitées à ce fichier, portent le nom de la table en dur, et inscrivent elles-mêmes le modèle
 * dans l'unité de travail (`recordWrite`) comme le ferait l'extension de `src/server/db/client.ts`. Après
 * `prisma generate`, elles se traduisent une à une en `tx.db.perfumeMedia.*` sans changer de signature.
 */

const MODEL = "PerfumeMedia";

type MediaRow = {
  id: string;
  perfumeId: number;
  path: string;
  url: string;
  label: string | null;
  width: number;
  height: number;
  bytes: number;
  sortOrder: number;
  createdAt: Date;
};

export const PERFUME_NOT_FOUND_MESSAGE = "Ce parfum n'existe plus. Il a peut-être été supprimé depuis un autre écran.";

function toItem(row: MediaRow): PerfumeMediaItem {
  return {
    id: row.id,
    url: row.url,
    label: row.label,
    width: row.width,
    height: row.height,
    bytes: row.bytes,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Sérialise les écritures de la galerie d'un parfum ; `NOT_FOUND` si le parfum a disparu. */
async function lockPerfume(tx: Tx, perfumeId: number): Promise<void> {
  const { perfumes } = await tx.lock({ perfumes: [perfumeId] });
  if (perfumes.length === 0) throw new DomainError("NOT_FOUND", PERFUME_NOT_FOUND_MESSAGE);
}

async function listRows(tx: Tx, perfumeId: number): Promise<MediaRow[]> {
  return tx.db.$queryRaw<MediaRow[]>`
    SELECT id, "perfumeId", path, url, label, width, height, bytes, "sortOrder", "createdAt"
    FROM "PerfumeMedia" WHERE "perfumeId" = ${perfumeId}
    ORDER BY "sortOrder" ASC, "createdAt" ASC, id ASC`;
}

export type NewMedia = {
  perfumeId: number;
  /** Chemin rendu par `createImageUploadUrlAction({ usage: "story" })`. */
  path: string;
  /** URL recalculée par l'action depuis `path` (`storage.publicUrlOf`), jamais reçue du client. */
  url: string;
  label: string | null;
  width: number;
  height: number;
  bytes: number;
};

/**
 * Range un visuel déposé à la fin de la galerie. Un second envoi du même chemin (double tap, « Réessayer »
 * après coupure) rend la ligne déjà rangée sans rien écrire.
 */
export async function addMedia(tx: Tx, input: NewMedia): Promise<PerfumeMediaItem> {
  if (!isStoryPathOf(input.perfumeId, input.path)) throw new DomainError("VALIDATION", STORY_PATH_MESSAGE, "path");
  await lockPerfume(tx, input.perfumeId);

  const [existing] = await tx.db.$queryRaw<MediaRow[]>`
    SELECT id, "perfumeId", path, url, label, width, height, bytes, "sortOrder", "createdAt"
    FROM "PerfumeMedia" WHERE path = ${input.path}`;
  if (existing) return toItem(existing); // le préfixe vérifié garantit qu'il s'agit du même parfum

  const [gallery] = await tx.db.$queryRaw<{ count: number; next: number }[]>`
    SELECT count(*)::int AS count, COALESCE(max("sortOrder") + 1, 0)::int AS next
    FROM "PerfumeMedia" WHERE "perfumeId" = ${input.perfumeId}`;
  if ((gallery?.count ?? 0) >= MAX_MEDIA_PER_PERFUME) throw new DomainError("CONFLICT", MAX_MEDIA_MESSAGE);

  recordWrite(MODEL);
  const [created] = await tx.db.$queryRaw<MediaRow[]>`
    INSERT INTO "PerfumeMedia" (id, "perfumeId", path, url, label, width, height, bytes, "sortOrder")
    VALUES (${newId()}, ${input.perfumeId}, ${input.path}, ${input.url}, ${input.label},
            ${input.width}, ${input.height}, ${input.bytes}, ${gallery?.next ?? 0})
    RETURNING id, "perfumeId", path, url, label, width, height, bytes, "sortOrder", "createdAt"`;
  if (!created) throw new Error("PerfumeMedia : insertion sans ligne rendue");
  return toItem(created);
}

/** Libellé libre ; `null` l'efface. Visuel absent (ou d'un autre parfum) : `NOT_FOUND`. */
export async function setMediaLabel(
  tx: Tx,
  input: { perfumeId: number; mediaId: string; label: string | null },
): Promise<PerfumeMediaItem> {
  recordWrite(MODEL);
  const [row] = await tx.db.$queryRaw<MediaRow[]>`
    UPDATE "PerfumeMedia" SET label = ${input.label}
    WHERE id = ${input.mediaId} AND "perfumeId" = ${input.perfumeId}
    RETURNING id, "perfumeId", path, url, label, width, height, bytes, "sortOrder", "createdAt"`;
  if (!row) throw new DomainError("NOT_FOUND", MEDIA_NOT_FOUND_MESSAGE);
  return toItem(row);
}

/**
 * Réordonne la galerie en une écriture : les identifiants connus dans l'ordre reçu, puis ceux que l'écran
 * n'a pas envoyés, dans leur ordre actuel ; un identifiant inconnu est ignoré. Rangs recompactés 0…n−1.
 */
export async function reorderMedia(
  tx: Tx,
  input: { perfumeId: number; orderedIds: readonly string[] },
): Promise<PerfumeMediaItem[]> {
  await lockPerfume(tx, input.perfumeId);
  const rows = await listRows(tx, input.perfumeId);
  const known = new Map(rows.map((row) => [row.id, row]));
  const placed = new Set<string>();
  for (const id of input.orderedIds) if (known.has(id)) placed.add(id);
  const order = [...placed, ...rows.map((row) => row.id).filter((id) => !placed.has(id))];

  const changes = order.filter((id, index) => known.get(id)?.sortOrder !== index);
  if (changes.length === 0) return rows.map(toItem);

  const ids = order;
  const ranks = order.map((_, index) => index);
  recordWrite(MODEL);
  await tx.db.$queryRaw`
    UPDATE "PerfumeMedia" AS m SET "sortOrder" = v.rank
    FROM unnest(${ids}::text[], ${ranks}::int[]) AS v(id, rank)
    WHERE m.id = v.id AND m."perfumeId" = ${input.perfumeId} AND m."sortOrder" <> v.rank
    RETURNING m.id`;
  return (await listRows(tx, input.perfumeId)).map(toItem);
}

/**
 * Retire un visuel : DELETE de la ligne, et l'URL de son objet rendue pour une suppression APRÈS le commit.
 * Déjà absent : succès sans écriture (renvoi après coupure).
 */
export async function removeMedia(
  tx: Tx,
  input: { perfumeId: number; mediaId: string },
): Promise<{ removed: boolean; url: string | null }> {
  recordWrite(MODEL);
  const [row] = await tx.db.$queryRaw<{ url: string }[]>`
    DELETE FROM "PerfumeMedia" WHERE id = ${input.mediaId} AND "perfumeId" = ${input.perfumeId}
    RETURNING url`;
  return row ? { removed: true, url: row.url } : { removed: false, url: null };
}

/**
 * URL des objets des visuels de ces parfums, à lire AVANT leur suppression : la cascade efface les lignes,
 * après le DELETE plus personne ne saurait quels objets leur appartenaient.
 */
export async function mediaUrlsOfPerfumes(tx: Tx, perfumeIds: readonly number[]): Promise<string[]> {
  if (perfumeIds.length === 0) return [];
  const rows = await tx.db.$queryRaw<{ url: string }[]>`
    SELECT url FROM "PerfumeMedia" WHERE "perfumeId" = ANY(${[...perfumeIds]}::int[])`;
  return rows.map((row) => row.url);
}
