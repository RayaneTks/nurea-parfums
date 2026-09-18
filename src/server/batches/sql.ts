import "server-only";
import { Prisma } from "@prisma/client";
import { searchLateralSql, searchSql, type OrdersSearch } from "@/server/documents/sql";

/**
 * SQL des écrans des lots (06 E05, E06, S13 ; 07 J13), écrit une fois : `batches/queries.ts` l'exécute.
 *
 * Tous les comptes et tous les montants sont agrégés EN BASE (04 §6) : la vue `DocumentBalance` donne
 * total et dû (03 §5.1), `count(*) OVER ()` donne le compte réel d'une liste tronquée — aucune somme,
 * aucun décompte refait en JavaScript, donc jamais deux nombres différents pour la même chose (01 §4.4).
 *
 * La recherche est celle de E10, importée (`documents/sql.ts`) : mêmes champs, mêmes règles (NR-11.5).
 */

/** Combien de noms de parfum une légende de ligne porte avant le « +N » (« Sauvage, Libre +2 »). */
const ITEM_NAMES = 2;

export type BatchRow = {
  id: string;
  name: string;
  status: "OPEN" | "CLOSED";
  expectedAt: Date | null;
  createdAt: Date;
  notes: string | null;
  documentCount: number;
};

/**
 * Les lots, ouverts d'abord, le plus récent en tête, avec le nombre de documents RATTACHÉS — annulés
 * compris : c'est le nombre que le refus de suppression annonce (06 E06), et la légende de E05 ne peut
 * pas en dire un autre (05 §5.4).
 */
export function batchRowsSql(): Prisma.Sql {
  return Prisma.sql`
    SELECT b.id, b.name, b.status::text AS status, b."expectedAt", b."createdAt", b.notes,
           (SELECT count(*) FROM "SaleDocument" d WHERE d."batchId" = b.id)::int AS "documentCount"
    FROM "Batch" b
    ORDER BY (b.status = 'OPEN') DESC, b."createdAt" DESC, b.id DESC`;
}

export type DocumentRow = {
  id: string;
  origin: "ORDER" | "DIRECT_SALE";
  status: "PENDING" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  customerName: string | null;
  orderedAt: Date;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  total: string;
  due: string;
  items: string[];
  lineCount: number;
  batchId: string | null;
  totalCount: number;
};

/**
 * Colonnes communes d'une ligne de document dans un écran de lot. `items` est l'ordre réel des lignes
 * du document (`position`), plafonné : la légende n'invente rien, le « +N » se déduit de `lineCount`.
 */
function documentColumnsSql(): Prisma.Sql {
  return Prisma.sql`
    d.id, d.origin::text AS origin, d.status::text AS status,
    COALESCE(c."fullName", d."customerName") AS "customerName",
    d."orderedAt", d."deliveredAt", d."cancelledAt",
    bal.total::text AS total, bal.due::text AS due, d."batchId",
    lignes.items, lignes."lineCount"`;
}

function documentLinesLateralSql(): Prisma.Sql {
  return Prisma.sql`
    CROSS JOIN LATERAL (
      SELECT COALESCE(
               (SELECT array_agg(nom ORDER BY rang)
                FROM (SELECT l."perfumeName" AS nom, row_number() OVER (ORDER BY l.position, l."createdAt", l.id) AS rang
                      FROM "SaleLine" l WHERE l."documentId" = d.id) premiers
                WHERE rang <= ${ITEM_NAMES}),
               ARRAY[]::text[]) AS items,
             (SELECT count(*) FROM "SaleLine" l WHERE l."documentId" = d.id)::int AS "lineCount"
    ) lignes`;
}

/**
 * E05 zone 0 — « À rattacher » : les documents NON ANNULÉS SANS LOT, commandes et ventes, **livrés
 * compris** (un envoi terminé se rattache pour lui imputer transport et douane, 06 E05 zone 0), du plus
 * récent au plus ancien, recherche appliquée. `totalCount` est le compte AVANT la limite : « 100
 * affichés sur 132 » ne peut pas mentir.
 */
export function unbatchedSql(query: { search: OrdersSearch; limit: number }): Prisma.Sql {
  return Prisma.sql`
    SELECT ${documentColumnsSql()}, count(*) OVER ()::int AS "totalCount"
    FROM "SaleDocument" d
    JOIN "DocumentBalance" bal ON bal."documentId" = d.id
    LEFT JOIN "Customer" c ON c.id = d."customerId"
    LEFT JOIN "Batch" bt ON bt.id = d."batchId"
    ${documentLinesLateralSql()}
    ${searchLateralSql(query.search)}
    WHERE d."batchId" IS NULL AND d.status <> 'CANCELLED'
    ${searchSql(query.search)}
    ORDER BY d."orderedAt" DESC, d.id DESC
    LIMIT ${query.limit}`;
}

