/** Volumes flacon autorisés pour les lignes de commande / vente. */
export const ORDER_VOLUMES_ML = [30, 50, 100] as const;
export type OrderVolumeMl = (typeof ORDER_VOLUMES_ML)[number];

export function isValidVolumeMl(v: number): v is OrderVolumeMl {
  return ORDER_VOLUMES_ML.includes(v as OrderVolumeMl);
}

export function parseMoneyField(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Saisie optionnelle (création / édition de commande) : vide → 0.
 * Valeur non vide mais invalide → `null` (le route répond 400).
 */
export function parseOptionalMoneyToZero(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return 0;
  return parseMoneyField(v);
}

/**
 * Résout le coût de revient unitaire en euros pour une ligne (vente ou commande).
 *
 * Le formulaire mobile saisit le coût en DZD + taux de change ; l'euro est dérivé
 * (`unitCostDzd / exchangeRate`). Un `unitCost` euro explicite reste prioritaire s'il
 * est fourni et strictement positif. Sinon, sans info exploitable → 0 (coût inconnu / don).
 *
 * Retourne `null` uniquement si un `unitCost` euro explicite est fourni mais invalide
 * (non numérique ou négatif) — le route répond alors 400.
 */
export function resolveUnitCostEur(input: {
  unitCost?: number | string | null;
  unitCostDzd?: number | string | null;
  exchangeRate?: number | string | null;
}): number | null {
  const { unitCost, unitCostDzd, exchangeRate } = input;

  // 1) Coût euro explicite : prioritaire s'il est renseigné.
  if (unitCost !== null && unitCost !== undefined && unitCost !== "") {
    const n =
      typeof unitCost === "number" ? unitCost : Number(String(unitCost).replace(",", ".").trim());
    if (!Number.isFinite(n) || n < 0) return null; // saisie euro explicite mais invalide
    if (n > 0) return n;
    // n === 0 : peut être une valeur par défaut → on tente la dérivation DZD ci-dessous.
  }

  // 2) Dérivation depuis DZD / taux.
  const toNum = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", ".").trim());
    return Number.isFinite(n) ? n : null;
  };
  const dzd = toNum(unitCostDzd);
  const rate = toNum(exchangeRate);
  if (dzd !== null && rate !== null && dzd > 0 && rate > 0) {
    return dzd / rate;
  }

  // 3) Aucun coût exploitable → 0 (valide : don / coût inconnu).
  return 0;
}
