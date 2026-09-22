import "server-only";
import {
  SERIES_BUCKET,
  parsePeriod,
  type BatchFiguresDTO,
  type DashboardFiguresDTO,
  type DocumentBalanceDTO,
  type DocumentSetDTO,
  type EncaisseSerieDTO,
  type MargeNetteDTO,
  type Period,
  type PeriodKey,
  type PocketEncaisseDTO,
  type ReceivableDTO,
  type TresorerieDTO,
} from "@/contracts/chiffres";
import type { MoneyString } from "@/domain/money";
import { cached } from "@/server/cache/cached";
import { stockAlerts } from "@/server/catalogue/queries";
import * as dto from "@/server/chiffres/dto";
import * as sql from "@/server/chiffres/sql";
import { defineQuery } from "@/server/core/define-query";
import { db } from "@/server/db/client";

/**
 * Les chiffres de la gestion (04 §6) : UNE fonction par chiffre, chacune exécute le fragment de sa définition
 * (`sql.ts`, 03 §5). Aucun écran, aucune requête de domaine, aucun export ne recompose un chiffre.
 *
 * - Arguments primitifs (clé de période, identifiants) : `react.cache` déduplique, `cached()` s'en sert de clé
 *   (04 §8.4, §10.3). Une clé de période illisible est une faute d'écran : l'écran la lit par
 *   `periodFromParams` (`src/contracts/chiffres.ts`).
 * - Cache inter-requêtes `gestion` (invalidé par toute écriture, filet de 60 s) ; clé du jour de Paris pour ce
 *   qui dépend d'aujourd'hui. Exceptions (04 §10.4) : `documentBalance` (fiche ouverte pour agir) et
 *   `tresorerie("instant")` (poches lues par un formulaire d'écriture) ne sont jamais cachées.
 * - « Maintenant » est l'horloge du serveur, passée au SQL qui en tire les bornes en Europe/Paris (04 §6.5).
 */

/** `instant` : lecture exacte, hors cache, pour un formulaire d'écriture (04 §10.4). */
export type Fraicheur = "cache" | "instant";

function periodOf(key: PeriodKey): Period {
  const period = parsePeriod(key);
  if (!period) throw new TypeError(`Chiffres : période illisible « ${key} ».`);
  return period;
}

// ── Encaissé (03 §5.2) ─────────────────────────────────────────────────────────

const cachedEncaisse = cached(
  "chiffres.encaisse",
  "gestion",
  async (periode: PeriodKey, batchId: string | null, customerId: string | null): Promise<MoneyString> =>
    dto.encaisseDto(await db.$queryRaw(sql.encaisseSql({ period: periodOf(periode), now: new Date(), batchId, customerId }))),
  { daily: true },
);

/** Encaissé d'une période (« all » : depuis toujours), d'un lot ou d'un client. */
export const encaisse = defineQuery((periode: PeriodKey = "all", batchId: string | null = null, customerId: string | null = null) =>
  cachedEncaisse(periode, batchId, customerId),
);

const cachedEncaisseParPoche = cached(
  "chiffres.encaisseParPoche",
  "gestion",
  async (periode: PeriodKey): Promise<PocketEncaisseDTO[]> =>
    dto.encaisseParPocheDto(await db.$queryRaw(sql.encaisseParPocheSql({ period: periodOf(periode), now: new Date() }))),
  { daily: true },
);

/** Encaissé d'une période par poche (E02 « Récap du jour ») ; Σ = `encaisse(periode)`. */
export const encaisseParPoche = defineQuery((periode: PeriodKey) => cachedEncaisseParPoche(periode));

const cachedEncaisseSerie = cached(
  "chiffres.encaisseSerie",
  "gestion",
  async (periode: PeriodKey): Promise<EncaisseSerieDTO> => {
    const period = periodOf(periode);
    const bucket = SERIES_BUCKET[period.kind === "calendar" ? period.unit : "all"];
    return dto.encaisseSerieDto(bucket, await db.$queryRaw(sql.encaisseSerieSql(period, new Date())));
  },
  { daily: true },
);

