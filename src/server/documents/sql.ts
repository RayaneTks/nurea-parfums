import "server-only";
import { Prisma } from "@prisma/client";
import type { Period } from "@/contracts/chiffres";
import type { ComptaFilter } from "@/contracts/compta";
import type { OrderFilter, OrderView } from "@/contracts/documents";
import { coutACompleterSql, documentsDeLaPeriodeSql } from "@/server/chiffres/sql";
import { containsPattern, foldSql } from "@/server/search/fold";

/**
 * SQL de la liste Commandes (06 E10), écrit une fois : `documents/queries.ts` l'exécute, `tests/db/perf.test.ts`
 * en mesure la première page (04 §15, 07 J8). Montants lus dans la vue `DocumentBalance` (03 §5.1), jamais
 * recomposés ; bornes de temps calculées EN SQL, Europe/Paris, depuis l'horloge du serveur (04 §6.5).
 */

/** Recherche étendue (06 E10 zone 3) : tous les mots, chacun dans l'un des champs ; ou un numéro. */
export type OrdersSearch = {
  /** Mots pliés (`searchTerms`). */
  terms: readonly string[];
  /** Chiffres d'un numéro saisi, formes nationale et internationale (`phoneDigitVariants`), ou null. */
  phone: readonly string[] | null;
};

export type OrdersListQuery = {
  view: OrderView;
  filter: OrderFilter | null;
  search: OrdersSearch;
  limit: number;
  now: Date;
};

const VIEW_STATUSES: Record<OrderView, Prisma.Sql> = {
  "a-livrer": Prisma.sql`('PENDING', 'CONFIRMED')`,
  livrees: Prisma.sql`('DELIVERED')`,
  annulees: Prisma.sql`('CANCELLED')`,
};

/**
 * Le texte cherché d'une commande : nom vivant et nom saisi, contact, téléphone, WhatsApp, Snap, notes du
 * document, nom du lot, nom, marque et note de chaque ligne (hors catalogue compris : le nom vit sur la ligne).
 */
function haystackSql(): Prisma.Sql {
  return foldSql(Prisma.sql`concat_ws(' ', c."fullName", d."customerName", d."customerContact", c."phoneE164",
    c."whatsappE164", c.snapchat, d.notes, bt.name,
    (SELECT string_agg(concat_ws(' ', l."perfumeName", l."brandName", l.note), ' ') FROM "SaleLine" l WHERE l."documentId" = d.id))`);
}

/**
 * Condition de la recherche étendue (06 E10 zone 3), à poser après un `WHERE` : partagée par la liste Commandes et
 * les documents de la Compta (E03 zone 4 : « mêmes champs et mêmes règles »). Alias attendus : `d` (document),
 * `c` (fiche client), `bt` (lot), et la jointure latérale `s` de `documentSearchLateralSql`.
 */
export function documentSearchSql(search: OrdersSearch): Prisma.Sql {
  const hasTerms = search.terms.length > 0;
  const hasPhone = (search.phone?.length ?? 0) > 0;
  if (!hasTerms && !hasPhone) return Prisma.empty;
  const words = hasTerms
    ? Prisma.join(
        search.terms.map((term) => Prisma.sql`s.hay LIKE ${containsPattern(term)} ESCAPE '\\'`),
        " AND ",
      )
    : Prisma.sql`false`;
  const phone = hasPhone
    ? Prisma.join(
        (search.phone ?? []).map((digits) => Prisma.sql`s.digits LIKE ${containsPattern(digits)} ESCAPE '\\'`),
        " OR ",
      )
    : Prisma.sql`false`;
  return Prisma.sql`AND ((${words}) OR (${phone}))`;
}

