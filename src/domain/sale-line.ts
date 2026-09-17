/**
 * Règles d'une ligne de document, jumelles des CHECK de `SaleLine` (03 §4.9).
 *
 * Deux usages, une seule écriture des règles :
 * - le contrat de saisie (`src/contracts/documents.ts`) refuse une ligne neuve ou modifiée qui les
 *   enfreint, avec le message placé sous le champ ;
 * - le writer `documents` confronte une ligne DÉJÀ en base à ces règles avant toute transaction qui
 *   la met à jour (03 §4.3, « lignes reprises hors des règles de ligne ») : une contrainte restée
 *   `NOT VALID` après la reprise est vérifiée par PostgreSQL à chaque mise à jour de la ligne, quelle
 *   que soit la colonne modifiée. Sans cette garde, pointer une livraison sur une ligne reprise sans
 *   volume échouerait en erreur de base ; avec elle, le gérant lit ce qu'il faut compléter.
 */
import { eur, type Eur } from "./money";

/**
 * Contenances réellement vendues : 10, 50 et 80 ml (CHECK `line_volume_ck`, `pricing_volume_ck`, 03 §4.9).
 * La production a traduit son historique le 10/09/2026 (`20260910120000_real_volumes_10_50_80` :
 * 30 → 10, 100 → 80) ; une contenance héritée restée non traduite est hors règle.
 */
export const VOLUMES_ML = [10, 50, 80] as const;
export type VolumeMl = (typeof VOLUMES_ML)[number];

/**
 * Contenance PROPOSÉE à la saisie d'une ligne sans mémoire de prix (défaut de l'existant, 100 → 80).
 * Jamais écrite en silence : une écriture sans contenance est refusée (03 §4.2).
 */
export const DEFAULT_VOLUME_ML: VolumeMl = 80;

export function isVolumeMl(value: unknown): value is VolumeMl {
  return typeof value === "number" && (VOLUMES_ML as readonly number[]).includes(value);
}

/** Plafond de saisie d'une quantité : au-delà, c'est une faute de frappe. */
export const MAX_LINE_QUANTITY = 999;

export const GIFT_PRICE_MESSAGE = "Mets le prix de la ligne offerte à 0 € ou décoche Offert.";

/** Champ à corriger, pour ouvrir la fiche en édition sur la bonne donnée (06 S01). */
export type LineRuleField = "volumeMl" | "unitPriceEur" | "exchangeRate";

export type LineRuleViolation = { field: LineRuleField; message: string };

/** Une ligne telle qu'elle est en base, reprise comprise (une contenance d'avant 10/50/80 est hors règle). */
export type StoredLineRules = {
  perfumeName: string;
  volumeMl: number | null;
  isGift: boolean;
  unitPriceEur: Eur;
  hasUnitCostDzd: boolean;
  /** Taux présent et strictement positif. */
  hasValidExchangeRate: boolean;
};

/**
 * La première règle enfreinte par une ligne en base, ou `null`. Mêmes prédicats que les CHECK
 * `line_volume_ck`, `line_gift_ck` et `line_cost_ck` (les trois que la reprise peut laisser
 * `NOT VALID`, 07 J2) ; messages de 03 §4.3.
 */
export function storedLineViolation(line: StoredLineRules): LineRuleViolation | null {
  if (!isVolumeMl(line.volumeMl)) {
    return {
      field: "volumeMl",
      message:
        line.volumeMl === null
          ? `Choisis le volume de ${line.perfumeName} (ligne reprise sans volume) pour continuer.`
          : `Choisis le volume de ${line.perfumeName} (10, 50 ou 80 ml) pour continuer.`,
    };
  }
  if (line.isGift && !eur.isZero(line.unitPriceEur)) {
    return { field: "unitPriceEur", message: GIFT_PRICE_MESSAGE };
  }
  if (line.hasUnitCostDzd && !line.hasValidExchangeRate) {
    return { field: "exchangeRate", message: `Indique le taux de la ligne ${line.perfumeName}.` };
  }
  return null;
}
