import "server-only";
import { Prisma } from "@prisma/client";
import { containsPattern, foldSql } from "@/server/search/fold";

/**
 * SQL des lectures clients (06 E12, E14), écrit une fois : `customers/queries.ts` l'exécute, `tests/db` l'éprouve.
 * Montants lus dans la vue `DocumentBalance` (03 §5.1), jamais recomposés ; le dû d'une fiche vient des chiffres
 * (`aEncaisser`, `aEncaisserParClient`, 04 §6).
 */

/** Recherche de E12 : nom, Snap, téléphone et WhatsApp — tous les mots, ou un numéro saisi « comme on le dit ». */
export type CustomersSearch = {
  /** Mots pliés (`searchTerms`), « @ » de tête retiré. */
  terms: readonly string[];
  /** Chiffres d'un numéro saisi, formes nationale et internationale (`phoneDigitVariants`), ou null. */
  phone: readonly string[] | null;
};

/**
 * Clé de tri A–Z, TOTALE avec l'identifiant (01 §4.10 : un tri sur le seul nom rendait la pagination ambiguë
 * entre homonymes) : le nom plié — « Élise » se range avec les E, jamais après Z —, les noms qui ne commencent
 * pas par une lettre en dernier, sous « # ». Comparée octet par octet (`COLLATE "C"`) : le même ordre en local,
 * en test et en production, quelle que soit la collation de la base.
 */
function foldedNameSql(): Prisma.Sql {
  return foldSql(Prisma.sql`btrim(c."fullName")`);
}

function sortKeySql(): Prisma.Sql {
  return Prisma.sql`(CASE WHEN ${foldedNameSql()} ~ '^[a-z]' THEN '0' ELSE '1' END || ${foldedNameSql()}) COLLATE "C"`;
}

function letterSql(): Prisma.Sql {
  return Prisma.sql`CASE WHEN ${foldedNameSql()} ~ '^[a-z]' THEN upper(left(${foldedNameSql()}, 1)) ELSE '#' END`;
}

/**
 * Texte cherché d'une fiche : nom, Snap, et ses numéros sous leurs deux écritures (« +33612345678 » et
 * « 0612345678 »), pour qu'une saisie mêlant mots et chiffres (« fares 06 ») trouve aussi.
 */
function haystackSql(): Prisma.Sql {
  const national = (column: Prisma.Sql) =>
    Prisma.sql`CASE WHEN ${column} ~ '^\\+33[1-9][0-9]{8}$' THEN '0' || substr(${column}, 4) END`;
  return foldSql(Prisma.sql`concat_ws(' ', c."fullName", c.snapchat, c."phoneE164", ${national(Prisma.sql`c."phoneE164"`)},
    c."whatsappE164", ${national(Prisma.sql`c."whatsappE164"`)})`);
}

function searchSql(search: CustomersSearch): Prisma.Sql {
  const hasTerms = search.terms.length > 0;
  const hasPhone = (search.phone?.length ?? 0) > 0;
  if (!hasTerms && !hasPhone) return Prisma.empty;
  const words = hasTerms
    ? Prisma.join(
        search.terms.map((term) => Prisma.sql`${haystackSql()} LIKE ${containsPattern(term)} ESCAPE '\\'`),
        " AND ",
      )
    : Prisma.sql`false`;
  const digits = Prisma.sql`regexp_replace(concat_ws(' ', c."phoneE164", c."whatsappE164"), '[^0-9]', '', 'g')`;
  const phone = hasPhone
    ? Prisma.join(
        (search.phone ?? []).map((variant) => Prisma.sql`${digits} LIKE ${containsPattern(variant)} ESCAPE '\\'`),
        " OR ",
      )
    : Prisma.sql`false`;
  return Prisma.sql`WHERE ((${words}) OR (${phone}))`;
}

export type CustomersListRow = {
  id: string;
  fullName: string;
  phoneE164: string | null;
  snapchat: string | null;
  letter: string;
  total: number;
};

/**
 * Une fenêtre de la liste Clients (E12) : les `limit` premières fiches dans l'ordre A–Z, recherche appliquée, avec
 * le nombre total de fiches trouvées (calculé avant la limite). La recherche repart toujours de la première fiche :
 * aucun curseur n'est reporté d'une recherche à l'autre (01 §4.10).
 */
