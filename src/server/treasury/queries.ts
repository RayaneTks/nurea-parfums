import "server-only";
import { Prisma } from "@prisma/client";
import {
  isRecordId,
  type CashMovementKind,
  type JournalEntry,
  type MonthlyJournal,
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
  paymentId: string | null;
  paymentKind: "DEPOSIT" | "BALANCE" | "REFUND" | null;
  documentId: string | null;
  customerName: string | null;
  expenseId: string | null;
  expenseLabel: string | null;
  batchId: string | null;
  batchName: string | null;
};

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
      SELECT m.id, m."pocketId", p.name AS "pocketName", m.kind::text AS kind, m.amount::text AS amount,
             m."occurredAt", m.label, m."reversesId", r.id AS "reversedById", m."transferGroupId",
             pay.id AS "paymentId", pay.kind::text AS "paymentKind", pay."documentId",
             COALESCE(c."fullName", d."customerName") AS "customerName",
             e.id AS "expenseId", e.label AS "expenseLabel", e."batchId", b.name AS "batchName"
      FROM "CashMovement" m
      JOIN "Pocket" p ON p.id = m."pocketId"
      LEFT JOIN "CashMovement" r ON r."reversesId" = m.id
      LEFT JOIN "Payment" pay ON pay."movementId" = m.id
      LEFT JOIN "SaleDocument" d ON d.id = pay."documentId"
      LEFT JOIN "Customer" c ON c.id = d."customerId"
      LEFT JOIN "BatchExpense" e ON e."movementId" = COALESCE(m."reversesId", m.id) AND m.kind = 'EXPENSE'
      LEFT JOIN "Batch" b ON b.id = e."batchId"
      WHERE m."occurredAt" >= ${from} AND m."occurredAt" < ${to} ${pocketFilter}
      ORDER BY m."occurredAt" DESC, m."createdAt" DESC, m.id DESC`,
    db.$queryRaw<{ net: string }[]>`
      SELECT COALESCE(SUM(m.amount), 0)::numeric(12,2)::text AS net
      FROM "CashMovement" m
      WHERE m."occurredAt" >= ${from} AND m."occurredAt" < ${to} ${pocketFilter}`,
  ]);

  const entries: JournalEntry[] = rows.map((row) => ({
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
    payment:
      row.paymentId && row.paymentKind && row.documentId
        ? { id: row.paymentId, kind: row.paymentKind, documentId: row.documentId, customerName: row.customerName }
        : null,
    expense:
      row.expenseId && row.expenseLabel && row.batchId
        ? { id: row.expenseId, label: row.expenseLabel, batchId: row.batchId, batchName: row.batchName ?? "" }
        : null,
  }));
  return {
    month: key,
    from: from.toISOString(),
    to: to.toISOString(),
    net: toWire(eurFromDb((net as { net: string }).net)),
    entries,
  };
});
