import "server-only";
import { Prisma } from "@prisma/client";

/**
 * SQL du sélecteur du carnet fournisseur (S25, docs/admin/dettes-fournisseur.md), écrit une fois : les
 * lectures (`queries.ts`) et le writer (`recordEntry`, qui recalcule le coût des éléments cochés) exécutent
 * les MÊMES requêtes — l'écran et la ligne écrite ne peuvent pas dire deux montants.
 *
 * Coût d'un document = Σ quantité × `unitCostDzd` de ses lignes, comme la relecture d'achat de E06
 * (`batchLinesSql`, tuile « Achat des parfums »), au centime : le produit d'un Decimal(10,2) par un entier
 * est exact en base. Les lignes sans coût sont exclues de la somme et comptées à part (`missingLines`).
 * Périmètre : les documents NON ANNULÉS, en attente compris — c'est ce qu'on fait préparer au fournisseur.
 */

/** Documents servis au sélecteur, du plus récent au plus ancien ; au-delà, la liste se dit tronquée. */
export const PICKER_DOCUMENTS_LIMIT = 1000;

/** Combien de noms de parfum une rangée porte pour la recherche et la légende. */
const ITEM_NAMES = 3;

export type PickerDocumentRow = {
  id: string;
  origin: "ORDER" | "DIRECT_SALE";
  status: "PENDING" | "CONFIRMED" | "DELIVERED";
  orderedAt: Date;
  customerName: string | null;
  batchId: string | null;
  costDzd: string;
  lineCount: number;
  missingLines: number;
  items: string[];
  notedEntryId: string | null;
  notedLabel: string | null;
  notedAt: Date | null;
  totalCount: number;
};

export type PickerBatchRow = {
  id: string;
  name: string;
  status: "OPEN" | "CLOSED";
  createdAt: Date;
  documentCount: number;
  costDzd: string;
  missingLines: number;
  notedEntryId: string | null;
  notedLabel: string | null;
  notedAt: Date | null;
};

/**
 * La dette la plus récente qui a déjà coché cet élément : directement, ou — pour un document — par son lot.
 * `target` est la condition sur `SupplierEntryItem i`.
 */
function notedLateral(target: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`
    LEFT JOIN LATERAL (
      SELECT e.id, e.label, e."occurredAt"
      FROM "SupplierEntryItem" i
      JOIN "SupplierEntry" e ON e.id = i."entryId"
      WHERE ${target}
      ORDER BY e."occurredAt" DESC, e."createdAt" DESC, e.id DESC
      LIMIT 1
    ) n ON true`;
}

/** Coût et lignes sans coût par document non annulé ; `where` restreint `d` (sélecteur entier, ou ids cochés). */
function documentCostsSql(where: Prisma.Sql, limit: number | null): Prisma.Sql {
  return Prisma.sql`
    SELECT d.id, d.origin::text AS origin, d.status::text AS status, d."orderedAt",
           COALESCE(c."fullName", d."customerName") AS "customerName", d."batchId",
           COALESCE(SUM(l.quantity * l."unitCostDzd") FILTER (WHERE l."unitCostDzd" IS NOT NULL), 0)::text AS "costDzd",
           COUNT(l.id)::int AS "lineCount",
           COUNT(l.id) FILTER (WHERE l."unitCostDzd" IS NULL)::int AS "missingLines",
           (ARRAY_REMOVE(ARRAY_AGG(l."perfumeName" ORDER BY l.position, l."createdAt", l.id), NULL))[1:${ITEM_NAMES}] AS items,
           n.id AS "notedEntryId", n.label AS "notedLabel", n."occurredAt" AS "notedAt",
           (count(*) OVER ())::int AS "totalCount"
    FROM "SaleDocument" d
    LEFT JOIN "Customer" c ON c.id = d."customerId"
    LEFT JOIN "SaleLine" l ON l."documentId" = d.id
    ${notedLateral(Prisma.sql`i."documentId" = d.id OR (d."batchId" IS NOT NULL AND i."batchId" = d."batchId")`)}
    WHERE d.status <> 'CANCELLED' AND ${where}
    GROUP BY d.id, c."fullName", n.id, n.label, n."occurredAt"
    ORDER BY d."orderedAt" DESC, d.id DESC
    ${limit === null ? Prisma.empty : Prisma.sql`LIMIT ${limit}`}`;
}

/** Coût d'un lot = Σ des coûts de ses documents non annulés (mêmes règles que `documentCostsSql`). */
function batchCostsSql(where: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`
    SELECT b.id, b.name, b.status::text AS status, b."createdAt",
           COUNT(DISTINCT d.id)::int AS "documentCount",
           COALESCE(SUM(l.quantity * l."unitCostDzd") FILTER (WHERE l."unitCostDzd" IS NOT NULL), 0)::text AS "costDzd",
           COUNT(l.id) FILTER (WHERE l."unitCostDzd" IS NULL)::int AS "missingLines",
           n.id AS "notedEntryId", n.label AS "notedLabel", n."occurredAt" AS "notedAt"
    FROM "Batch" b
    LEFT JOIN "SaleDocument" d ON d."batchId" = b.id AND d.status <> 'CANCELLED'
    LEFT JOIN "SaleLine" l ON l."documentId" = d.id
    ${notedLateral(Prisma.sql`i."batchId" = b.id`)}
    WHERE ${where}
    GROUP BY b.id, n.id, n.label, n."occurredAt"
    ORDER BY (b.status = 'OPEN') DESC, b."createdAt" DESC, b.id DESC`;
}

/** S25 — les documents candidats, plafonnés. */
export function pickerDocumentsSql(): Prisma.Sql {
  return documentCostsSql(Prisma.sql`true`, PICKER_DOCUMENTS_LIMIT);
}

/** S25 — les lots qui portent au moins un document non annulé. */
export function pickerBatchesSql(): Prisma.Sql {
  return Prisma.sql`SELECT * FROM (${batchCostsSql(Prisma.sql`true`)}) x WHERE x."documentCount" > 0`;
}

/** Coût des documents cochés, pour le writer. Un document annulé ou absent ne sort pas. */
export function documentCostsByIdSql(ids: readonly string[]): Prisma.Sql {
  return documentCostsSql(Prisma.sql`d.id IN (${Prisma.join(ids)})`, null);
}

/** Coût des lots cochés, pour le writer. Un lot absent ne sort pas. */
export function batchCostsByIdSql(ids: readonly string[]): Prisma.Sql {
  return batchCostsSql(Prisma.sql`b.id IN (${Prisma.join(ids)})`);
}
