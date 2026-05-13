/**
 * Petit util: parse number-ou-string tolérant (virgule décimale, espaces).
 * Renvoie 0 si non finite ou parse impossible.
 *
 * À utiliser uniquement pour des calculs d'affichage. Pour les montants persistés,
 * passer par `Money` (src/domain/money.ts) ou `Decimal`.
 */
export function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}
