import "server-only";
import { parsePeriod, type Period, type PeriodKey } from "@/contracts/chiffres";
import { OPEN_BATCHES_HOME, type DayRecapDTO, type OpenBatchDTO, type TopPerfumesDTO } from "@/contracts/stats";
import { parisDayKey, parseParisDayKey } from "@/domain/periods";
import { cached } from "@/server/cache/cached";
import { chiffresParLot, encaisse, encaisseParPoche } from "@/server/chiffres";
import { defineQuery } from "@/server/core/define-query";
import { db } from "@/server/db/client";
import * as dto from "@/server/stats/dto";
import * as sql from "@/server/stats/sql";

/**
 * Lectures d'écran de l'Accueil et des Statistiques (06 E01, E02, E07 ; amendement A-7 de 07).
 *
 * Ce qu'on trouve ici : des unités, des comptes, des listes de documents. Ce qu'on n'y trouve JAMAIS :
 * un montant recomposé — l'Encaissé du jour et sa ventilation par poche, comme la Marge nette d'un lot,
 * viennent de `src/server/chiffres` (04 §6.1). Les montants d'un document se lisent sur la vue
 * `DocumentBalance`, qui EST la définition (03 §5.1).
 *
 * Cache `gestion` à la clé du jour de Paris (`daily`) : ces lectures dépendent toutes de « aujourd'hui »,
 * et toute écriture les invalide (04 §10.2).
 */

function periodOf(key: PeriodKey): Period {
  const period = parsePeriod(key);
  if (!period) throw new TypeError(`Statistiques : période illisible « ${key} ».`);
  return period;
}

/** Jour de Paris demandé, ou aujourd'hui ; une valeur illisible retombe sur aujourd'hui (06 E02). */
function dayOf(jour: string | null): string {
  return jour !== null && parseParisDayKey(jour) !== null ? jour : parisDayKey();
}

// ── Classement des parfums (06 E07, E01 zone 8) ────────────────────────────────

const cachedClassement = cached(
  "stats.classement",
  "gestion",
  async (periode: PeriodKey, limite: number): Promise<TopPerfumesDTO> => {
    const period = periodOf(periode);
    const now = new Date();
    const rows = await db.$queryRaw<dto.ClassementRow[]>(sql.classementSql(period, now, limite));
    if (rows.length > 0) return dto.classementDto(rows);
    // Aucune ligne classée : le total se lit à part plutôt que par une fenêtre sur zéro ligne.
    const totals = await db.$queryRaw<{ totalUnits: number }[]>(sql.classementTotalSql(period, now));
    return { totalUnits: Number(totals[0]?.totalUnits ?? 0), totalEntries: 0, entries: [] };
  },
  { daily: true },
);

/**
 * Classement des parfums d'une période, EN UNITÉS (06 E07) : `limite` premières lignes, avec le total de
 * flacons de toute la période et le nombre de lignes du classement complet (« Afficher plus »).
 */
export const classementParfums = defineQuery((periode: PeriodKey, limite: number) => cachedClassement(periode, limite));

// ── Récap du jour (06 E02) et bloc « Aujourd'hui » (06 E01 zone 4) ─────────────

const cachedRecap = cached(
  "stats.recapDuJour",
  "gestion",
  async (jour: string): Promise<Omit<DayRecapDTO, "encaisse" | "parPoche">> => {
    const now = new Date();
    const [documents, demain] = await Promise.all([
      db.$queryRaw<dto.DayDocumentRow[]>(sql.documentsDuJourSql(jour, now)),
      db.$queryRaw<dto.NextDayRow[]>(sql.livraisonsDuLendemainSql(jour, now)),
    ]);
    return dto.recapDto(jour, parisDayKey(now), documents, demain);
  },
  { daily: true },
);

/**
 * Le récap d'une journée (E02) : Encaissé du jour et sa ventilation par poche (chiffres canoniques),
 * documents du jour, livraisons du lendemain. Les créances à relancer sont lues séparément par
 * `creancesAnciennes()` — le même ensemble que l'alerte de l'Accueil (03 §5.8).
 */
export const recapDuJour = defineQuery(async (jour: string | null): Promise<DayRecapDTO> => {
  const day = dayOf(jour);
  const periode: PeriodKey = `day@${day}`;
  const [reste, encaisseJour, parPoche] = await Promise.all([
    cachedRecap(day),
    encaisse(periode),
    encaisseParPoche(periode),
  ]);
  return {
    ...reste,
    encaisse: encaisseJour,
    parPoche: parPoche.map((poche) => ({
      pocketId: poche.pocketId,
      name: poche.name,
      isSystem: poche.isSystem,
      encaisse: poche.encaisse,
    })),
  };
});

const cachedAccueilComptes = cached(
  "stats.accueilComptes",
  "gestion",
  async (): Promise<dto.AccueilComptes> =>
    dto.accueilComptesDto(parisDayKey(), await db.$queryRaw<dto.AccueilComptesRow[]>(sql.accueilComptesSql(new Date()))),
  { daily: true },
);

/**
 * Les comptes de l'Accueil en UN aller-retour : le bloc « Aujourd'hui » (06 E01 zone 4, sans son Encaissé,
 * qui vient du composite des chiffres) et les trois comptes du « vide de départ » (06 PC-12).
 *
 * Les deux compteurs de livraison ouvrent exactement les sections « aujourdhui » et « demain » de la liste
 * Commandes (05 §5.3). Mis en cache par `cached()`, donc partagé par les blocs d'un même rendu (04 §10.3).
 */
export const accueilComptes = defineQuery(() => cachedAccueilComptes());

// ── Lots ouverts (06 E01 zone 7) ───────────────────────────────────────────────

const cachedLotsOuverts = cached(
  "stats.lotsOuverts",
  "gestion",
  async (limite: number): Promise<dto.OpenBatchBase[]> =>
    dto.lotsOuvertsBase(await db.$queryRaw<dto.OpenBatchRow[]>(sql.lotsOuvertsSql(limite))),
  { daily: true },
);

/**
 * Lots ouverts de l'Accueil (3 au plus, les plus récents) avec la Marge nette de chacun, prise sur
 * `chiffresParLot()` — jamais recalculée (04 §6.6).
 */
export const lotsOuverts = defineQuery(async (limite: number = OPEN_BATCHES_HOME): Promise<OpenBatchDTO[]> => {
  const rows = await cachedLotsOuverts(limite);
  if (rows.length === 0) return [];
  const chiffres = await chiffresParLot("all");
  return dto.lotsOuvertsDto(rows, chiffres);
});

