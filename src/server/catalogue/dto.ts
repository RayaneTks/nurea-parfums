import "server-only";
import type { BrandState, PerfumeSummary, PricingRow } from "@/contracts/catalogue";
import { dzdFromDb, dzdToEur, eurFromDb, rateFromDb, toDb, toWire } from "@/domain/money";
import type { BrandCatalogMode, PublicationStatus } from "@/domain/publication";
import { VOLUMES_ML, isVolumeMl } from "@/domain/sale-line";

/**
 * Lignes de base → DTO du catalogue, partagés par le writer (réponses d'écriture) et les lectures : une
 * seule traduction des montants (`src/domain/money.ts`) et des statuts, quel que soit le chemin.
 */

type DecimalLike = { toString(): string } | string;

export type PricingDbRow = {
  volumeMl: number;
  defaultUnitPriceEur: DecimalLike;
  defaultUnitCostDzd: DecimalLike | null;
  defaultExchangeRate: DecimalLike | null;
};

export const PRICING_SELECT = {
  volumeMl: true,
  defaultUnitPriceEur: true,
  defaultUnitCostDzd: true,
  defaultExchangeRate: true,
} as const;

/** Une rangée de tarifs ; `null` pour une contenance hors règle (ligne reprise, CHECK `NOT VALID`). */
export function pricingRow(row: PricingDbRow): PricingRow | null {
  if (!isVolumeMl(row.volumeMl)) return null;
  const cost = row.defaultUnitCostDzd === null ? null : dzdFromDb(row.defaultUnitCostDzd);
  const rate = row.defaultExchangeRate === null ? null : rateFromDb(row.defaultExchangeRate);
  return {
    volumeMl: row.volumeMl,
    unitPriceEur: toWire(eurFromDb(row.defaultUnitPriceEur)),
    unitCostDzd: cost === null ? null : toDb(cost),
    exchangeRate: rate === null ? null : toDb(rate),
    unitCostEur: cost === null || rate === null ? null : toWire(dzdToEur(cost, rate)),
  };
}

/** Rangées valides, dans l'ordre 10 · 50 · 80. */
export function pricingRows(rows: readonly PricingDbRow[]): PricingRow[] {
  return rows
    .map(pricingRow)
    .filter((row): row is PricingRow => row !== null)
    .sort((a, b) => VOLUMES_ML.indexOf(a.volumeMl) - VOLUMES_ML.indexOf(b.volumeMl));
}

export function perfumeSummary(row: {
  id: number;
  brandId: string;
  name: string;
  status: PublicationStatus;
  isFeatured: boolean;
}): PerfumeSummary {
  return { id: row.id, brandId: row.brandId, name: row.name, status: row.status, isFeatured: row.isFeatured };
}

export function brandState(row: {
  id: string;
  name: string;
  status: PublicationStatus;
  catalogMode: BrandCatalogMode;
  image: string | null;
}): BrandState {
  return { id: row.id, name: row.name, status: row.status, catalogMode: row.catalogMode, image: row.image };
}
