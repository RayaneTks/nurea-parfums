import "server-only";
import { Prisma } from "@prisma/client";
import {
  isRecordId,
  type CashMovementKind,
  type JournalEntry,
  type MonthlyJournal,
  type PocketActivity,
  type PocketSummary,
} from "@/contracts/treasury";
import { eurFromDb, toWire } from "@/domain/money";
import { parisDayKey, parseParisDayKey } from "@/domain/periods";
import { tresorerie } from "@/server/chiffres";
import { defineQuery } from "@/server/core/define-query";
import { db } from "@/server/db/client";

/**
 * Lectures du module trésorerie pour les écrans (E03 vue Trésorerie, E04 journal, S02/S12/S15 chips de
 * poche, S14). Jamais mises en cache inter-requêtes : un formulaire d'écriture lit les poches du moment
 * (04 §10.4). Montants agrégés EN SQL (`numeric`, relus en `::text`, 04 §5.3 règle 4).
 *
 * Le solde d'une poche est la définition de 03 §5.5, dont `chiffres.tresorerie()` est la seule source
 * (04 §6) : `activePockets` la lit, hors cache, et n'y ajoute que la poche proposée par défaut.
 */

/** Poches actives avec leur solde, dans l'ordre choisi (S21), « Non attribué » en dernier (06 S02 zone 3). */
export const activePockets = defineQuery(async (): Promise<PocketSummary[]> => {
  const [{ pockets }, setting] = await Promise.all([
    tresorerie("instant"),
    db.setting.findUnique({ where: { id: 1 }, select: { defaultPocketId: true } }),
  ]);
  const defaultPocketId = setting?.defaultPocketId ?? null;
  return pockets.map((pocket) => ({
    ...pocket,
    archived: false,
    isDefault: pocket.isSystem ? defaultPocketId === null : pocket.id === defaultPocketId,
  }));
});

type JournalRow = {
  id: string;
  pocketId: string;
  pocketName: string;
  kind: CashMovementKind;
  amount: string;
  occurredAt: Date;
  label: string | null;
  reversesId: string | null;
  reversedById: string | null;
  transferGroupId: string | null;
  counterpartPocketName: string | null;
  paymentId: string | null;
  paymentKind: "DEPOSIT" | "BALANCE" | "REFUND" | null;
  documentId: string | null;
  documentOrigin: "ORDER" | "DIRECT_SALE" | null;
  customerName: string | null;
  expenseId: string | null;
  expenseLabel: string | null;
  batchId: string | null;
  batchName: string | null;
};

/**
 * Colonnes d'une ligne du journal : le mouvement, sa poche, son annulation éventuelle, l'autre jambe d'un
 * transfert (« Transfert vers Banque »), sa pièce (paiement → document → client ; dépense → lot). Alias `m`.
 */
const JOURNAL_COLUMNS = Prisma.sql`
  m.id, m."pocketId", p.name AS "pocketName", m.kind::text AS kind, m.amount::text AS amount,
  m."occurredAt", m.label, m."reversesId", r.id AS "reversedById", m."transferGroupId",
  op.name AS "counterpartPocketName",
  pay.id AS "paymentId", pay.kind::text AS "paymentKind", pay."documentId", d.origin::text AS "documentOrigin",
  COALESCE(c."fullName", d."customerName") AS "customerName",
  e.id AS "expenseId", e.label AS "expenseLabel", e."batchId", b.name AS "batchName"`;

const JOURNAL_JOINS = Prisma.sql`
  JOIN "Pocket" p ON p.id = m."pocketId"
  LEFT JOIN "CashMovement" r ON r."reversesId" = m.id
  LEFT JOIN LATERAL (
    SELECT o."pocketId" FROM "CashMovement" o
    WHERE m.kind = 'TRANSFER' AND o."transferGroupId" = m."transferGroupId" AND o.id <> m.id
    LIMIT 1
  ) autre ON true
  LEFT JOIN "Pocket" op ON op.id = autre."pocketId"
  LEFT JOIN "Payment" pay ON pay."movementId" = m.id
  LEFT JOIN "SaleDocument" d ON d.id = pay."documentId"
  LEFT JOIN "Customer" c ON c.id = d."customerId"
  LEFT JOIN "BatchExpense" e ON e."movementId" = COALESCE(m."reversesId", m.id) AND m.kind = 'EXPENSE'
  LEFT JOIN "Batch" b ON b.id = e."batchId"`;

/** Plus récents d'abord ; à même date de valeur, la contre-passation (écrite après) avant son original. */
const JOURNAL_ORDER = Prisma.sql`m."occurredAt" DESC, m."createdAt" DESC, m.id DESC`;

