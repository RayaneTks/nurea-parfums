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
 * Accès par le client Prisma de la transaction (`tx.db.perfumeMedia`) : l'extension de
 * `src/server/db/client.ts` inscrit le modèle écrit dans l'unité de travail, d'où l'invalidation
 * `gestion` + `admin-catalogue` sans la vitrine (04 §10.1).
 */

const MEDIA_SELECT = {
  id: true,
  url: true,
  label: true,
  width: true,
  height: true,
  bytes: true,
  sortOrder: true,
  createdAt: true,
} as const;

/** Ordre d'affichage de la galerie : rang, puis date de dépôt, puis identifiant (stable). */
const GALLERY_ORDER = [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }] as const;

type MediaRow = {
  id: string;
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

function listRows(tx: Tx, perfumeId: number): Promise<MediaRow[]> {
  return tx.db.perfumeMedia.findMany({ where: { perfumeId }, orderBy: [...GALLERY_ORDER], select: MEDIA_SELECT });
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

  const existing = await tx.db.perfumeMedia.findUnique({ where: { path: input.path }, select: MEDIA_SELECT });
  if (existing) return toItem(existing); // le préfixe vérifié garantit qu'il s'agit du même parfum

  const gallery = await tx.db.perfumeMedia.aggregate({
    where: { perfumeId: input.perfumeId },
    _count: { _all: true },
    _max: { sortOrder: true },
  });
  if (gallery._count._all >= MAX_MEDIA_PER_PERFUME) throw new DomainError("CONFLICT", MAX_MEDIA_MESSAGE);

  const created = await tx.db.perfumeMedia.create({
    data: {
      id: newId(),
      perfumeId: input.perfumeId,
      path: input.path,
      url: input.url,
      label: input.label,
      width: input.width,
      height: input.height,
      bytes: input.bytes,
      sortOrder: gallery._max.sortOrder === null ? 0 : gallery._max.sortOrder + 1,
    },
    select: MEDIA_SELECT,
  });
  return toItem(created);
}

/** Libellé libre ; `null` l'efface. Visuel absent (ou d'un autre parfum) : `NOT_FOUND`. */
export async function setMediaLabel(
  tx: Tx,
  input: { perfumeId: number; mediaId: string; label: string | null },
): Promise<PerfumeMediaItem> {
  const { count } = await tx.db.perfumeMedia.updateMany({
    where: { id: input.mediaId, perfumeId: input.perfumeId },
    data: { label: input.label },
  });
  if (count === 0) throw new DomainError("NOT_FOUND", MEDIA_NOT_FOUND_MESSAGE);
  const row = await tx.db.perfumeMedia.findUnique({ where: { id: input.mediaId }, select: MEDIA_SELECT });
  if (!row) throw new DomainError("NOT_FOUND", MEDIA_NOT_FOUND_MESSAGE);
  return toItem(row);
}

/**
 * Réordonne la galerie : les identifiants connus dans l'ordre reçu, puis ceux que l'écran n'a pas
 * envoyés, dans leur ordre actuel ; un identifiant inconnu est ignoré. Rangs recompactés 0…n−1, seules
 * les lignes dont le rang change sont écrites (24 au plus, sous le verrou du parfum).
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

  const changes = order
    .map((id, rank) => ({ id, rank }))
    .filter(({ id, rank }) => known.get(id)?.sortOrder !== rank);
  if (changes.length === 0) return rows.map(toItem);

  for (const { id, rank } of changes) {
    await tx.db.perfumeMedia.updateMany({ where: { id, perfumeId: input.perfumeId }, data: { sortOrder: rank } });
  }
  return (await listRows(tx, input.perfumeId)).map(toItem);
}

/**
 * Retire un visuel : DELETE de la ligne, et l'URL de son objet rendue pour une suppression APRÈS le commit.
 * Déjà absent : succès sans suppression d'objet (renvoi après coupure).
 */
export async function removeMedia(
  tx: Tx,
  input: { perfumeId: number; mediaId: string },
): Promise<{ removed: boolean; url: string | null }> {
  const where = { id: input.mediaId, perfumeId: input.perfumeId };
  const row = await tx.db.perfumeMedia.findFirst({ where, select: { url: true } });
  const { count } = await tx.db.perfumeMedia.deleteMany({ where });
  return row && count > 0 ? { removed: true, url: row.url } : { removed: false, url: null };
}

/**
 * URL des objets des visuels de ces parfums, à lire AVANT leur suppression : la cascade efface les lignes,
 * après le DELETE plus personne ne saurait quels objets leur appartenaient.
 */
export async function mediaUrlsOfPerfumes(tx: Tx, perfumeIds: readonly number[]): Promise<string[]> {
  if (perfumeIds.length === 0) return [];
  const rows = await tx.db.perfumeMedia.findMany({
    where: { perfumeId: { in: [...perfumeIds] } },
    select: { url: true },
  });
  return rows.map((row) => row.url);
}
