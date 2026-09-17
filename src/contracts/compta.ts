/**
 * Contrat des écrans de la Compta (06 E03 vue Ventes, E04 Journal) et de l'export CSV (04 §3.5, 07 J12).
 *
 * Ce module ne calcule AUCUN chiffre : il lit les paramètres d'URL, nomme les périodes telles que l'écran les
 * affiche (« Encaissé · septembre ») et décrit les lignes de la liste « Documents de la période ». Les montants
 * viennent de `src/server/chiffres` ; les bornes métier d'une période sont calculées en SQL (04 §6.5). Les bornes
 * calculées ici (`src/domain/periods.ts`, jumeau testé de `nurea_period_start`) ne servent qu'à la navigation
 * « ‹ septembre 2026 › » et aux jours `du`/`au` de l'export.
 */
import type { DocumentOrigin, DocumentStatus } from "@/domain/document-status";
import type { MoneyString } from "@/domain/money";
import { parisDayKey, parseParisDayKey, periodBounds, periodLabel, type PeriodUnit } from "@/domain/periods";
import { PERIOD_PARAMS, periodFromParams, periodKey, type PeriodKey, type PeriodParam } from "./chiffres";

// ── Paramètres de E03 ──────────────────────────────────────────────────────────

export const COMPTA_VIEWS = ["ventes", "tresorerie"] as const;
export type ComptaView = (typeof COMPTA_VIEWS)[number];

/** Seul filtre de la liste des documents (06 E03 zone 4, A-15). */
export const COMPTA_FILTERS = ["cout-a-completer"] as const;
export type ComptaFilter = (typeof COMPTA_FILTERS)[number];

export const COMPTA_SEARCH_MAX_LENGTH = 120;

export type ComptaParams = {
  vue: ComptaView;
  periode: PeriodParam;
  /** Jour de Paris « AAAA-MM-JJ » dans la période affichée ; `null` : la période qui contient aujourd'hui. */
  ref: string | null;
  q: string;
  filtre: ComptaFilter | null;
};

const includes = <T extends string>(values: readonly T[], value: string | null | undefined): value is T =>
  value !== null && value !== undefined && (values as readonly string[]).includes(value);

/**
 * `?vue=&periode=&ref=&q=&filtre=` → paramètres de E03 (06 §1.2). Valeur inconnue : défaut (Ventes, Mois, sans
 * filtre). `ref` n'a pas de sens pour « Tout » et un jour inexistant est ignoré (retour à aujourd'hui).
 */
export function parseComptaParams(params: {
  vue?: string | null;
  periode?: string | null;
  ref?: string | null;
  q?: string | null;
  filtre?: string | null;
}): ComptaParams {
  const vue = includes(COMPTA_VIEWS, params.vue) ? params.vue : "ventes";
  const periode = params.periode && params.periode in PERIOD_PARAMS ? (params.periode as PeriodParam) : "mois";
  const ref = periode !== "tout" && params.ref && parseParisDayKey(params.ref) !== null ? params.ref : null;
  const q = (params.q ?? "").trim().slice(0, COMPTA_SEARCH_MAX_LENGTH);
  const filtre = includes(COMPTA_FILTERS, params.filtre) ? params.filtre : null;
  return { vue, periode, ref, q, filtre };
}

/** La clé de période des chiffres (`src/contracts/chiffres.ts`) pour ces paramètres. */
export function comptaPeriodKey(params: Pick<ComptaParams, "periode" | "ref">): PeriodKey {
  return periodFromParams(params, "mois");
}

// ── Noms de période ────────────────────────────────────────────────────────────

const unitOf = (periode: PeriodParam): PeriodUnit | "all" => PERIOD_PARAMS[periode];

/** Instant de référence : 00:00 à Paris du jour `ref`, sinon maintenant. */
function refInstant(ref: string | null, now: Date): Date {
  return (ref ? parseParisDayKey(ref) : null) ?? now;
}

const yearOf = (instant: Date) => parisDayKey(instant).slice(0, 4);

