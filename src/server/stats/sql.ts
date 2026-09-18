import "server-only";
import { Prisma } from "@prisma/client";
import type { Period } from "@/contracts/chiffres";
import { boundsSql } from "@/server/chiffres/sql";

/**
 * SQL des lectures d'écran de l'Accueil et des Statistiques (06 E01, E02, E07 ; amendement A-7 de 07).
 *
 * Aucune définition d'argent n'est réécrite ici : les montants d'un document viennent de la vue
 * `DocumentBalance` (03 §5.1), l'Encaissé et sa ventilation par poche de `src/server/chiffres/sql.ts`
 * (04 §6.1). Ce fichier n'ajoute que ce qui n'est PAS un chiffre du vocabulaire canonique : un compte
 * d'unités, un compte de documents, une liste de documents d'une journée.
 *
 * Les bornes de période restent celles de `boundsSql` (Europe/Paris, 04 §6.5) : jamais un `setHours`
 * côté serveur (bug 01 §4.6).
 */

/** Documents engagés (`CONFIRMED`, `DELIVERED`) : le périmètre des coûts et du classement (03 §5.4). */
const ENGAGED = Prisma.sql`('CONFIRMED', 'DELIVERED')`;

/** Un document du flux normal : ni annulé (les annulés ont leur propre vue, 06 E10). */
const NOT_CANCELLED = Prisma.sql`('PENDING', 'CONFIRMED', 'DELIVERED')`;

// ── Classement des parfums en unités (06 E07, E01 zone 8) ──────────────────────

/**
 * Lignes du classement : les lignes NON OFFERTES des documents engagés dont l'engagement tombe dans la
 * période — exactement le périmètre des coûts de la Marge nette (`coutsRowsSql`), pour qu'un parfum du
 * classement soit un parfum dont la vente a compté. Une ligne offerte ne se vend pas : elle n'est pas
 * classée (06 E07).
 *
 * Contrairement à l'existant, un parfum **non publié ou masqué n'est pas exclu** du classement (01 §4.6 :
 * l'ancien écran le retirait, ce qui faisait mentir le total).
 */
function classementRowsSql(period: Period, now: Date): Prisma.Sql {
  const { from, to } = boundsSql(period, now);
  return Prisma.sql`
    SELECT l."perfumeId", l."isOffCatalog", l."perfumeName", l."brandName", l."imageUrl", l.quantity
    FROM "SaleLine" l
    JOIN "DocumentBalance" b ON b."documentId" = l."documentId"
    WHERE b.status IN ${ENGAGED}
      AND b."confirmedAt" >= ${from} AND b."confirmedAt" < ${to}
      AND NOT l."isGift"`;
}

/**
 * Le classement d'une période, `limit` premières lignes : rang, nom vivant (à défaut le snapshot), unités.
 * Regroupement de 06 E07 : par `perfumeId` quand le parfum existe, sinon par nom normalisé (hors catalogue,
 * ou parfum supprimé depuis).
 *
 * `totalUnits` et `totalEntries` sont calculés par fenêtre AVANT la limite : le sous-titre parle de toute la
 * période, et « Afficher plus » sait s'il reste des lignes — un seul aller-retour (04 §15 règle 1).
 *
 * Le badge « Hors catalogue » n'est posé que si TOUTES les lignes du groupe ont été saisies hors catalogue
 * (`bool_and`) : un parfum supprimé depuis n'a jamais été hors catalogue (03 §4, `isOffCatalog`).
 */
export function classementSql(period: Period, now: Date, limit: number): Prisma.Sql {
  return Prisma.sql`
    WITH lignes AS (${classementRowsSql(period, now)}),
    groupes AS (
      SELECT CASE WHEN l."perfumeId" IS NOT NULL
                  THEN 'parfum:' || l."perfumeId"::text
                  ELSE 'nom:' || lower(btrim(l."perfumeName")) END AS key,
             min(l."perfumeId") AS "perfumeId",
             bool_and(l."isOffCatalog") AS "isOffCatalog",
             min(l."perfumeName") AS "snapshotName",
             min(l."brandName") AS "snapshotBrand",
             min(l."imageUrl") AS "snapshotImage",
             SUM(l.quantity)::int AS units
      FROM lignes l
      GROUP BY key
    ),
    nommes AS (
      SELECT g.key, g."perfumeId", g."isOffCatalog", g.units,
             COALESCE(p.name, g."snapshotName") AS name,
             COALESCE(m.name, g."snapshotBrand") AS "brandName",
             COALESCE(p.image, g."snapshotImage") AS image
      FROM groupes g
      LEFT JOIN "Perfume" p ON p.id = g."perfumeId"
      LEFT JOIN "Brand" m ON m.id = p."brandId"
    )
    SELECT n.key, n."perfumeId", n."isOffCatalog", n.units, n.name, n."brandName", n.image,
           (row_number() OVER (ORDER BY n.units DESC, n.name ASC, n.key ASC))::int AS rank,
           (COALESCE(SUM(n.units) OVER (), 0))::int AS "totalUnits",
           (count(*) OVER ())::int AS "totalEntries"
    FROM nommes n
    ORDER BY rank
    LIMIT ${limit}`;
}

