import { isTextId } from "@/domain/ids";

/**
 * Identifiant de lot lu dans l'URL (`/admin/lots/clot…`) ; `null` : adresse illisible. Un lot
 * introuvable n'est pas une panne — la fiche le dit et rend le chemin du retour (06 E06 « États »).
 */
export function parseBatchId(raw: string | string[] | undefined): string | null {
  const text = Array.isArray(raw) ? raw[0] : raw;
  return text && isTextId(text) ? text : null;
}