/**
 * Nom de la période accolé à un chiffre de flux (06 §1.7) : « aujourd'hui », « hier », « cette semaine »,
 * « septembre », « 2026 », « depuis le début » ; hors de l'année courante, l'année s'ajoute (« août 2025 »).
 */
export function figurePeriodLabel(periode: PeriodParam, ref: string | null, now: Date = new Date()): string {
  const unit = unitOf(periode);
  if (unit === "all") return "depuis le début";
  const instant = refInstant(ref, now);
  const withYear = yearOf(instant) !== yearOf(now);
  const current = periodBounds(unit, now);
  const shown = periodBounds(unit, instant);
  const isCurrent = shown.from.getTime() === current.from.getTime();
  switch (unit) {
    case "day": {
      if (isCurrent) return "aujourd'hui";
      if (shown.from.getTime() === periodBounds("day", now, -1).from.getTime()) return "hier";
      return periodLabel("day", instant, { withYear });
    }
    case "week":
      return isCurrent ? "cette semaine" : periodLabel("week", instant, { withYear });
    case "month":
      return periodLabel("month", instant, { withYear });
    case "year":
      return periodLabel("year", instant);
    default: {
      const exhaustive: never = unit;
      throw new Error(`Unité de période inconnue : ${exhaustive as string}`);
    }
  }
}

/**
 * Le navigateur « ‹ septembre 2026 › » (06 E03 zone 1, E04 zone 1) : libellé complet, `ref` de la période
 * précédente et de la suivante. `next` vaut `null` sur la période qui contient aujourd'hui (rien à lire dans le
 * futur) ; `next.ref` vaut `null` quand la suivante EST la période courante (l'URL redevient nue).
 */
export type PeriodNavigation = {
  label: string;
  previous: { ref: string };
  next: { ref: string | null } | null;
};

export function periodNavigation(periode: PeriodParam, ref: string | null, now: Date = new Date()): PeriodNavigation | null {
  const unit = unitOf(periode);
  if (unit === "all") return null;
  const instant = refInstant(ref, now);
  const shown = periodBounds(unit, instant);
  const current = periodBounds(unit, now);
  const following = periodBounds(unit, instant, 1);
  const isCurrent = shown.from.getTime() >= current.from.getTime();
  return {
    label: periodLabel(unit, instant),
    previous: { ref: parisDayKey(periodBounds(unit, instant, -1).from) },
    next: isCurrent ? null : { ref: following.from.getTime() === current.from.getTime() ? null : parisDayKey(following.from) },
  };
}

/** Titre du graphe (06 E03 zone 3) ; `null` pour un jour : un seul point, pas de graphe. */
export function seriesTitle(periode: PeriodParam): string | null {
  switch (periode) {
    case "jour":
      return null;
    case "semaine":
      return "Encaissé par jour";
    case "mois":
      return "Encaissé par semaine";
    case "annee":
    case "tout":
      return "Encaissé par mois";
    default: {
      const exhaustive: never = periode;
      throw new Error(`Période inconnue : ${exhaustive as string}`);
    }
  }
}

// ── Journal (E04) ──────────────────────────────────────────────────────────────

const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** `?mois=AAAA-MM` → mois lu (courant si absent ou illisible). */
export function parseJournalMonth(value: string | null | undefined, now: Date = new Date()): string {
  return value && MONTH_KEY.test(value) ? value : parisDayKey(now).slice(0, 7);
}

/** « ‹ septembre 2026 › » du journal : `mois` des voisins ; `next` nul sur le mois courant. */
export function journalNavigation(month: string, now: Date = new Date()): { label: string; figureLabel: string; previous: string; next: string | null } {
  const instant = parseParisDayKey(`${month}-01`) ?? now;
  const current = parisDayKey(now).slice(0, 7);
  const previous = parisDayKey(periodBounds("month", instant, -1).from).slice(0, 7);
  const following = parisDayKey(periodBounds("month", instant, 1).from).slice(0, 7);
  return {
    label: periodLabel("month", instant),
    figureLabel: periodLabel("month", instant, { withYear: yearOf(instant) !== yearOf(now) }),
    previous,
    next: month >= current ? null : following,
  };
}

