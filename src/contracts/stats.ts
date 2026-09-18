/**
 * Contrat des lectures d'écran de l'Accueil et des Statistiques (06 E01, E02, E07 ; amendement A-7 de 07).
 *
 * Ces lectures ne sont PAS des chiffres du vocabulaire canonique (02 §6) : le classement se compte en
 * unités, le récap du jour ne fait que regrouper des chiffres déjà définis (`encaisse`, `encaisseParPoche`,
 * `creancesAnciennes`). Tout montant qui apparaît ici vient de `src/server/chiffres` — jamais d'une somme
 * recomposée (04 §6.1).
 */
import { PERIOD_PARAMS, periodFromParams, type PeriodKey, type PeriodParam } from "./chiffres";
import type { DocumentOrigin, DocumentStatus } from "@/domain/document-status";
import type { MoneyString } from "@/domain/money";
import { parisDayKey, parseParisDayKey } from "@/domain/periods";

// ── Classement des parfums (E07, E01 zone 8) ───────────────────────────────────

/**
 * Une ligne du classement, comptée en UNITÉS : Σ `SaleLine.quantity` des lignes non offertes des documents
 * engagés de la période (06 E07). Un parfum du catalogue est identifié par `perfumeId` ; une ligne hors
 * catalogue (ou dont le parfum a été supprimé depuis) se regroupe sur son nom normalisé.
 */
export type TopPerfumeDTO = {
  /** Rang dans le classement, à partir de 1 ; les ex æquo se départagent par le nom. */
  rank: number;
  /** Clé de regroupement (`parfum:12`, `nom:oud mood`) : identifiant de rangée stable. */
  key: string;
  /** Parfum du catalogue, s'il existe encore. */
  perfumeId: number | null;
  /** Nom vivant du parfum, à défaut le snapshot de la ligne (06 E07). */
  name: string;
  brandName: string | null;
  /** Visuel vivant, à défaut le snapshot ; null si la ligne n'en a jamais eu. */
  image: string | null;
  /** Flacons vendus sur la période. */
  units: number;
  /** Ligne saisie hors catalogue (`SaleLine.isOffCatalog`) : badge « Hors catalogue » (06 E07). */
  isOffCatalog: boolean;
};

/** Le classement d'une période (E07) : les `entries` demandées, et de quoi écrire le sous-titre. */
export type TopPerfumesDTO = {
  /** Σ des unités de TOUTE la période, pas seulement des lignes rendues (« 84 flacons vendus · septembre »). */
  totalUnits: number;
  /** Nombre de lignes du classement complet : « Afficher plus » n'existe que s'il en reste. */
  totalEntries: number;
  entries: TopPerfumeDTO[];
};

/** Pas de « Afficher plus » de E07 : 20 lignes de plus à chaque fois (06 E07). */
export const TOP_PERFUMES_PAGE = 20;

/** Lignes du bloc « Top parfums · (mois) » de l'Accueil (06 E01 zone 8). */
export const TOP_PERFUMES_HOME = 5;

/** `?pages=` de E07 → nombre de lignes à lire. Une page illisible ou hors bornes vaut une page. */
export function topPerfumesLimit(pages: number): number {
  return TOP_PERFUMES_PAGE * Math.min(Math.max(Math.trunc(pages) || 1, 1), 25);
}

// ── Paramètres d'URL de E07 et E02 (06 §1.2) ───────────────────────────────────

/** Paramètres de E07 : période (défaut le mois, comme la Compta) et pages affichées. */
export type StatsParams = { periode: PeriodParam; ref: string | null; pages: number };

/**
 * `?periode=&ref=&pages=` → paramètres de E07. Valeur inconnue : le mois courant, une page. `ref` n'a pas de
 * sens pour « Tout » et un jour inexistant est ignoré (retour à la période courante).
 */
export function parseStatsParams(params: {
  periode?: string | null;
  ref?: string | null;
  pages?: string | null;
}): StatsParams {
  const periode = params.periode && params.periode in PERIOD_PARAMS ? (params.periode as PeriodParam) : "mois";
  const ref = periode !== "tout" && params.ref && parseParisDayKey(params.ref) !== null ? params.ref : null;
  const pages = Number.parseInt(params.pages ?? "", 10);
  return { periode, ref, pages: Number.isSafeInteger(pages) && pages > 1 ? Math.min(pages, 25) : 1 };
}

/** La clé de période des chiffres pour ces paramètres (mêmes règles que la Compta). */
export function statsPeriodKey(params: Pick<StatsParams, "periode" | "ref">): PeriodKey {
  return periodFromParams({ periode: params.periode, ref: params.ref }, "mois");
}

/** `?jour=AAAA-MM-JJ` de E02 → jour de Paris ; absent ou illisible : aujourd'hui. */
export function parseJourParam(value: string | null | undefined, now: Date = new Date()): string {
  return value && parseParisDayKey(value) !== null ? value : parisDayKey(now);
}

// ── Récap du jour (E02, E01 zone 4) ────────────────────────────────────────────

/** Ce qu'un document du jour raconte dans le récap (06 E02 zone 3). */
export type DayDocumentKind =
  /** Vente directe enregistrée ce jour-là. */
  | "vente"
  /** Commande prise ce jour-là. */
  | "commande-prise"
  /** Commande livrée ce jour-là (elle a pu être prise un autre jour). */
  | "commande-livree";