/**
 * Graphe « Encaissé par … » (E03 zone 3, remplace `encaisseParSemaine(8)`) : par jour pour une semaine, par
 * semaine pour un mois, par mois pour une année et « Tout » ; Σ des points = `encaisse(periode)`.
 */
export const encaisseSerie = defineQuery((periode: PeriodKey) => cachedEncaisseSerie(periode));

// ── À encaisser (03 §5.3, §5.8) ────────────────────────────────────────────────

const cachedAEncaisser = cached(
  "chiffres.aEncaisser",
  "gestion",
  async (batchId: string | null, customerId: string | null): Promise<MoneyString> =>
    dto.aEncaisserDto(await db.$queryRaw(sql.aEncaisserSql({ now: new Date(), batchId, customerId }))),
);

/** À encaisser à date : un encours, jamais daté d'une période. */
export const aEncaisser = defineQuery((batchId: string | null = null, customerId: string | null = null) =>
  cachedAEncaisser(batchId, customerId),
);

const cachedAEncaisserDetail = cached(
  "chiffres.aEncaisserDetail",
  "gestion",
  async (): Promise<ReceivableDTO[]> =>
    (await db.$queryRaw<dto.ReceivableRow[]>(sql.receivablesSql(new Date()))).map(dto.receivableDto),
  { daily: true },
);

/** Écran À encaisser (E13) : les créances sommées par `aEncaisser()`, plus anciennes d'abord. */
export const aEncaisserDetail = defineQuery(() => cachedAEncaisserDetail());

const cachedCreancesAnciennes = cached(
  "chiffres.creancesAnciennes",
  "gestion",
  async (): Promise<ReceivableDTO[]> =>
    (await db.$queryRaw<dto.ReceivableRow[]>(sql.receivablesSql(new Date(), { oldOnly: true }))).map(dto.receivableDto),
  { daily: true },
);

/** Créances anciennes (03 §5.8) : alerte « à relancer » de E01, bloc de E02, filtre « Plus de 30 jours » de E13. */
export const creancesAnciennes = defineQuery(() => cachedCreancesAnciennes());

const cachedAEncaisserParClient = cached(
  "chiffres.aEncaisserParClient",
  "gestion",
  async (): Promise<Record<string, MoneyString>> =>
    dto.aEncaisserParClientDto(await db.$queryRaw(sql.aEncaisserParClientSql(new Date()))),
);

/** À encaisser de chaque fiche client qui en porte (badges de E12, bouton « Encaisser » de S17). */
export const aEncaisserParClient = defineQuery(() => cachedAEncaisserParClient());

// ── Marge nette (03 §5.4) ──────────────────────────────────────────────────────

const cachedMargeNette = cached(
  "chiffres.margeNette",
  "gestion",
  async (periode: PeriodKey, batchId: string | null): Promise<MargeNetteDTO> => {
    const [row] = await db.$queryRaw<{ margeNette: dto.MargeNetteJson }[]>(
      sql.margeNetteSql({ period: periodOf(periode), now: new Date(), batchId }),
    );
    if (!row) throw new Error("Chiffres : la Marge nette n'a rendu aucune ligne.");
    return dto.margeNetteDto(row.margeNette);
  },
  { daily: true },
);

/** Marge nette : globale, d'une période, d'un lot, d'un lot sur une période. */
export const margeNette = defineQuery((periode: PeriodKey = "all", batchId: string | null = null) =>
  cachedMargeNette(periode, batchId),
);

const cachedCoutACompleter = cached(
  "chiffres.coutACompleter",
  "gestion",
  async (periode: PeriodKey, batchId: string | null): Promise<DocumentSetDTO> =>
    dto.documentSetDto(await db.$queryRaw(sql.coutACompleterSql({ period: periodOf(periode), now: new Date(), batchId }))),
  { daily: true },
);