/** Une période sans aucune ligne classée ne rend AUCUNE rangée : le total se lit alors séparément. */
export function classementTotalSql(period: Period, now: Date): Prisma.Sql {
  return Prisma.sql`
    SELECT COALESCE(SUM(l.quantity), 0)::int AS "totalUnits"
    FROM (${classementRowsSql(period, now)}) l`;
}

// ── Récap du jour (06 E02) ─────────────────────────────────────────────────────

/** Bornes du jour affiché et du lendemain, en une ligne de CTE réutilisable. */
function jourBornesSql(jour: string | null, now: Date): Prisma.Sql {
  const day: Period = { kind: "calendar", unit: "day", ref: jour, offset: 0 };
  const next: Period = { kind: "calendar", unit: "day", ref: jour, offset: 1 };
  const bounds = boundsSql(day, now);
  const tomorrow = boundsSql(next, now);
  return Prisma.sql`
    SELECT ${bounds.from} AS "from", ${bounds.to} AS "to",
           ${tomorrow.from} AS "demainFrom", ${tomorrow.to} AS "demainTo"`;
}

/**
 * Documents de la journée (06 E02 zone 3) : ventes directes du jour, commandes prises le jour, commandes
 * livrées le jour. UNE rangée par document : une commande prise et livrée le même jour se raconte par son
 * fait le plus avancé (« Commande livrée »). Les annulés n'y figurent pas — ils ont leur vue (06 E10).
 */
export function documentsDuJourSql(jour: string | null, now: Date): Prisma.Sql {
  return Prisma.sql`
    WITH bornes AS (${jourBornesSql(jour, now)}),
    retenus AS (
      SELECT d.id, d.origin::text AS origin, d.status::text AS status,
             COALESCE(c."fullName", d."customerName") AS "customerName",
             -- Une vente directe est livrée dans l'instant (03 §4.3 T1) : elle reste « Vente », jamais
             -- « Commande livrée ». Seule une COMMANDE se raconte par sa livraison.
             CASE WHEN d.origin = 'DIRECT_SALE' THEN 'vente'
                  WHEN d."deliveredAt" >= bornes."from" AND d."deliveredAt" < bornes."to" THEN 'commande-livree'
                  ELSE 'commande-prise' END AS kind,
             -- « at » entre guillemets : AT est un mot-clé de PostgreSQL (AT TIME ZONE), on ne s'y fie pas.
             CASE WHEN d.origin = 'ORDER' AND d."deliveredAt" >= bornes."from" AND d."deliveredAt" < bornes."to"
                  THEN d."deliveredAt" ELSE d."orderedAt" END AS "at",
             b.total, b.due
      FROM "SaleDocument" d
      CROSS JOIN bornes
      JOIN "DocumentBalance" b ON b."documentId" = d.id
      LEFT JOIN "Customer" c ON c.id = d."customerId"
      WHERE d.status IN ${NOT_CANCELLED}
        AND ((d."orderedAt" >= bornes."from" AND d."orderedAt" < bornes."to")
             OR (d.origin = 'ORDER' AND d."deliveredAt" >= bornes."from" AND d."deliveredAt" < bornes."to"))
    )
    SELECT r.id AS "documentId", r.origin, r.status, r.kind, r."customerName", r."at",
           r.total::numeric(12,2)::text AS total, r.due::numeric(12,2)::text AS due,
           COALESCE((SELECT SUM(l.quantity)::int FROM "SaleLine" l WHERE l."documentId" = r.id), 0) AS "itemCount"
    FROM retenus r
    ORDER BY r."at" DESC, r.id DESC`;
}

