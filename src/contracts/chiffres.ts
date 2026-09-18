/**
 * Contrat du module des chiffres (04 §6 ; définitions 03 §5 ; vocabulaire 02 §6 ; écrans E01, E02, E03, E05,
 * E06, E12, E13, E14, S19).
 *
 * Deux choses seulement : la PÉRIODE telle qu'elle voyage (une clé de chaîne, donc un argument de
 * `defineQuery` et une clé de cache, 04 §8.4, §10.3) et la forme des chiffres rendus (montants en
 * `MoneyString`, dates ISO 8601). Les bornes d'une période ne sont jamais calculées ici : la clé dit « le mois
 * qui contient le 17 septembre », `src/server/chiffres/sql.ts` en tire les bornes en SQL, Europe/Paris (04 §6.5).
 *
 * Clés de période :
 *   « all »                                   depuis toujours ;
 *   « month », « week », « day », « year »    la période calendaire qui contient maintenant ;
 *   « month@2026-09-17 »                      celle qui contient ce jour de Paris (paramètre `ref` des écrans) ;
 *   « month-1 », « month@2026-09-17+2 »       décalée de N unités (−1 = la précédente) ;
 *   « <instant ISO>/<instant ISO> »           l'intervalle [from, to[ (export d'une période choisie).
 */
import type { DocumentOrigin, DocumentStatus } from "@/domain/document-status";
import type { MoneyString } from "@/domain/money";
import { parseParisDayKey, type PeriodUnit } from "@/domain/periods";
import type { StockAlerts } from "./catalogue";
import type { PocketKind } from "./treasury";

// ── Périodes ───────────────────────────────────────────────────────────────────

export const PERIOD_UNITS = ["day", "week", "month", "year"] as const satisfies readonly PeriodUnit[];

export type Period =
  | { kind: "all" }
  /** `ref` : jour de Paris « AAAA-MM-JJ » (null = aujourd'hui) ; `offset` : unités de décalage. */
  | { kind: "calendar"; unit: PeriodUnit; ref: string | null; offset: number }
  /** Instants ISO 8601, intervalle `[from, to[`. */
  | { kind: "range"; from: string; to: string };

/** Une période sous forme de clé (voir l'en-tête). */
export type PeriodKey = string;

const CALENDAR_KEY = /^(day|week|month|year)(?:@(\d{4}-\d{2}-\d{2}))?([+-]\d{1,4})?$/;
const RANGE_KEY = /^([^/\s]+)\/([^/\s]+)$/;
/** Un instant de bornage porte son fuseau : jamais une heure « locale » ambiguë. */
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

