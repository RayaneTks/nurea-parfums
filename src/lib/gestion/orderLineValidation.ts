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