/** Jointure latérale `s` (texte plié, chiffres du contact) de la recherche étendue ; vide sans recherche. */
export function documentSearchLateralSql(search: OrdersSearch): Prisma.Sql {
  if (search.terms.length === 0 && (search.phone?.length ?? 0) === 0) return Prisma.empty;
  return Prisma.sql`
    CROSS JOIN LATERAL (
      SELECT ${haystackSql()} AS hay,
             regexp_replace(concat_ws(' ', c."phoneE164", c."whatsappE164", d."customerContact"), '[^0-9]', '', 'g') AS digits
    ) s`;
}

function filterSql(filter: OrderFilter | null): Prisma.Sql {
  switch (filter) {
    case null:
      return Prisma.empty;
    case "retard":
    case "aujourdhui":
    case "demain":
      return Prisma.sql`WHERE o.section = ${filter}`;
    case "en-attente":
      return Prisma.sql`WHERE o.status = 'PENDING'`;
    case "confirmees":
      return Prisma.sql`WHERE o.status = 'CONFIRMED'`;
    default: {
      const exhaustive: never = filter;
      throw new Error(`Filtre inconnu : ${exhaustive as string}`);
    }
  }
}

/** Section d'un document : urgence (À livrer), à encaisser puis mois de livraison (Livrées), mois d'annulation. */
function sectionSql(view: OrderView): Prisma.Sql {
  switch (view) {
    case "a-livrer":
      return Prisma.sql`CASE
        WHEN d."expectedDeliveryAt" IS NULL THEN 'sans-date'
        WHEN d."expectedDeliveryAt" < bornes.aujourdhui THEN 'retard'
        WHEN d."expectedDeliveryAt" < bornes.demain THEN 'aujourdhui'
        WHEN d."expectedDeliveryAt" < bornes.apres_demain THEN 'demain'
        WHEN d."expectedDeliveryAt" < bornes.fin_semaine THEN 'semaine'
        ELSE 'plus-tard' END`;
    case "livrees":
      return Prisma.sql`CASE WHEN b.due > 0 THEN 'a-encaisser'
        ELSE to_char(d."deliveredAt" AT TIME ZONE 'Europe/Paris', 'YYYY-MM') END`;
    case "annulees":
      return Prisma.sql`to_char(d."cancelledAt" AT TIME ZONE 'Europe/Paris', 'YYYY-MM')`;
    default: {
      const exhaustive: never = view;
      throw new Error(`Vue inconnue : ${exhaustive as string}`);
    }
  }
}

/**
 * Ordre d'une vue : À livrer par livraison prévue puis date de commande (sans date en dernier) ; Livrées : à
 * encaisser d'abord, plus anciennes livraisons en tête, puis les plus récentes ; Annulées : les plus récentes.
 */
function orderSql(view: OrderView): Prisma.Sql {
  switch (view) {
    case "a-livrer":
      return Prisma.sql`o."expectedDeliveryAt" ASC NULLS LAST, o."orderedAt" ASC, o.id ASC`;
    case "livrees":
      return Prisma.sql`(o.due > 0) DESC, CASE WHEN o.due > 0 THEN o."deliveredAt" END ASC NULLS LAST, o."deliveredAt" DESC, o.id DESC`;
    case "annulees":
      return Prisma.sql`o."cancelledAt" DESC, o.id DESC`;
    default: {
      const exhaustive: never = view;
      throw new Error(`Vue inconnue : ${exhaustive as string}`);
    }
  }
}

/**
 * Une page de la liste Commandes : les `limit` premiers documents de la vue, filtre et recherche appliqués,
 * avec pour chacun sa section, le nombre de documents de sa section et de la vue (fenêtres calculées AVANT la
 * limite), ses compteurs d'articles, et les compteurs des chips « En attente · Confirmées » (recherche comprise,
 * filtre non compris).
 */