/**
 * E06 zone 3 — TOUT ce qui est rattaché au lot : une commande en attente y figure, un document annulé
 * aussi (écart du 17/09/2026 : sans cela il restait rattaché, invisible et indétachable, et rendait la
 * raison du refus de suppression illisible). Les annulés en fin de liste, l'écran les replie.
 */
export function batchDocumentsSql(batchId: string): Prisma.Sql {
  return Prisma.sql`
    SELECT ${documentColumnsSql()}, count(*) OVER ()::int AS "totalCount"
    FROM "SaleDocument" d
    JOIN "DocumentBalance" bal ON bal."documentId" = d.id
    LEFT JOIN "Customer" c ON c.id = d."customerId"
    ${documentLinesLateralSql()}
    WHERE d."batchId" = ${batchId}
    ORDER BY (d.status = 'CANCELLED'), d."orderedAt" DESC, d.id DESC`;
}

/**
 * S13 — candidats au rattachement : les documents sans lot ET ceux de ce lot, **tous statuts non
 * annulés** (une commande en attente se rattache dès sa création, et reste détachable si elle revient en
 * attente, 06 S13). Une seule requête, une seule sheet : la jumelle « commandes » de la production
 * (deux sheets, deux listes qui divergeaient) n'existe plus.
 */
export function assignCandidatesSql(query: { batchId: string; search: OrdersSearch; limit: number }): Prisma.Sql {
  return Prisma.sql`
    SELECT ${documentColumnsSql()}, count(*) OVER ()::int AS "totalCount"
    FROM "SaleDocument" d
    JOIN "DocumentBalance" bal ON bal."documentId" = d.id
    LEFT JOIN "Customer" c ON c.id = d."customerId"
    LEFT JOIN "Batch" bt ON bt.id = d."batchId"
    ${documentLinesLateralSql()}
    ${searchLateralSql(query.search)}
    WHERE d.status <> 'CANCELLED' AND (d."batchId" IS NULL OR d."batchId" = ${query.batchId})
    ${searchSql(query.search)}
    ORDER BY (d."batchId" = ${query.batchId}) DESC NULLS LAST, d."orderedAt" DESC, d.id DESC
    LIMIT ${query.limit}`;
}

export type BatchExpenseRow = {
  id: string;
  label: string;
  notes: string | null;
  amount: string;
  occurredAt: Date;
  pocketId: string;
  pocketName: string;
};

/**
 * E06 zone 4 — les dépenses vivantes du lot : une dépense supprimée a son mouvement contre-passé (T10)
 * et sort d'ici, sa pièce restant au journal (03 §4.4). Le montant se lit en positif (son mouvement sort).
 */
export function batchExpensesSql(batchId: string): Prisma.Sql {
  return Prisma.sql`
    SELECT e.id, e.label, e.notes, (-m.amount)::text AS amount, m."occurredAt",
           m."pocketId", p.name AS "pocketName"
    FROM "BatchExpense" e
    JOIN "CashMovement" m ON m.id = e."movementId"
    JOIN "Pocket" p ON p.id = m."pocketId"
    WHERE e."batchId" = ${batchId}
      AND NOT EXISTS (SELECT 1 FROM "CashMovement" r WHERE r."reversesId" = m.id)
    ORDER BY m."occurredAt" DESC, e.id DESC`;
}

/**
 * Compteurs du refus de suppression (06 E06) : documents rattachés, dépenses jamais effacées de
 * l'histoire, et celles encore vivantes. Un lot dont la seule dépense a été supprimée reste
 * insupprimable — sa pièce contre-passée est au journal (02 §4.4).
 */
export function batchDeletionCountsSql(batchId: string): Prisma.Sql {
  return Prisma.sql`
    SELECT (SELECT count(*) FROM "SaleDocument" d WHERE d."batchId" = ${batchId})::int AS documents,
           (SELECT count(*) FROM "BatchExpense" e WHERE e."batchId" = ${batchId})::int AS expenses,
           (SELECT count(*) FROM "BatchExpense" e
              JOIN "CashMovement" m ON m.id = e."movementId"
             WHERE e."batchId" = ${batchId}
               AND NOT EXISTS (SELECT 1 FROM "CashMovement" r WHERE r."reversesId" = m.id))::int AS "activeExpenses"`;
}

/**
 * A10 — les libellés de dépense déjà saisis, CEUX DU LOT D'ABORD puis les plus fréquents (06 S12) :
 * le gérant retape « Transport » une fois, jamais deux. Les libellés de dépenses supprimées comptent
 * encore : c'est un souvenir de frappe, pas un chiffre.
 */
export function expenseLabelsSql(query: { batchId: string | null; limit: number }): Prisma.Sql {
  const ofBatch = query.batchId === null ? Prisma.sql`false` : Prisma.sql`e."batchId" = ${query.batchId}`;
  return Prisma.sql`
    SELECT e.label
    FROM "BatchExpense" e
    GROUP BY e.label
    ORDER BY bool_or(${ofBatch}) DESC, count(*) DESC, max(e."createdAt") DESC, e.label ASC
    LIMIT ${query.limit}`;
}