// ── Export CSV (04 §3.5, 07 J12) ───────────────────────────────────────────────

/** Jours de Paris, bornes comprises ; `null` : depuis le début. */
export type ExportRange = { du: string; au: string } | null;

/** Période de l'écran → jours `du`/`au` de l'export : exactement la même période (06 E03 « même période que l'écran »). */
export function exportRangeOf(params: Pick<ComptaParams, "periode" | "ref">, now: Date = new Date()): ExportRange {
  const unit = unitOf(params.periode);
  if (unit === "all") return null;
  const { from, to } = periodBounds(unit, refInstant(params.ref, now));
  return { du: parisDayKey(from), au: parisDayKey(new Date(to.getTime() - 1)) };
}

/** Adresse de la route de lecture (une API, pas un écran : hors de `src/app-shell/routes.ts`). */
export function exportComptaUrl(range: ExportRange): string {
  return range ? `/api/admin/export/compta?du=${range.du}&au=${range.au}` : "/api/admin/export/compta";
}

/** « compta-2026-09-01-au-2026-09-30.csv », « compta-depuis-le-debut.csv ». */
export function exportFileName(range: ExportRange): string {
  return range ? `compta-${range.du}-au-${range.au}.csv` : "compta-depuis-le-debut.csv";
}

export const EXPORT_PERIOD_MESSAGE = "Période d'export illisible : indique du=AAAA-MM-JJ et au=AAAA-MM-JJ, le premier jour avant le dernier.";

/**
 * `?du=&au=` → clé de période des chiffres : l'intervalle [00:00 de `du`, 00:00 du lendemain de `au`[ à Paris,
 * ou « depuis toujours » sans aucun des deux. `null` : paramètres illisibles (un seul des deux, jour inexistant,
 * ordre inversé).
 */
export function parseExportParams(params: { du?: string | null; au?: string | null }): { periode: PeriodKey; range: ExportRange } | null {
  const du = params.du ?? "";
  const au = params.au ?? "";
  if (du === "" && au === "") return { periode: "all", range: null };
  const from = parseParisDayKey(du);
  const last = parseParisDayKey(au);
  if (!from || !last || last.getTime() < from.getTime()) return null;
  const to = periodBounds("day", last).to;
  return { periode: periodKey({ kind: "range", from: from.toISOString(), to: to.toISOString() }), range: { du, au } };
}

// ── Documents de la période (E03 zone 5) ───────────────────────────────────────

export type ComptaDocumentRowDTO = {
  id: string;
  origin: DocumentOrigin;
  status: DocumentStatus;
  /** Nom vivant de la fiche, à défaut le nom saisi ; null : « Client de passage ». */
  customerName: string | null;
  /** ISO 8601. */
  orderedAt: string;
  /** Σ quantités (« 2 articles »). */
  itemCount: number;
  total: MoneyString;
  due: MoneyString;
  hasUnknownCost: boolean;
};

export type ComptaDocumentSectionDTO = {
  /** « lot:<id> » ou « hors-lot ». */
  key: string;
  /** `null` : la section « Hors lot ». */
  batch: { id: string; name: string; status: "OPEN" | "CLOSED" } | null;
  rows: ComptaDocumentRowDTO[];
};

export type ComptaDocumentsDTO = {
  periode: PeriodKey;
  q: string;
  filtre: ComptaFilter | null;
  /**
   * Documents du périmètre avant recherche : ceux de la période (paiement ou engagement dans la période), ou, sous
   * le filtre, ceux au coût à compléter — la recherche s'affiche au-delà de 6.
   */
  scopeCount: number;
  /** Documents affichés, recherche appliquée. */
  total: number;
  /** Lots ouverts d'abord, puis clos, puis « Hors lot ». */
  sections: ComptaDocumentSectionDTO[];
};
