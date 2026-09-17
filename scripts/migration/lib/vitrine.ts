/**
 * Les trois comptages de la vitrine (docs/refonte/03-MODELE-DONNEES.md §7.2, V9), par les requêtes
 * exactes de `loadPublicCatalogFromDb` (`src/lib/catalogue-service.ts`) — filtre SQL PUIS filtre JS
 * (visuel non vide après trim, ni `placeholder.svg` ni `/parfums/…`, noms non vides après trim).
 *
 * Écrit sans dépendre du type des colonnes de statut (`::text`) : la même requête vaut sur l'ancien
 * schéma (`BrandVisibilityStatus`) et sur le schéma final (`PublicationStatus`).
 */
import { premiere, type Sql } from "./base";
import type { Vitrine } from "./reference-format";

/** Équivalent SQL de `String.prototype.trim()`. */
const trim = (expression: string) => `regexp_replace(${expression}, '^[[:space:]]+|[[:space:]]+$', '', 'g')`;

const visuelAffichable = (colonne: string) =>
  `${trim(colonne)} <> '' AND strpos(${trim(colonne)}, 'placeholder.svg') = 0 AND left(${trim(colonne)}, 9) <> '/parfums/'`;

export const SQL_VITRINE = `
SELECT
  (SELECT count(*)::int
     FROM "Perfume" p JOIN "Brand" b ON b.id = p."brandId"
    WHERE p.status::text = 'PUBLISHED' AND b.status::text = 'PUBLISHED'
      AND p.name <> '' AND p.image <> ''
      AND ${visuelAffichable("p.image")}
      AND ${trim("b.name")} <> '' AND ${trim("p.name")} <> '')                         AS "parfumsPublies",
  (SELECT count(*)::int
     FROM "Brand" b
    WHERE b."catalogMode"::text = 'COMPLETE' AND b.status::text = 'PUBLISHED'
      AND b.name <> '' AND b.image IS NOT NULL AND b.image <> ''
      AND ${visuelAffichable("b.image")}
      AND ${trim("b.name")} <> '')                                                     AS "cartesGamme",
  (SELECT count(*)::int
     FROM "Brand" b
    WHERE b.status::text = 'PUBLISHED'
      AND (b."catalogMode"::text = 'COMPLETE'
           OR EXISTS (SELECT 1 FROM "Perfume" p WHERE p."brandId" = b.id AND p.status::text = 'PUBLISHED'))) AS "marquesExplorer"
`;

export function comptagesVitrine(db: Sql): Promise<Vitrine> {
  return premiere<Vitrine>(db, SQL_VITRINE);
}
