/**
 * Visuels story des parfums (`PerfumeMedia`, né en production le 10/09/2026) : conservés tels quels par
 * la refonte (docs/refonte/03-MODELE-DONNEES.md §7.4, V11 de §7.8).
 *
 * La reprise n'écrit jamais dans cette table et le contract ne fait que convertir `createdAt` en
 * `timestamptz`. La référence en fige donc le nombre et une EMPREINTE (toutes les colonnes, date en
 * millisecondes depuis l'époque) ; `verify-post.ts` la recalcule sur le schéma final.
 *
 * Écrite pour valoir sur les deux schémas : `"createdAt" AT TIME ZONE 'UTC'` rend un `timestamptz`
 * depuis l'ancien `timestamp` (UTC sans fuseau) et un `timestamp` UTC depuis le nouveau `timestamptz` —
 * dans les deux cas, `extract(epoch …)` donne le même instant.
 */
import { premiere, type Sql } from "./base";

export interface Visuels {
  nombre: number;
  /** md5 des lignes triées par identifiant ; celui de la chaîne vide si la table est vide. */
  empreinte: string;
}

export const SQL_VISUELS = `
SELECT count(*)::int AS nombre,
       md5(COALESCE(string_agg(
         concat_ws('|', id, "perfumeId"::text, path, url, COALESCE(label, '∅'), width::text, height::text,
                   bytes::text, "sortOrder"::text,
                   (extract(epoch FROM ("createdAt" AT TIME ZONE 'UTC')) * 1000)::bigint::text),
         E'\\n' ORDER BY id COLLATE "C"), '')) AS empreinte
FROM "PerfumeMedia"`;

export function mesurerVisuels(db: Sql): Promise<Visuels> {
  return premiere<Visuels>(db, SQL_VISUELS);
}
