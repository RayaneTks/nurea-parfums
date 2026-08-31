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
 * Coût unitaire en euros d'une ligne de vente ou de commande.
 *
 * La saisie terrain se fait en dinars plus un taux de change ; l'euro en est
 * déduit ici, seul endroit qui porte la formule. Un `unitCost` déjà exprimé en
 * euros est accepté tel quel (édition d'un ticket, import).
 *
 * Retourne `null` si une valeur fournie est inexploitable — l'appelant répond
 * alors 400 plutôt que d'enregistrer un coût faux.
 */
export function resolveUnitCostEur(input: {
  unitCost?: number | string | null;
  unitCostDzd?: number | string | null;
  exchangeRate?: number | string | null;
}): number | null {
  if (input.unitCost !== undefined && input.unitCost !== null && input.unitCost !== "") {
    return parseMoneyField(input.unitCost);
  }

  const dzd = parseOptionalMoneyToZero(input.unitCostDzd);
  const rate = parseOptionalMoneyToZero(input.exchangeRate);
  if (dzd === null || rate === null) return null;
  // Sans taux (ou taux nul), aucun coût n'est calculable : la ligne vaut 0 €,
  // ce qui correspond à une saisie laissée vide.
  if (dzd === 0 || rate === 0) return 0;
  return dzd / rate;
}
