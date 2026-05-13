import { prisma } from "@/lib/db/prisma";

export type PerfumePricingRow = {
  perfumeId: number;
  volumeMl: number;
  defaultUnitPriceEur: string;
  defaultUnitCostDzd: string | null;
};

export async function listPricingsForPerfume(perfumeId: number): Promise<PerfumePricingRow[]> {
  const rows = await prisma.perfumePricing.findMany({
    where: { perfumeId },
    orderBy: { volumeMl: "asc" },
  });
  return rows.map((r) => ({
    perfumeId: r.perfumeId,
    volumeMl: r.volumeMl,
    defaultUnitPriceEur: r.defaultUnitPriceEur.toString(),
    defaultUnitCostDzd: r.defaultUnitCostDzd?.toString() ?? null,
  }));
}

export async function lookupPricing(
  perfumeId: number,
  volumeMl: number,
): Promise<PerfumePricingRow | null> {
  const r = await prisma.perfumePricing.findUnique({
    where: { perfumeId_volumeMl: { perfumeId, volumeMl } },
  });
  if (!r) return null;
  return {
    perfumeId: r.perfumeId,
    volumeMl: r.volumeMl,
    defaultUnitPriceEur: r.defaultUnitPriceEur.toString(),
    defaultUnitCostDzd: r.defaultUnitCostDzd?.toString() ?? null,
  };
}

/**
 * Batch lookup pour pré-remplir form commande. Retourne map (perfumeId-volumeMl) → row.
 */
export async function batchLookupPricings(
  pairs: readonly { perfumeId: number; volumeMl: number }[],
): Promise<Map<string, PerfumePricingRow>> {
  if (pairs.length === 0) return new Map();
  const rows = await prisma.perfumePricing.findMany({
    where: {
      OR: pairs.map((p) => ({ perfumeId: p.perfumeId, volumeMl: p.volumeMl })),
    },
  });
  const map = new Map<string, PerfumePricingRow>();
  for (const r of rows) {
    map.set(`${r.perfumeId}_${r.volumeMl}`, {
      perfumeId: r.perfumeId,
      volumeMl: r.volumeMl,
      defaultUnitPriceEur: r.defaultUnitPriceEur.toString(),
      defaultUnitCostDzd: r.defaultUnitCostDzd?.toString() ?? null,
    });
  }
  return map;
}