export function ordersListSql(query: OrdersListQuery): Prisma.Sql {
  const { view, filter, search, limit, now } = query;
  return Prisma.sql`
    WITH bornes AS (
      SELECT nurea_period_start('day', ${now}::timestamptz) AS aujourdhui,
             nurea_period_end('day', ${now}::timestamptz) AS demain,
             nurea_period_end('day', nurea_period_end('day', ${now}::timestamptz)) AS apres_demain,
             nurea_period_end('week', ${now}::timestamptz) AS fin_semaine
    ),
    vue AS (
      SELECT d.id, d.status::text AS status, d."customerId", COALESCE(c."fullName", d."customerName") AS "customerName",
             d."orderedAt", d."expectedDeliveryAt", d."expectedDeliveryHasTime", d."deliveredAt", d."cancelledAt",
             b.total, b.paid, b.due, ${sectionSql(view)} AS section
      FROM "SaleDocument" d
      CROSS JOIN bornes
      JOIN "DocumentBalance" b ON b."documentId" = d.id
      LEFT JOIN "Customer" c ON c.id = d."customerId"
      LEFT JOIN "Batch" bt ON bt.id = d."batchId"
      ${documentSearchLateralSql(search)}
      WHERE d.origin = 'ORDER' AND d.status IN ${VIEW_STATUSES[view]}
      ${documentSearchSql(search)}
    ),
    chips AS (
      SELECT count(*) FILTER (WHERE v.status = 'PENDING')::int AS "enAttente",
             count(*) FILTER (WHERE v.status = 'CONFIRMED')::int AS confirmees
      FROM vue v
    ),
    page AS (
      SELECT o.*, count(*) OVER (PARTITION BY o.section)::int AS "sectionCount", count(*) OVER ()::int AS "totalCount"
      FROM vue o
      ${filterSql(filter)}
      ORDER BY ${orderSql(view)}
      LIMIT ${limit}
    )
    SELECT o.id, o.status, o."customerId", o."customerName", o."orderedAt", o."expectedDeliveryAt",
           o."expectedDeliveryHasTime", o."deliveredAt", o."cancelledAt",
           o.total::text AS total, o.paid::text AS paid, o.due::text AS due,
           o.section, o."sectionCount", o."totalCount",
           lignes."itemCount", lignes."deliveredCount",
           chips."enAttente", chips.confirmees
    FROM page o
    CROSS JOIN chips
    CROSS JOIN LATERAL (
      SELECT COALESCE(SUM(l.quantity), 0)::int AS "itemCount", COALESCE(SUM(l."deliveredQuantity"), 0)::int AS "deliveredCount"
      FROM "SaleLine" l WHERE l."documentId" = o.id
    ) lignes
    ORDER BY ${orderSql(view)}`;
}

export type OrdersListRow = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  customerId: string | null;
  customerName: string | null;
  orderedAt: Date;
  expectedDeliveryAt: Date | null;
  expectedDeliveryHasTime: boolean;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  total: string;
  paid: string;
  due: string;
  section: string;
  sectionCount: number;
  totalCount: number;
  itemCount: number;
  deliveredCount: number;
  enAttente: number;
  confirmees: number;
};

/** Compteurs de toutes les commandes (segments « À livrer (8) » et « Annulées », vide de départ). */
export function ordersCountsSql(): Prisma.Sql {
  return Prisma.sql`
    SELECT count(*) FILTER (WHERE d.status IN ('PENDING', 'CONFIRMED'))::int AS "aLivrer",
           count(*) FILTER (WHERE d.status = 'DELIVERED')::int AS livrees,
           count(*) FILTER (WHERE d.status = 'CANCELLED')::int AS annulees,
           count(*)::int AS "all"
    FROM "SaleDocument" d
    WHERE d.origin = 'ORDER'`;
}

// ── Documents de la période (Compta, 06 E03 zone 5) ────────────────────────────

/**
 * Le périmètre de la liste de la Compta, par la définition qui le compte (A-7) : les documents de la période
 * (`documentsDeLaPeriodeSql` : un paiement ou un engagement dans la période) ou, sous le filtre « coût à
 * compléter », exactement les coûts comptés 0 € dans la Marge nette de la période (`coutACompleterSql`).
 */
