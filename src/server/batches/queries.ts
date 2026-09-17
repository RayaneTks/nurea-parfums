import "server-only";
import type { BatchSummary } from "@/contracts/batches";
import { defineQuery } from "@/server/core/define-query";
import { db } from "@/server/db/client";

/**
 * Lectures du module lots pour les formulaires (J8 : sélecteur de lot S07 de la fiche document). Jamais mises en
 * cache inter-requêtes : un rattachement se décide sur l'état du moment (04 §10.4). Les écrans des lots (E05,
 * E06, E21) et leurs requêtes arrivent au jalon J13.
 */

/** S07 : les lots ouverts, le plus récent en tête (06 S07 « lots ouverts, le plus récent en tête »). */
export const openBatches = defineQuery(async (): Promise<BatchSummary[]> => {
  const rows = await db.batch.findMany({
    where: { status: "OPEN" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, name: true, status: true, expectedAt: true, notes: true },
  });
  return rows.map((row) => ({ ...row, expectedAt: row.expectedAt?.toISOString() ?? null }));
});