/** Documents engagés au coût à compléter : les coûts comptés 0 de la Marge nette du même périmètre (S19, E03). */
export const coutACompleter = defineQuery((periode: PeriodKey = "all", batchId: string | null = null) =>
  cachedCoutACompleter(periode, batchId),
);

const cachedChiffresParLot = cached(
  "chiffres.chiffresParLot",
  "gestion",
  async (periode: PeriodKey): Promise<Record<string, BatchFiguresDTO>> =>
    dto.chiffresParLotDto(await db.$queryRaw(sql.chiffresParLotSql(periodOf(periode), new Date()))),
  { daily: true },
);

/** Encaissé, À encaisser et Marge nette de chaque lot (E05), en une requête. */
export const chiffresParLot = defineQuery((periode: PeriodKey = "all") => cachedChiffresParLot(periode));

// ── Trésorerie (03 §5.5) ───────────────────────────────────────────────────────

async function loadTresorerie(): Promise<TresorerieDTO> {
  return dto.tresorerieDto(await db.$queryRaw(sql.tresorerieSql()));
}

const cachedTresorerie = cached("chiffres.tresorerie", "gestion", loadTresorerie);

/** Trésorerie, « non attribué » et soldes des poches actives ; seule source des soldes (`activePockets` compris). */
export const tresorerie = defineQuery((fraicheur: Fraicheur = "cache") =>
  fraicheur === "instant" ? loadTresorerie() : cachedTresorerie(),
);

// ── En retard (03 §5.6) ────────────────────────────────────────────────────────

const cachedEnRetard = cached(
  "chiffres.enRetard",
  "gestion",
  async (): Promise<DocumentSetDTO> => dto.documentSetDto(await db.$queryRaw(sql.enRetardSql(new Date()))),
  { daily: true },
);

/** Documents en retard : groupe de E10, alerte de E01 — le lien ouvre exactement cet ensemble. */
export const enRetard = defineQuery(() => cachedEnRetard());

// ── Documents ──────────────────────────────────────────────────────────────────

/** Total, coût, payé et dû de documents (fiche document S01) ; jamais caché : on encaisse sur ces montants. */
export const documentBalance = defineQuery(
  async (...ids: string[]): Promise<Record<string, DocumentBalanceDTO>> =>
    ids.length === 0 ? {} : dto.documentBalanceDto(await db.$queryRaw(sql.documentBalanceSql(ids))),
);

const cachedDocumentsDeLaPeriode = cached(
  "chiffres.documentsDeLaPeriode",
  "gestion",
  async (periode: PeriodKey): Promise<DocumentSetDTO> =>
    dto.documentSetDto(await db.$queryRaw(sql.documentsDeLaPeriodeSql(periodOf(periode), new Date()))),
  { daily: true },
);

/** Documents d'une période (E03 zone 5) : un paiement ou un engagement dans la période. */
export const documentsDeLaPeriode = defineQuery((periode: PeriodKey) => cachedDocumentsDeLaPeriode(periode));

// ── Accueil (04 §6.3, A-13) ────────────────────────────────────────────────────

const cachedTableauDeBord = cached(
  "chiffres.tableauDeBord",
  "gestion",
  async (): Promise<dto.DashboardFigures> => dto.tableauDeBordDto(await db.$queryRaw(sql.tableauDeBordSql(new Date()))),
  { daily: true },
);

/**
 * L'Accueil : Encaissé et Marge nette du mois, À encaisser, Trésorerie, compteurs de E01 — une requête — et
 * les alertes de stock du catalogue (`stockAlerts()`, cache `admin-catalogue`, 04 §6.6, §11).
 */
export const tableauDeBord = defineQuery(async (): Promise<DashboardFiguresDTO> => {
  const [figures, stock] = await Promise.all([cachedTableauDeBord(), stockAlerts()]);
  return { ...figures, stock };
});