export function comptaScopeSql(query: { period: Period; now: Date; filter: ComptaFilter | null }): Prisma.Sql {
  return query.filter === "cout-a-completer"
    ? coutACompleterSql({ period: query.period, now: query.now })
    : documentsDeLaPeriodeSql(query.period, query.now);
}

/**
 * Les documents du périmètre, recherche étendue appliquée (mêmes champs et règles que E10), avec ce que la ligne
 * affiche : client, titre, articles, total et dû lus dans la vue `DocumentBalance`, lot. Ordre : lots ouverts
 * (le plus récent d'abord), lots clos, puis hors lot ; dans une section, du plus récent au plus ancien.
 */
export function comptaDocumentsSql(query: { period: Period; now: Date; filter: ComptaFilter | null; search: OrdersSearch }): Prisma.Sql {
  const { search } = query;
  return Prisma.sql`
    WITH perimetre AS (${comptaScopeSql(query)})
    SELECT d.id, d.origin::text AS origin, d.status::text AS status, d."orderedAt",
           COALESCE(c."fullName", d."customerName") AS "customerName",
           b.total::text AS total, b.due::text AS due, b."hasUnknownCost",
           bt.id AS "batchId", bt.name AS "batchName", bt.status::text AS "batchStatus",
           lignes."itemCount"
    FROM perimetre p
    JOIN "SaleDocument" d ON d.id = p."documentId"
    JOIN "DocumentBalance" b ON b."documentId" = d.id
    LEFT JOIN "Customer" c ON c.id = d."customerId"
    LEFT JOIN "Batch" bt ON bt.id = d."batchId"
    ${documentSearchLateralSql(search)}
    CROSS JOIN LATERAL (
      SELECT COALESCE(SUM(l.quantity), 0)::int AS "itemCount" FROM "SaleLine" l WHERE l."documentId" = d.id
    ) lignes
    WHERE true ${documentSearchSql(search)}
    ORDER BY (bt.id IS NULL), (bt.status = 'CLOSED'), bt."createdAt" DESC, bt.id, d."orderedAt" DESC, d.id DESC`;
}

/** Nombre de documents du périmètre, recherche non comprise (la recherche s'affiche au-delà de 6). */
export function comptaScopeCountSql(query: { period: Period; now: Date; filter: ComptaFilter | null }): Prisma.Sql {
  return Prisma.sql`SELECT count(*)::int AS n FROM (${comptaScopeSql(query)}) p`;
}

export type ComptaDocumentRow = {
  id: string;
  origin: "ORDER" | "DIRECT_SALE";
  status: "PENDING" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  orderedAt: Date;
  customerName: string | null;
  total: string;
  due: string;
  hasUnknownCost: boolean;
  batchId: string | null;
  batchName: string | null;
  batchStatus: "OPEN" | "CLOSED" | null;
  itemCount: number;
};

/**
 * « Vendus récemment » (N7) : les derniers parfums distincts vendus (documents non annulés, lignes non
 * offertes), avec la contenance et le prix de leur dernière vente.
 */
export function recentlySoldSql(limit: number): Prisma.Sql {
  return Prisma.sql`
    SELECT r."perfumeId", p.name, br.name AS "brandName", p.image, r."volumeMl", r."unitPriceEur"::text AS "unitPriceEur", r."soldAt"
    FROM (
      SELECT DISTINCT ON (l."perfumeId") l."perfumeId", l."volumeMl", l."unitPriceEur", d."orderedAt" AS "soldAt"
      FROM "SaleLine" l
      JOIN "SaleDocument" d ON d.id = l."documentId"
      WHERE l."perfumeId" IS NOT NULL AND NOT l."isGift" AND d.status <> 'CANCELLED'
      ORDER BY l."perfumeId", d."orderedAt" DESC, l."createdAt" DESC, l.id DESC
    ) r
    JOIN "Perfume" p ON p.id = r."perfumeId"
    JOIN "Brand" br ON br.id = p."brandId"
    ORDER BY r."soldAt" DESC, r."perfumeId" DESC
    LIMIT ${limit}`;
}
