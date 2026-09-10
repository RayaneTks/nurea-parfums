import { isAcceptedVolumeMl } from "@/domain/volumes";

/**
 * Contenances : la liste vit dans le domaine. On accepte ici les valeurs
 * héritées en plus des courantes, et c'est `normalizeVolumeMl` qui les traduit
 * avant écriture — refuser un 100 ml venu d'une ancienne ligne rendrait
 * inéditable la commande qui la porte.
 */
export { VOLUMES_ML as ORDER_VOLUMES_ML, type VolumeMl as OrderVolumeMl } from "@/domain/volumes";

export function isValidVolumeMl(v: number): boolean {
  return isAcceptedVolumeMl(v);
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
