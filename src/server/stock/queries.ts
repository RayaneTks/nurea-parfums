import "server-only";
import type { StockBottleDTO } from "@/contracts/stock";
import { eurFromDb, toWire } from "@/domain/money";
import { defineQuery } from "@/server/core/define-query";
import { db } from "@/server/db/client";

/** Flacons disponibles (aucune vente ne les a repris), les plus récents d'abord. Hors cache : la liste est courte. */
export const availableBottles = defineQuery(async (): Promise<StockBottleDTO[]> => {
  const rows = await db.stockBottle.findMany({
    where: { soldLineId: null },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      perfumeId: true,
      perfumeName: true,
      brandName: true,
      imageUrl: true,
      volumeMl: true,
      plannedPriceEur: true,
      unitCostEur: true,
      sourceCustomer: true,
      sourceDocumentId: true,
      createdAt: true,
      sourceDocument: { select: { orderedAt: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    perfumeId: row.perfumeId,
    perfumeName: row.perfumeName,
    brandName: row.brandName,
    imageUrl: row.imageUrl,
    volumeMl: row.volumeMl,
    plannedPriceEur: toWire(eurFromDb(row.plannedPriceEur)),
    unitCostEur: row.unitCostEur === null ? null : toWire(eurFromDb(row.unitCostEur)),
    sourceCustomer: row.sourceCustomer,
    sourceDocumentId: row.sourceDocumentId,
    sourceOrderedAt: row.sourceDocument?.orderedAt.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
});
