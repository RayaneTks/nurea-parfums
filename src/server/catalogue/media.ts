import { prisma } from "@/lib/db/prisma";

/**
 * Visuels marketing d'un parfum — lecture et écriture.
 *
 * Ces planches ne servent pas la vitrine : elles servent la personne qui, à
 * 22 h, cherche le visuel d'un parfum pour le publier en story. Elles vivent
 * donc du côté gestion, rangées par parfum, et se retrouvent par le catalogue
 * plutôt qu'en faisant défiler quarante images d'une pellicule.
 */

export type PerfumeMediaRow = {
  id: string;
  url: string;
  path: string;
  label: string | null;
  width: number;
  height: number;
  bytes: number;
  sortOrder: number;
  createdAt: string;
};

export type PerfumeMediaInput = {
  url: string;
  path: string;
  label?: string | null;
  width: number;
  height: number;
  bytes: number;
};

function toRow(m: {
  id: string;
  url: string;
  path: string;
  label: string | null;
  width: number;
  height: number;
  bytes: number;
  sortOrder: number;
  createdAt: Date;
}): PerfumeMediaRow {
  return {
    id: m.id,
    url: m.url,
    path: m.path,
    label: m.label,
    width: m.width,
    height: m.height,
    bytes: m.bytes,
    sortOrder: m.sortOrder,
    createdAt: m.createdAt.toISOString(),
  };
}

export async function listPerfumeMedia(perfumeId: number): Promise<PerfumeMediaRow[]> {
  const rows = await prisma.perfumeMedia.findMany({
    where: { perfumeId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toRow);
}

/** Combien de visuels par parfum, pour pastiller la liste du catalogue. */
export async function countMediaByPerfume(): Promise<Map<number, number>> {
  const rows = await prisma.perfumeMedia.groupBy({
    by: ["perfumeId"],
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.perfumeId, r._count._all]));
}

/**
 * Ajoute un visuel à la fin de la galerie.
 *
 * `sortOrder` est calculé, jamais reçu du client : deux envois simultanés
 * depuis deux onglets s'attribueraient sinon le même rang, et la galerie
 * afficherait un ordre différent à chaque rechargement.
 */
export async function addPerfumeMedia(
  perfumeId: number,
  input: PerfumeMediaInput,
): Promise<PerfumeMediaRow> {
  const last = await prisma.perfumeMedia.findFirst({
    where: { perfumeId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const created = await prisma.perfumeMedia.create({
    data: {
      perfumeId,
      url: input.url,
      path: input.path,
      label: input.label?.trim() || null,
      width: input.width,
      height: input.height,
      bytes: input.bytes,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  return toRow(created);
}

/**
 * Retire un visuel et rend le chemin de l'objet à effacer du bucket.
 *
 * Le chemin est rendu plutôt qu'effacé ici : la couche stockage n'a rien à
 * faire dans une requête de base, et l'appelant sait, lui, si la suppression
 * en base a bien eu lieu avant de toucher au fichier.
 */
export async function removePerfumeMedia(
  perfumeId: number,
  mediaId: string,
): Promise<string | null> {
  const media = await prisma.perfumeMedia.findFirst({
    where: { id: mediaId, perfumeId },
    select: { id: true, path: true },
  });
  if (!media) return null;
  await prisma.perfumeMedia.delete({ where: { id: media.id } });
  return media.path;
}

/** Réordonne la galerie. Les identifiants inconnus sont ignorés. */
export async function reorderPerfumeMedia(
  perfumeId: number,
  orderedIds: readonly string[],
): Promise<void> {
  const known = await prisma.perfumeMedia.findMany({
    where: { perfumeId },
    select: { id: true },
  });
  const knownIds = new Set(known.map((m) => m.id));
  const ops = orderedIds
    .filter((id) => knownIds.has(id))
    .map((id, index) =>
      prisma.perfumeMedia.update({ where: { id }, data: { sortOrder: index } }),
    );
  if (ops.length > 0) await prisma.$transaction(ops);
}