function parseInstant(text: string): Date | null {
  if (!INSTANT.test(text)) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Clé → période ; `null` pour une clé illisible, un jour inexistant ou un intervalle vide. */
export function parsePeriod(key: string): Period | null {
  if (key === "all") return { kind: "all" };
  const calendar = CALENDAR_KEY.exec(key);
  if (calendar) {
    const ref = calendar[2] ?? null;
    if (ref !== null && parseParisDayKey(ref) === null) return null;
    return { kind: "calendar", unit: calendar[1] as PeriodUnit, ref, offset: Number(calendar[3] ?? 0) };
  }
  const range = RANGE_KEY.exec(key);
  if (range) {
    const from = parseInstant(range[1] as string);
    const to = parseInstant(range[2] as string);
    if (!from || !to || from.getTime() >= to.getTime()) return null;
    return { kind: "range", from: from.toISOString(), to: to.toISOString() };
  }
  return null;
}

/** Période → clé canonique (`parsePeriod(periodKey(p))` rend `p`). */
export function periodKey(period: Period): PeriodKey {
  switch (period.kind) {
    case "all":
      return "all";
    case "calendar": {
      const ref = period.ref === null ? "" : `@${period.ref}`;
      const offset = period.offset === 0 ? "" : period.offset > 0 ? `+${period.offset}` : String(period.offset);
      return `${period.unit}${ref}${offset}`;
    }
    case "range":
      return `${new Date(period.from).toISOString()}/${new Date(period.to).toISOString()}`;
    default: {
      const _exhaustive: never = period;
      throw new Error(`Période inconnue : ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/** Valeurs du paramètre d'URL `periode` (06 §8.1.7 ; E03, E07). */
export const PERIOD_PARAMS = { jour: "day", semaine: "week", mois: "month", annee: "year", tout: "all" } as const;
export type PeriodParam = keyof typeof PERIOD_PARAMS;

/**
 * `?periode=&ref=` → clé. Un paramètre absent ou illisible retombe sur `fallback` (le mois, en Compta) ; `ref`
 * n'a pas de sens pour « tout » et un jour inexistant est ignoré (le navigateur revient à aujourd'hui).
 */
export function periodFromParams(
  params: { periode?: string | null; ref?: string | null },
  fallback: PeriodParam = "mois",
): PeriodKey {
  const param = params.periode && params.periode in PERIOD_PARAMS ? (params.periode as PeriodParam) : fallback;
  const unit = PERIOD_PARAMS[param];
  if (unit === "all") return "all";
  const ref = params.ref && parseParisDayKey(params.ref) !== null ? params.ref : null;
  return periodKey({ kind: "calendar", unit, ref, offset: 0 });
}

/**
 * Pas du graphe « Encaissé par … » (E03 zone 3) : par jour pour une semaine, par semaine pour un mois, par mois
 * pour une année et pour « Tout ». Un jour n'a qu'un point (graphe absent sous 2 points).
 */
export const SERIES_BUCKET: Record<PeriodUnit | "all", PeriodUnit> = {
  day: "day",
  week: "day",
  month: "week",
  year: "month",
  all: "month",
};

// ── Chiffres rendus ────────────────────────────────────────────────────────────

/**
 * Marge nette d'un périmètre (03 §5.4) : Encaissé − coûts d'achat des documents engagés − dépenses de lot,
 * avec ses composantes (S19 : « Encaissé · − Coûts d'achat · − Dépenses de lot · = Marge nette »).
 */
export type MargeNetteDTO = {
  value: MoneyString;
  /** « 38,5 » : Marge nette ÷ Encaissé du même périmètre ; null si l'Encaissé est nul (non affiché). */
  percent: string | null;
  encaisse: MoneyString;
  /** Coûts d'achat des documents engagés dans le périmètre, coûts inconnus comptés 0. */
  costs: MoneyString;
  /** Dépenses de lot, contre-passations déduites. */
  expenses: MoneyString;
  /** Au moins un document engagé du périmètre a un coût inconnu (« coût à compléter »). */
  hasUnknownCost: boolean;
  /** Nombre de ces documents (S19 : « 2 documents au coût à compléter, comptés 0 € »). */
  unknownCostCount: number;
};

/** Une poche active et son solde (03 §5.5). */
export type PocketBalanceDTO = {
  id: string;
  name: string;
  kind: PocketKind;
  isSystem: boolean;
  sortOrder: number;
  openingBalance: MoneyString;
  /** Solde d'ouverture + Σ mouvements signés. */
  balance: MoneyString;
};

/** Trésorerie (03 §5.5) : poches actives dans l'ordre choisi, « Non attribué » en dernier. */
export type TresorerieDTO = {
  total: MoneyString;
  /** Solde de la poche système « Non attribué » (0 si elle n'existe pas encore). */
  unassigned: MoneyString;
  pockets: PocketBalanceDTO[];
};

/** Un ensemble de documents compté par un chiffre : le lien de l'alerte ouvre exactement ces documents. */
export type DocumentSetDTO = { count: number; documentIds: string[] };

/**
 * Une créance : document engagé à dû > 0 (03 §5.3, écran E13). La liste de `aEncaisserDetail()` est
 * exactement l'ensemble sommé par `aEncaisser()` ; celle de `creancesAnciennes()` en est la partie ancienne.
 */
export type ReceivableDTO = {
  documentId: string;
  origin: DocumentOrigin;
  status: "CONFIRMED" | "DELIVERED";
  customerId: string | null;
  /** Nom vivant de la fiche, à défaut le nom saisi ; null pour un client de passage anonyme. */
  customerName: string | null;
  /** Clé de regroupement de E13 : la fiche liée, sinon le nom saisi (03 §5.8). */
  customerKey: string;
  batchId: string | null;
  total: MoneyString;
  paid: MoneyString;
  due: MoneyString;
  /** ISO 8601. */
  orderedAt: string;
  confirmedAt: string;
  deliveredAt: string | null;
  /** « depuis N j » : jours calendaires Europe/Paris depuis l'engagement. */
  ageDays: number;
  /** Créance ancienne (N > 30, 03 §5.8). */
  isOld: boolean;
};

/**
 * Total, coût, payé et dû d'un document : les colonnes de la vue `DocumentBalance` (03 §5.1). Jumeau :
 * `documentBalance()` de `src/domain/document-balance.ts` (`cost` ↔ `knownCost`, 04 §6.4).
 */
export type DocumentBalanceDTO = {
  documentId: string;
  status: DocumentStatus;
  origin: DocumentOrigin;
  customerId: string | null;
  batchId: string | null;
  confirmedAt: string | null;
  deliveredAt: string | null;
  total: MoneyString;
  /** Coûts connus, inconnus comptés 0. */
  cost: MoneyString;
  paid: MoneyString;
  due: MoneyString;
  hasUnknownCost: boolean;
};

/** Chiffres d'un lot (E05, E06) : mêmes fragments que les chiffres globaux, groupés par lot. */
export type BatchFiguresDTO = {
  batchId: string;
  encaisse: MoneyString;
  aEncaisser: MoneyString;
  margeNette: MargeNetteDTO;
};

/** Un point du graphe : l'Encaissé de `[from, to[`, borné à la période demandée. */
export type SeriesPointDTO = { from: string; to: string; encaisse: MoneyString };

export type EncaisseSerieDTO = {
  bucket: PeriodUnit;
  /** Points consécutifs, vides compris ; Σ des points = Encaissé de la période. */
  points: SeriesPointDTO[];
};

/** Encaissé d'une période ventilé par poche (E02 : « Espèces 180 € », « Banque 60 € »). */
export type PocketEncaisseDTO = {
  pocketId: string;
  name: string;
  isSystem: boolean;
  encaisse: MoneyString;
};

/**
 * L'Accueil en un aller-retour (04 §6.3, A-13) : Encaissé et Marge nette du mois, Encaissé du jour, À encaisser
 * et Trésorerie à date — jamais d'Encaissé depuis toujours — et les compteurs de E01 ; alertes de stock du
 * catalogue.
 */
export type DashboardFiguresDTO = {
  /** Bornes du mois compté (ISO 8601) : « Encaissé · septembre ». */
  month: { from: string; to: string };
  encaisseMois: MoneyString;
  /** Encaissé d'aujourd'hui (06 E01 zone 4 « Encaissé aujourd'hui », E02) : même définition, période du jour. */
  encaisseJour: MoneyString;
  margeNetteMois: MargeNetteDTO;
  aEncaisser: MoneyString;
  tresorerie: { total: MoneyString; unassigned: MoneyString };
  /** Documents en retard (03 §5.6) → `/admin/commandes?filtre=retard`. */
  enRetard: number;
  /** Clients qui portent une créance ancienne (03 §5.8) → `/admin/encaisser?anciennete=30`. */
  clientsARelancer: number;
  /** Documents engagés au coût à compléter, depuis toujours → Compta « Tout », filtre coût à compléter. */
  coutACompleter: number;
  /** Commandes à livrer (E01 zone 6). */
  commandes: { enAttente: number; confirmees: number };
  stock: StockAlerts;
};
