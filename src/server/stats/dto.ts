import "server-only";
import type { BatchFiguresDTO } from "@/contracts/chiffres";
import type {
  DayDocumentDTO,
  DayDocumentKind,
  DayRecapDTO,
  FirstRunDTO,
  NextDayDeliveryDTO,
  OpenBatchDTO,
  TodayDTO,
  TopPerfumesDTO,
} from "@/contracts/stats";
import type { DocumentOrigin, DocumentStatus } from "@/domain/document-status";
import { eurFromDb, toWire, type MoneyString } from "@/domain/money";
import { parisDayKey, parseParisDayKey, periodBounds } from "@/domain/periods";

/**
 * Lignes rendues par `src/server/stats/sql.ts` → DTO des écrans E01, E02 et E07. Montants
 * `numeric(12,2)::text` relus par `src/domain/money.ts`, dates en ISO 8601, compteurs entiers.
 * Aucun calcul d'argent ici (04 §5.3) : les montants ne sont que transcrits.
 */

const money = (text: string): MoneyString => toWire(eurFromDb(text));

const iso = (date: Date): string => date.toISOString();

function count(value: number | bigint): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw new RangeError(`stats : compteur illisible « ${String(value)} »`);
  return n;
}

// ── Classement (E07) ───────────────────────────────────────────────────────────

export type ClassementRow = {
  key: string;
  perfumeId: number | null;
  isOffCatalog: boolean;
  units: number;
  name: string;
  brandName: string | null;
  image: string | null;
  rank: number;
  totalUnits: number;
  totalEntries: number;
};

export function classementDto(rows: readonly ClassementRow[]): TopPerfumesDTO {
  const first = rows[0];
  if (!first) return { totalUnits: 0, totalEntries: 0, entries: [] };
  return {
    totalUnits: count(first.totalUnits),
    totalEntries: count(first.totalEntries),
    entries: rows.map((row) => ({
      rank: count(row.rank),
      key: row.key,
      perfumeId: row.perfumeId === null ? null : count(row.perfumeId),
      name: row.name,
      brandName: row.brandName,
      image: row.image,
      units: count(row.units),
      isOffCatalog: row.isOffCatalog,
    })),
  };
}

// ── Récap du jour (E02) ────────────────────────────────────────────────────────

export type DayDocumentRow = {
  documentId: string;
  origin: string;
  status: string;
  kind: string;
  customerName: string | null;
  itemCount: number;
  total: string;
  due: string;
  at: Date;
};

export type NextDayRow = {
  documentId: string;
  status: string;
  customerName: string | null;
  total: string;
  due: string;
  expectedDeliveryAt: Date;
  hasTime: boolean;
};

function dayDocumentDto(row: DayDocumentRow): DayDocumentDTO {
  return {
    documentId: row.documentId,
    origin: row.origin as DocumentOrigin,
    status: row.status as DocumentStatus,
    kind: row.kind as DayDocumentKind,
    customerName: row.customerName,
    itemCount: count(row.itemCount),
    total: money(row.total),
    due: money(row.due),
    at: iso(row.at),
  };
}

function nextDayDto(row: NextDayRow): NextDayDeliveryDTO {
  return {
    documentId: row.documentId,
    status: row.status as NextDayDeliveryDTO["status"],
    customerName: row.customerName,
    total: money(row.total),
    due: money(row.due),
    expectedDeliveryAt: iso(row.expectedDeliveryAt),
    hasTime: row.hasTime,
  };
}

/**
 * Jour de Paris voisin, par le CALENDRIER : `periodBounds("day", …, ±1)` — jamais une addition de
 * 86 400 000 ms, qui saute ou répète une heure aux changements d'heure (04 §6.5).
 */
export function shiftDay(jour: string, days: number): string {
  const midnight = parseParisDayKey(jour);
  if (!midnight) throw new TypeError(`stats : jour illisible « ${jour} ».`);
  return parisDayKey(periodBounds("day", midnight, days).from);
}

export function recapDto(
  jour: string,
  today: string,
  documents: readonly DayDocumentRow[],
  demain: readonly NextDayRow[],
): Omit<DayRecapDTO, "encaisse" | "parPoche"> {
  const isToday = jour === today;
  return {
    jour,
    isToday,
    previousDay: shiftDay(jour, -1),
    nextDay: isToday ? null : shiftDay(jour, 1),
    documents: documents.map(dayDocumentDto),
    demain: demain.map(nextDayDto),
    // « Vide » veut dire : rien ne s'est passé ce jour-là. Une livraison prévue le lendemain n'est pas
    // un fait du jour — l'Encaissé, lui, est jugé par l'écran (un jour à 0 € sans document est vide).
    isEmpty: documents.length === 0,
  };
}

// ── Comptes de l'Accueil : bloc « Aujourd'hui » (E01 zone 4) et vide de départ ─

export type AccueilComptesRow = {
  ventes: number;
  commandesPrises: number;
  aLivrerAujourdhui: number;
  aLivrerDemain: number;
  pockets: number;
  perfumes: number;
  documents: number;
  batches: number;
};

/** Ce que sert l'unique requête de comptes de l'Accueil (zone 4, vide de départ, zone 7). */
export type AccueilComptes = {
  aujourdhui: Omit<TodayDTO, "encaisse">;
  premiereUtilisation: FirstRunDTO;
  /** Lots existants, tous statuts : décide de la rangée « Créer un lot » (06 E01 zone 7). */
  batches: number;
};

export function accueilComptesDto(jour: string, rows: readonly AccueilComptesRow[]): AccueilComptes {
  const row = rows[0];
  if (!row) throw new Error("stats : les comptes de l'Accueil n'ont rendu aucune ligne.");
  return {
    aujourdhui: {
      jour,
      ventes: count(row.ventes),
      commandesPrises: count(row.commandesPrises),
      aLivrerAujourdhui: count(row.aLivrerAujourdhui),
      aLivrerDemain: count(row.aLivrerDemain),
    },
    premiereUtilisation: {
      pockets: count(row.pockets),
      perfumes: count(row.perfumes),
      documents: count(row.documents),
    },
    batches: count(row.batches),
  };
}

// ── Lots ouverts (E01 zone 7) ──────────────────────────────────────────────────

export type OpenBatchRow = { id: string; name: string; expectedAt: Date | null; documentCount: number };

/** Lot ouvert sans sa Marge nette : la forme mise en cache (dates en ISO, aucun `Date`). */
export type OpenBatchBase = Omit<OpenBatchDTO, "margeNette" | "hasUnknownCost">;

export function lotsOuvertsBase(rows: readonly OpenBatchRow[]): OpenBatchBase[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    expectedAt: row.expectedAt === null ? null : iso(row.expectedAt),
    documentCount: count(row.documentCount),
  }));
}

export function lotsOuvertsDto(
  rows: readonly OpenBatchBase[],
  chiffres: Readonly<Record<string, BatchFiguresDTO>>,
): OpenBatchDTO[] {
  return rows.map((row) => {
    const figures = chiffres[row.id];
    return {
      ...row,
      // Un lot sans document n'a pas de ligne de chiffres : sa Marge nette est nulle, pas inconnue.
      margeNette: figures?.margeNette.value ?? money("0"),
      hasUnknownCost: figures?.margeNette.hasUnknownCost ?? false,
    };
  });
}