/** Commandes prévues le LENDEMAIN du jour affiché (06 E02 zone 4), à livrer (ni livrées ni annulées). */
export function livraisonsDuLendemainSql(jour: string | null, now: Date): Prisma.Sql {
  return Prisma.sql`
    WITH bornes AS (${jourBornesSql(jour, now)})
    SELECT d.id AS "documentId", d.status::text AS status,
           COALESCE(c."fullName", d."customerName") AS "customerName",
           b.total::numeric(12,2)::text AS total, b.due::numeric(12,2)::text AS due,
           d."expectedDeliveryAt", d."expectedDeliveryHasTime" AS "hasTime"
    FROM "SaleDocument" d
    CROSS JOIN bornes
    JOIN "DocumentBalance" b ON b."documentId" = d.id
    LEFT JOIN "Customer" c ON c.id = d."customerId"
    WHERE d.status IN ('PENDING', 'CONFIRMED')
      AND d."expectedDeliveryAt" >= bornes."demainFrom" AND d."expectedDeliveryAt" < bornes."demainTo"
    ORDER BY d."expectedDeliveryAt", d.id`;
}

/**
 * Les comptes de l'Accueil, en UNE requête : le bloc « Aujourd'hui » (06 E01 zone 4 : ventes et commandes
 * prises aujourd'hui, commandes à livrer aujourd'hui et demain) ET les trois comptes du « vide de départ »
 * (06 PC-12, 05 §5.1). Aucun montant ici : l'Encaissé du jour vient du composite des chiffres
 * (`tableauDeBord()`, 04 §6.3) — l'Accueil ne paie donc que deux allers-retours pour ses huit zones.
 *
 * Les deux compteurs de livraison emploient la MÊME expression que les sections « aujourdhui » et
 * « demain » de la liste Commandes (`src/server/documents/sql.ts`) : la rangée ouvre exactement ce qu'elle
 * compte (05 §5.3 ; bug 01 §4.6 — l'alerte comptait PENDING + READY et ouvrait READY seule).
 */
export function accueilComptesSql(now: Date): Prisma.Sql {
  return Prisma.sql`
    WITH bornes AS (
      SELECT nurea_period_start('day', ${now}::timestamptz) AS aujourdhui,
             nurea_period_end('day', ${now}::timestamptz) AS demain,
             nurea_period_end('day', nurea_period_end('day', ${now}::timestamptz)) AS apres_demain
    ),
    jour AS (
      SELECT
        count(*) FILTER (
          WHERE d.origin = 'DIRECT_SALE'
            AND d."orderedAt" >= bornes.aujourdhui AND d."orderedAt" < bornes.demain
        )::int AS ventes,
        count(*) FILTER (
          WHERE d.origin = 'ORDER'
            AND d."orderedAt" >= bornes.aujourdhui AND d."orderedAt" < bornes.demain
        )::int AS "commandesPrises",
        count(*) FILTER (
          WHERE d.origin = 'ORDER' AND d.status IN ('PENDING', 'CONFIRMED')
            AND d."expectedDeliveryAt" >= bornes.aujourdhui AND d."expectedDeliveryAt" < bornes.demain
        )::int AS "aLivrerAujourdhui",
        count(*) FILTER (
          WHERE d.origin = 'ORDER' AND d.status IN ('PENDING', 'CONFIRMED')
            AND d."expectedDeliveryAt" >= bornes.demain AND d."expectedDeliveryAt" < bornes.apres_demain
        )::int AS "aLivrerDemain"
      FROM "SaleDocument" d
      CROSS JOIN bornes
      WHERE d.status IN ${NOT_CANCELLED}
    )
    SELECT jour.ventes, jour."commandesPrises", jour."aLivrerAujourdhui", jour."aLivrerDemain",
           (SELECT count(*)::int FROM "Pocket" WHERE NOT "isSystem" AND NOT archived) AS pockets,
           (SELECT count(*)::int FROM "Perfume") AS perfumes,
           (SELECT count(*)::int FROM "SaleDocument") AS documents,
           -- Tous statuts : « Créer un lot » ne se propose qu'à celui qui n'a JAMAIS créé de lot (06 E01 zone 7).
           (SELECT count(*)::int FROM "Batch") AS batches
    FROM jour`;
}

// ── Lots ouverts (06 E01 zone 7) ───────────────────────────────────────────────

/**
 * Lots ouverts, les plus récents d'abord, avec leur nombre de documents rattachés. La Marge nette du lot
 * n'est PAS calculée ici : elle vient de `chiffresParLot()` (04 §6.6) — un chiffre, une implémentation.
 */
export function lotsOuvertsSql(limit: number): Prisma.Sql {
  return Prisma.sql`
    SELECT l.id, l.name, l."expectedAt",
           COALESCE((SELECT count(*)::int FROM "SaleDocument" d WHERE d."batchId" = l.id), 0) AS "documentCount"
    FROM "Batch" l
    WHERE l.status = 'OPEN'
    ORDER BY l."createdAt" DESC, l.id DESC
    LIMIT ${limit}`;
}