/** Un document du récap. Les montants viennent de la vue `DocumentBalance` (03 §5.1). */
export type DayDocumentDTO = {
  documentId: string;
  origin: DocumentOrigin;
  status: DocumentStatus;
  kind: DayDocumentKind;
  /** Nom vivant de la fiche, à défaut le nom saisi ; null pour un client de passage anonyme. */
  customerName: string | null;
  /** Nombre d'articles (Σ quantités), pour « Vente · 2 articles ». */
  itemCount: number;
  total: MoneyString;
  due: MoneyString;
  /** ISO 8601 : moment qui a fait entrer le document dans la journée. */
  at: string;
};

/** Une commande prévue le lendemain (06 E02 zone 4). */
export type NextDayDeliveryDTO = {
  documentId: string;
  status: "PENDING" | "CONFIRMED";
  customerName: string | null;
  total: MoneyString;
  due: MoneyString;
  /** ISO 8601 ; `hasTime` dit si une heure a été choisie (06 E10, E11). */
  expectedDeliveryAt: string;
  hasTime: boolean;
};

/**
 * Le récap d'une journée (E02). `jour` est un jour de Paris « AAAA-MM-JJ » ; les bornes sont calculées en
 * SQL (04 §6.5). `encaisse` et `parPoche` sont les chiffres canoniques du jour, jamais recomposés.
 */
export type DayRecapDTO = {
  jour: string;
  /** Vrai si `jour` est aujourd'hui à Paris : le navigateur de date n'avance pas au-delà. */
  isToday: boolean;
  /** Jour précédent, et suivant tant qu'on n'est pas sur aujourd'hui (06 E02 zone 1). */
  previousDay: string;
  nextDay: string | null;
  encaisse: MoneyString;
  /** Ventilation par poche de l'Encaissé du jour : Σ = `encaisse` (03 §5.2). */
  parPoche: { pocketId: string; name: string; isSystem: boolean; encaisse: MoneyString }[];
  documents: DayDocumentDTO[];
  /** Commandes prévues le lendemain du jour affiché. */
  demain: NextDayDeliveryDTO[];
  /** Vrai quand rien n'est arrivé ce jour-là : « Rien d'enregistré ce jour-là. » (06 E02). */
  isEmpty: boolean;
};

/** Le bloc « Aujourd'hui » de l'Accueil (06 E01 zone 4) : ce qui se lit à 0 tap. */
export type TodayDTO = {
  jour: string;
  encaisse: MoneyString;
  /** Ventes directes enregistrées aujourd'hui. */
  ventes: number;
  /** Commandes prises aujourd'hui. */
  commandesPrises: number;
  /** Commandes à livrer aujourd'hui, et demain (masquées à 0 : 06 E01 zone 4). */
  aLivrerAujourdhui: number;
  aLivrerDemain: number;
};

// ── Lots ouverts (E01 zone 7) ──────────────────────────────────────────────────

/** Un lot ouvert du bloc « Lots ouverts » : sa Marge nette vient de `chiffresParLot()` (04 §6.6). */
export type OpenBatchDTO = {
  id: string;
  name: string;
  /** Arrivée prévue (ISO 8601), si elle est renseignée. */
  expectedAt: string | null;
  /** Documents rattachés au lot, annulés compris (ce que la fiche du lot montre). */
  documentCount: number;
  margeNette: MoneyString;
  /** Au moins un document du lot est au coût à compléter : la Marge nette est provisoire (06 S19). */
  hasUnknownCost: boolean;
};

/** Lots rendus par le bloc « Lots ouverts » (06 E01 zone 7 : « 3 au plus, les plus récents »). */
export const OPEN_BATCHES_HOME = 3;

// ── Vide de première utilisation (E01, PC-12) ──────────────────────────────────

/**
 * De quoi décider si l'Accueil est dans son « vide de départ » (05 §5.1, 06 PC-12) et cocher les trois
 * étapes de la carte « Pour commencer ». Trois compteurs, pas un chiffre d'argent.
 */
export type FirstRunDTO = {
  /** Poches non système : « Créer tes poches ». */
  pockets: number;
  perfumes: number;
  documents: number;
};

/**
 * Témoin de la carte « Nouveautés » (06 E01 zone 2) dans le stockage local de l'appareil : « J'ai compris »
 * la ferme DÉFINITIVEMENT, sur ce téléphone. Rien à écrire en base pour un accusé de lecture.
 *
 * La clé vit dans le contrat pour que les tests d'affichage posent le même témoin que l'écran.
 */
export const NEWS_SEEN_KEY = "nurea-accueil-nouveautes-v1";

/** Vrai quand rien n'existe encore : l'Accueil oriente au lieu d'afficher des zéros (05 §5.1). */
export function isFirstRun(state: FirstRunDTO): boolean {
  return state.documents === 0 && state.perfumes === 0;
}

/** Les trois étapes de la carte « Pour commencer » sont faites : la carte disparaît (06 PC-12). */
export function firstRunDone(state: FirstRunDTO): boolean {
  return state.pockets > 0 && state.perfumes > 0 && state.documents > 0;
}