export function customersListSql(query: { search: CustomersSearch; limit: number }): Prisma.Sql {
  return Prisma.sql`
    SELECT c.id, c."fullName", c."phoneE164", c.snapchat, ${letterSql()} AS letter,
           count(*) OVER ()::int AS total
    FROM "Customer" c
    ${searchSql(query.search)}
    ORDER BY ${sortKeySql()}, c.id COLLATE "C"
    LIMIT ${query.limit}`;
}

export type CustomerStatsRow = {
  documentCount: number;
  historyCount: number;
  openOrders: number;
  firstAt: Date | null;
  lastPurchaseAt: Date | null;
};

/** Tuiles et gardes de E14 : documents non annulés, dernier achat, commandes en cours, premier document. */
export function customerStatsSql(customerId: string): Prisma.Sql {
  return Prisma.sql`
    SELECT count(*) FILTER (WHERE d.status <> 'CANCELLED')::int AS "documentCount",
           count(*)::int AS "historyCount",
           count(*) FILTER (WHERE d.status IN ('PENDING', 'CONFIRMED'))::int AS "openOrders",
           min(d."orderedAt") AS "firstAt",
           max(d."orderedAt") FILTER (WHERE d.status <> 'CANCELLED') AS "lastPurchaseAt"
    FROM "SaleDocument" d
    WHERE d."customerId" = ${customerId}`;
}

export type CustomerHistoryRow = {
  id: string;
  origin: "ORDER" | "DIRECT_SALE";
  status: "PENDING" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  orderedAt: Date;
  itemCount: number;
  total: string;
  due: string;
};

/**
 * Historique d'une fiche (E14 zone 6) : TOUTES ses opérations — commandes et ventes, annulées comprises —, du plus
 * récent au plus ancien, `limit` lignes. `activeOnly` : sans les annulées (récap partageable).
 */
export function customerHistorySql(customerId: string, options: { limit: number; activeOnly?: boolean }): Prisma.Sql {
  return Prisma.sql`
    SELECT d.id, d.origin::text AS origin, d.status::text AS status, d."orderedAt",
           b.total::text AS total, b.due::text AS due,
           (SELECT COALESCE(SUM(l.quantity), 0)::int FROM "SaleLine" l WHERE l."documentId" = d.id) AS "itemCount"
    FROM "SaleDocument" d
    JOIN "DocumentBalance" b ON b."documentId" = d.id
    WHERE d."customerId" = ${customerId}
      ${options.activeOnly ? Prisma.sql`AND d.status <> 'CANCELLED'` : Prisma.empty}
    ORDER BY d."orderedAt" DESC, d.id DESC
    LIMIT ${options.limit}`;
}

export type FrequentPerfumeRow = {
  perfumeId: number;
  name: string;
  brandName: string;
  times: number;
  volumeMl: number | null;
};

/**
 * « Achète souvent » (E14 zone 5) : les parfums du catalogue les plus achetés par la fiche, en nombre de documents
 * non annulés (lignes offertes comprises : le client les a eues), puis le plus récent ; contenance du dernier achat.
 */
export function frequentPerfumesSql(customerId: string, limit: number): Prisma.Sql {
  return Prisma.sql`
    SELECT f."perfumeId", p.name, br.name AS "brandName", f.times, f."volumeMl"
    FROM (
      SELECT l."perfumeId",
             count(DISTINCT d.id)::int AS times,
             max(d."orderedAt") AS "lastAt",
             (array_agg(l."volumeMl" ORDER BY d."orderedAt" DESC, l.position DESC))[1] AS "volumeMl"
      FROM "SaleLine" l
      JOIN "SaleDocument" d ON d.id = l."documentId"
      WHERE d."customerId" = ${customerId} AND d.status <> 'CANCELLED' AND l."perfumeId" IS NOT NULL
      GROUP BY l."perfumeId"
    ) f
    JOIN "Perfume" p ON p.id = f."perfumeId"
    JOIN "Brand" br ON br.id = p."brandId"
    ORDER BY f.times DESC, f."lastAt" DESC, f."perfumeId" DESC
    LIMIT ${limit}`;
}
