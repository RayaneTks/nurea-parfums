import { normalizeForFuzzy } from "./data";

/**
 * Normalise une requête utilisateur : trim, espaces, accents (via normalizeForFuzzy du catalogue).
 * À utiliser pour clés de cache, comparaisons serveur, validation.
 */
export function normalizePerfumeQuery(raw: string): string {
  return normalizeForFuzzy(raw.trim().replace(/\s+/g, " "));
}

const MAX_QUERY_LEN = 120;

export type ValidateQueryResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

/**
 * Validation stricte de l’entrée utilisateur (route API).
 */
export function validatePerfumeSearchQuery(raw: string | null): ValidateQueryResult {
  if (raw === null) return { ok: false, error: "Paramètre q manquant." };
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) return { ok: false, error: "Requête vide." };
  if (trimmed.length > MAX_QUERY_LEN) {
    return { ok: false, error: `Requête trop longue (max ${MAX_QUERY_LEN} caractères).` };
  }
  // Caractères de contrôle
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(trimmed)) {
    return { ok: false, error: "Caractères non autorisés." };
  }
  return { ok: true, value: trimmed };
}
