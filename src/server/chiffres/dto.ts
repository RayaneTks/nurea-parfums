import "server-only";
import type {
  BatchFiguresDTO,
  DashboardFiguresDTO,
  DocumentBalanceDTO,
  DocumentSetDTO,
  EncaisseSerieDTO,
  MargeNetteDTO,
  PocketBalanceDTO,
  PocketEncaisseDTO,
  ReceivableDTO,
  TresorerieDTO,
} from "@/contracts/chiffres";
import type { PocketKind } from "@/contracts/treasury";
import type { DocumentOrigin, DocumentStatus } from "@/domain/document-status";
import { eurFromDb, percentOf, toWire, type MoneyString } from "@/domain/money";
import type { PeriodUnit } from "@/domain/periods";

/**
 * Lignes rendues par les fragments de `sql.ts` → DTO des chiffres : montants `numeric(12,2)::text` relus par
 * `src/domain/money.ts` (une valeur à plus de deux décimales lève : agrégat mal casté), dates en ISO 8601.
 * Aucun calcul d'argent ici, hors le pourcentage d'affichage de la Marge nette (02 §6, 03 §5.4).
 * Sans dépendance à Next : `scripts/check-invariants.ts --chiffres` s'en sert aussi.
 */

const money = (text: string): MoneyString => toWire(eurFromDb(text));

const iso = (date: Date): string => date.toISOString();

const isoOrNull = (date: Date | null): string | null => (date === null ? null : date.toISOString());

/** Un compteur SQL (`count(*)::int`) ; un `bigint` éventuel reste exact tant qu'il tient dans un entier sûr. */
function count(value: number | bigint): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw new RangeError(`chiffres : compteur illisible « ${String(value)} »`);
  return n;
}

// ── Marge nette ────────────────────────────────────────────────────────────────

/** Objet JSON de `margeNetteObjectSql`. */
export type MargeNetteJson = {
  encaisse: string;
  couts: string;
  depenses: string;
  margeNette: string;
  coutsInconnus: number;
};

export function margeNetteDto(json: MargeNetteJson): MargeNetteDTO {
  const unknown = count(json.coutsInconnus);
  return {
    value: money(json.margeNette),
    percent: percentOf(eurFromDb(json.margeNette), eurFromDb(json.encaisse)),
    encaisse: money(json.encaisse),
    costs: money(json.couts),
    expenses: money(json.depenses),
    hasUnknownCost: unknown > 0,
    unknownCostCount: unknown,
  };
}

// ── Montants seuls ─────────────────────────────────────────────────────────────

export function encaisseDto(rows: readonly { encaisse: string }[]): MoneyString {
  return money(rows[0]?.encaisse ?? "0");
}

export function aEncaisserDto(rows: readonly { aEncaisser: string }[]): MoneyString {
  return money(rows[0]?.aEncaisser ?? "0");
}

export function aEncaisserParClientDto(rows: readonly { customerId: string; aEncaisser: string }[]): Record<string, MoneyString> {
  return Object.fromEntries(rows.map((row) => [row.customerId, money(row.aEncaisser)]));
}

// ── Trésorerie ─────────────────────────────────────────────────────────────────

export type TresorerieRow = {
  id: string;
  name: string;
  kind: string;
  isSystem: boolean;
  sortOrder: number;
  openingBalance: string;
  balance: string;
  total: string;
  unassigned: string;
};

export function tresorerieDto(rows: readonly TresorerieRow[]): TresorerieDTO {
  const pockets: PocketBalanceDTO[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind as PocketKind,
    isSystem: row.isSystem,
    sortOrder: row.sortOrder,
    openingBalance: money(row.openingBalance),
    balance: money(row.balance),
  }));
  return {
    total: money(rows[0]?.total ?? "0"),
    unassigned: money(rows[0]?.unassigned ?? "0"),
    pockets,
  };
}

// ── Ensembles de documents ─────────────────────────────────────────────────────

export function documentSetDto(rows: readonly { documentId: string }[]): DocumentSetDTO {
  return { count: rows.length, documentIds: rows.map((row) => row.documentId) };
}

// ── Créances ───────────────────────────────────────────────────────────────────

export type ReceivableRow = {
  documentId: string;
  origin: string;
  status: string;
  customerId: string | null;
  customerName: string | null;
  customerKey: string;
  batchId: string | null;
  total: string;
  paid: string;
  due: string;
  orderedAt: Date;
  confirmedAt: Date | null;
  deliveredAt: Date | null;
  ageDays: number | null;
  isOld: boolean | null;
};