function journalEntry(row: JournalRow): JournalEntry {
  return {
    id: row.id,
    pocketId: row.pocketId,
    pocketName: row.pocketName,
    kind: row.kind,
    amount: toWire(eurFromDb(row.amount)),
    occurredAt: row.occurredAt.toISOString(),
    label: row.label,
    reversesId: row.reversesId,
    reversedById: row.reversedById,
    transferGroupId: row.transferGroupId,
    counterpartPocketName: row.counterpartPocketName,
    payment:
      row.paymentId && row.paymentKind && row.documentId && row.documentOrigin
        ? {
            id: row.paymentId,
            kind: row.paymentKind,
            documentId: row.documentId,
            documentOrigin: row.documentOrigin,
            customerName: row.customerName,
          }
        : null,
    expense:
      row.expenseId && row.expenseLabel && row.batchId
        ? { id: row.expenseId, label: row.expenseLabel, batchId: row.batchId, batchName: row.batchName ?? "" }
        : null,
  };
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Journal de Trésorerie d'un mois (E04, 02 §4.3 « pagination par mois ») : tous les mouvements du mois
 * calendaire Europe/Paris (bornes `nurea_period_start/end`, 03 §5.1), les plus récents d'abord, et le net du
 * mois ENTIER. `month` : « 2026-09 » (mois courant si illisible) ; `pocketId` : filtre `?poche=` (S14).
 */
export const movementJournal = defineQuery(async (month: string | null = null, pocketId: string | null = null): Promise<MonthlyJournal> => {
  const key = month && MONTH.test(month) ? month : parisDayKey().slice(0, 7);
  const ref = parseParisDayKey(`${key}-01`) as Date;
  const pocket = pocketId !== null && isRecordId(pocketId) ? pocketId : null;
  const pocketFilter = pocket === null ? Prisma.empty : Prisma.sql`AND m."pocketId" = ${pocket}`;

  const [bounds] = await db.$queryRaw<{ from: Date; to: Date }[]>`
    SELECT nurea_period_start('month', ${ref}::timestamptz) AS "from", nurea_period_end('month', ${ref}::timestamptz) AS "to"`;
  const { from, to } = bounds as { from: Date; to: Date };

  const [rows, [net]] = await Promise.all([
    db.$queryRaw<JournalRow[]>`
      SELECT ${JOURNAL_COLUMNS}
      FROM "CashMovement" m
      ${JOURNAL_JOINS}
      WHERE m."occurredAt" >= ${from} AND m."occurredAt" < ${to} ${pocketFilter}
      ORDER BY ${JOURNAL_ORDER}`,
    db.$queryRaw<{ net: string }[]>`
      SELECT COALESCE(SUM(m.amount), 0)::numeric(12,2)::text AS net
      FROM "CashMovement" m
      WHERE m."occurredAt" >= ${from} AND m."occurredAt" < ${to} ${pocketFilter}`,
  ]);

  return {
    month: key,
    pocketId: pocket,
    from: from.toISOString(),
    to: to.toISOString(),
    net: toWire(eurFromDb((net as { net: string }).net)),
    entries: rows.map(journalEntry),
  };
});

/** Derniers mouvements montrés par la fiche d'une poche (06 S14). */
const POCKET_RECENT_LIMIT = 10;

/**
 * Activité de chaque poche (S14) : ses 10 derniers mouvements, tous mois confondus, et son nombre total de
 * mouvements — une poche qui n'en a jamais eu se supprime (`deletePocketAction`), les autres s'archivent.
 * Poches archivées comprises : le journal les nomme encore.
 */
export const pocketActivity = defineQuery(async (): Promise<Record<string, PocketActivity>> => {
  const [rows, counts] = await Promise.all([
    db.$queryRaw<JournalRow[]>`
      SELECT x.* FROM (
        SELECT ${JOURNAL_COLUMNS}, row_number() OVER (PARTITION BY m."pocketId" ORDER BY ${JOURNAL_ORDER}) AS rang,
               m."createdAt" AS "createdAt"
        FROM "CashMovement" m
        ${JOURNAL_JOINS}
      ) x
      WHERE x.rang <= ${POCKET_RECENT_LIMIT}
      ORDER BY x."pocketId", x."occurredAt" DESC, x."createdAt" DESC, x.id DESC`,
    db.cashMovement.groupBy({ by: ["pocketId"], _count: { _all: true } }),
  ]);
  const activity: Record<string, PocketActivity> = {};
  for (const count of counts) {
    activity[count.pocketId] = { pocketId: count.pocketId, movementCount: count._count._all, recent: [] };
  }
  for (const row of rows) {
    const entry = activity[row.pocketId] ?? { pocketId: row.pocketId, movementCount: 0, recent: [] };
    entry.recent.push(journalEntry(row));
    activity[row.pocketId] = entry;
  }
  return activity;
});