export function receivableDto(row: ReceivableRow): ReceivableDTO {
  // CHECK `doc_confirmed_at_ck` : un document engagé a toujours sa date d'engagement.
  if (row.confirmedAt === null || row.ageDays === null) {
    throw new Error(`chiffres : document engagé ${row.documentId} sans date d'engagement (doc_confirmed_at_ck).`);
  }
  return {
    documentId: row.documentId,
    origin: row.origin as DocumentOrigin,
    status: row.status as ReceivableDTO["status"],
    customerId: row.customerId,
    customerName: row.customerName,
    customerKey: row.customerKey,
    batchId: row.batchId,
    total: money(row.total),
    paid: money(row.paid),
    due: money(row.due),
    orderedAt: iso(row.orderedAt),
    confirmedAt: iso(row.confirmedAt),
    deliveredAt: isoOrNull(row.deliveredAt),
    ageDays: count(row.ageDays),
    isOld: row.isOld === true,
  };
}

// ── Documents ──────────────────────────────────────────────────────────────────

export type DocumentBalanceRow = {
  documentId: string;
  status: string;
  origin: string;
  customerId: string | null;
  batchId: string | null;
  confirmedAt: Date | null;
  deliveredAt: Date | null;
  total: string;
  cost: string;
  paid: string;
  due: string;
  hasUnknownCost: boolean;
};

export function documentBalanceDto(rows: readonly DocumentBalanceRow[]): Record<string, DocumentBalanceDTO> {
  return Object.fromEntries(
    rows.map((row) => [
      row.documentId,
      {
        documentId: row.documentId,
        status: row.status as DocumentStatus,
        origin: row.origin as DocumentOrigin,
        customerId: row.customerId,
        batchId: row.batchId,
        confirmedAt: isoOrNull(row.confirmedAt),
        deliveredAt: isoOrNull(row.deliveredAt),
        total: money(row.total),
        cost: money(row.cost),
        paid: money(row.paid),
        due: money(row.due),
        hasUnknownCost: row.hasUnknownCost,
      },
    ]),
  );
}

// ── Lots ───────────────────────────────────────────────────────────────────────

export type BatchFiguresRow = { batchId: string; aEncaisser: string; margeNette: MargeNetteJson };

export function chiffresParLotDto(rows: readonly BatchFiguresRow[]): Record<string, BatchFiguresDTO> {
  return Object.fromEntries(
    rows.map((row) => {
      const margeNette = margeNetteDto(row.margeNette);
      return [row.batchId, { batchId: row.batchId, encaisse: margeNette.encaisse, aEncaisser: money(row.aEncaisser), margeNette }];
    }),
  );
}

// ── Séries et ventilations ─────────────────────────────────────────────────────

export function encaisseSerieDto(bucket: PeriodUnit, rows: readonly { from: Date; to: Date; encaisse: string }[]): EncaisseSerieDTO {
  return { bucket, points: rows.map((row) => ({ from: iso(row.from), to: iso(row.to), encaisse: money(row.encaisse) })) };
}

export function encaisseParPocheDto(
  rows: readonly { pocketId: string; name: string; isSystem: boolean; encaisse: string }[],
): PocketEncaisseDTO[] {
  return rows.map((row) => ({ pocketId: row.pocketId, name: row.name, isSystem: row.isSystem, encaisse: money(row.encaisse) }));
}

// ── Accueil ────────────────────────────────────────────────────────────────────

export type DashboardRow = {
  monthFrom: Date;
  monthTo: Date;
  encaisseMois: string;
  encaisseJour: string;
  margeNetteMois: MargeNetteJson;
  aEncaisser: string;
  tresorerieTotal: string;
  tresorerieUnassigned: string;
  enRetard: number;
  clientsARelancer: number;
  coutACompleter: number;
  commandesEnAttente: number;
  commandesConfirmees: number;
};

/** Le composite sans les alertes de stock, qui viennent du catalogue (cache `admin-catalogue`). */
export type DashboardFigures = Omit<DashboardFiguresDTO, "stock">;

export function tableauDeBordDto(rows: readonly DashboardRow[]): DashboardFigures {
  const row = rows[0];
  if (!row) throw new Error("chiffres : le composite de l'Accueil n'a rendu aucune ligne.");
  return {
    month: { from: iso(row.monthFrom), to: iso(row.monthTo) },
    encaisseMois: money(row.encaisseMois),
    encaisseJour: money(row.encaisseJour),
    margeNetteMois: margeNetteDto(row.margeNetteMois),
    aEncaisser: money(row.aEncaisser),
    tresorerie: { total: money(row.tresorerieTotal), unassigned: money(row.tresorerieUnassigned) },
    enRetard: count(row.enRetard),
    clientsARelancer: count(row.clientsARelancer),
    coutACompleter: count(row.coutACompleter),
    commandes: { enAttente: count(row.commandesEnAttente), confirmees: count(row.commandesConfirmees) },
  };
}
