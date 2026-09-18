import "server-only";
import {
  ASSIGN_CANDIDATES_LIMIT,
  EXPENSE_LABEL_CHIPS,
  UNBATCHED_PAGE_SIZE,
  parseBatchesParams,
  type AssignSheetDTO,
  type BatchDocumentRowDTO,
  type BatchExpenseRowDTO,
  type BatchRowDTO,
  type BatchSheetDTO,
  type BatchStatus,
  type BatchSummary,
  type BatchesListDTO,
  type UnbatchedDTO,
} from "@/contracts/batches";
import type { BatchFiguresDTO } from "@/contracts/chiffres";
import { phoneDigitVariants, searchTerms } from "@/contracts/search";
import type { DocumentOrigin, DocumentStatus } from "@/domain/document-status";
import { isTextId } from "@/domain/ids";
import { eurFromDb, toWire, type MoneyString } from "@/domain/money";
import {
  assignCandidatesSql,
  batchDeletionCountsSql,
  batchDocumentsSql,
  batchExpensesSql,
  batchRowsSql,
  expenseLabelsSql,
  unbatchedSql,
  type BatchExpenseRow,
  type BatchRow,
  type DocumentRow,
} from "@/server/batches/sql";
import { batchDeletionRefusal } from "@/server/batches/refusal";
import { cached } from "@/server/cache/cached";
import { aEncaisser, chiffresParLot, margeNette } from "@/server/chiffres";
import { defineQuery } from "@/server/core/define-query";
import { db } from "@/server/db/client";

/**
 * Lectures du module lots (04 §2.1) : sélecteur S07 (J8), puis les écrans E05, E06 et la sheet S13 (J13).
 *
 * Aucun chiffre n'est recomposé ici (04 §6) : `chiffresParLot()` sert la liste, `margeNette({ batchId })`
 * et `aEncaisser({ batchId })` servent la fiche — les cinq tuiles de E06 et la Marge nette de E05
 * sortent des MÊMES fragments SQL, donc disent le même montant sur les deux écrans (01 §4.4).
 *
 * Cache : `gestion` pour les écrans de lecture (toute écriture l'invalide, filet de 60 s). Hors cache,
 * comme le sélecteur : les candidats de S13 — un rattachement se décide sur l'état du moment (04 §10.4).
 */

const money = (value: string): MoneyString => toWire(eurFromDb(value));

/** Zéro écrit par le module monétaire, jamais « 0 » à la main (04 §5.3). */
const ZERO: MoneyString = toWire(eurFromDb("0"));

/** S07 : les lots ouverts, le plus récent en tête (06 S07 « lots ouverts, le plus récent en tête »). */
export const openBatches = defineQuery(async (): Promise<BatchSummary[]> => {
  const rows = await db.batch.findMany({
    where: { status: "OPEN" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, name: true, status: true, expectedAt: true, notes: true },
  });
  return rows.map((row) => ({ ...row, expectedAt: row.expectedAt?.toISOString() ?? null }));
});

// ── Lignes de document, partagées par E05 zone 0, E06 zone 3 et S13 ────────────

function documentRow(row: DocumentRow): BatchDocumentRowDTO {
  return {
    id: row.id,
    origin: row.origin as DocumentOrigin,
    status: row.status as DocumentStatus,
    customerName: row.customerName,
    orderedAt: row.orderedAt.toISOString(),
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    total: money(row.total),
    due: money(row.due),
    items: row.items,
    lineCount: row.lineCount,
  };
}

function summaryOf(row: BatchRow): BatchSummary {
  return {
    id: row.id,
    name: row.name,
    status: row.status as BatchStatus,
    expectedAt: row.expectedAt?.toISOString() ?? null,
    notes: row.notes,
  };
}

/** Un lot sans document ni dépense n'a pas de ligne dans les agrégats : ses chiffres sont nuls, pas absents. */
function figuresOf(batchId: string, byBatch: Record<string, BatchFiguresDTO>): BatchFiguresDTO {
  return (
    byBatch[batchId] ?? {
      batchId,
      encaisse: ZERO,
      aEncaisser: ZERO,
      margeNette: { value: ZERO, percent: null, encaisse: ZERO, costs: ZERO, expenses: ZERO, hasUnknownCost: false, unknownCostCount: 0 },
    }
  );
}

// ── E05 — Lots ─────────────────────────────────────────────────────────────────

async function loadUnbatched(q: string, pages: number): Promise<UnbatchedDTO> {
  const limit = pages * UNBATCHED_PAGE_SIZE;
  const rows = await db.$queryRaw<DocumentRow[]>(
    unbatchedSql({ search: { terms: searchTerms(q), phone: phoneDigitVariants(q) }, limit }),
  );
  const total = rows[0]?.totalCount ?? 0;
  return { rows: rows.map(documentRow), total, hasMore: total > rows.length };
}

const cachedBatchesList = cached(
  "batches.list",
  "gestion",
  async (q: string, pages: number): Promise<BatchesListDTO> => {
    const [rows, figures, unbatched] = await Promise.all([
      db.$queryRaw<BatchRow[]>(batchRowsSql()),
      chiffresParLot("all"),
      loadUnbatched(q, pages),
    ]);
    const list = rows.map(
      (row): BatchRowDTO => ({
        id: row.id,
        name: row.name,
        status: row.status as BatchStatus,
        expectedAt: row.expectedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        documentCount: row.documentCount,
        figures: figuresOf(row.id, figures),
      }),
    );
    return {
      q,
      pages,
      unbatched,
      open: list.filter((batch) => batch.status === "OPEN"),
      closed: list.filter((batch) => batch.status === "CLOSED"),
      total: list.length,
    };
  },
  { daily: true },
);

/**
 * E05 — les lots (ouverts, clos) avec leurs chiffres, et la zone 0 « À rattacher » : ce qui n'appartient
 * à aucun lot, recherche et pages appliquées. Arguments bruts de l'URL : `parseBatchesParams` les borne.
 */
export const batchesList = defineQuery((q: string | null = null, pages: string | null = null) => {
  const params = parseBatchesParams({ q, pages });
  return cachedBatchesList(params.q, params.pages);
});

// ── E06 — Fiche lot ────────────────────────────────────────────────────────────

const cachedBatchSheet = cached(
  "batches.sheet",
  "gestion",
  async (id: string): Promise<BatchSheetDTO | null> => {
    const row = await db.batch.findUnique({
      where: { id },
      select: { id: true, name: true, status: true, expectedAt: true, notes: true, createdAt: true },
    });
    if (!row) return null;

    const [figures, dues, documents, expenses, [counts], labels] = await Promise.all([
      margeNette("all", id),
      // `aEncaisser(batchId, customerId)` : le lot est le PREMIER argument.
      aEncaisser(id),
      db.$queryRaw<DocumentRow[]>(batchDocumentsSql(id)),
      db.$queryRaw<BatchExpenseRow[]>(batchExpensesSql(id)),
      db.$queryRaw<{ documents: number; expenses: number; activeExpenses: number }[]>(batchDeletionCountsSql(id)),
      db.$queryRaw<{ label: string }[]>(expenseLabelsSql({ batchId: id, limit: EXPENSE_LABEL_CHIPS })),
    ]);

    const rows = documents.map(documentRow);
    return {
      batch: {
        id: row.id,
        name: row.name,
        status: row.status as BatchStatus,
        expectedAt: row.expectedAt?.toISOString() ?? null,
        notes: row.notes,
      },
      createdAt: row.createdAt.toISOString(),
      figures: { batchId: id, encaisse: figures.encaisse, aEncaisser: dues, margeNette: figures },
      documents: rows.filter((doc) => doc.status !== "CANCELLED"),
      cancelled: rows.filter((doc) => doc.status === "CANCELLED"),
      documentCount: rows.length,
      expenses: expenses.map(
        (expense): BatchExpenseRowDTO => ({
          id: expense.id,
          label: expense.label,
          notes: expense.notes,
          amount: money(expense.amount),
          occurredAt: expense.occurredAt.toISOString(),
          pocketId: expense.pocketId,
          pocketName: expense.pocketName,
        }),
      ),
      deletionRefusal: batchDeletionRefusal(counts ?? { documents: 0, expenses: 0, activeExpenses: 0 }),
      expenseLabels: labels.map((entry) => entry.label),
    };
  },
  { daily: true },
);

/**
 * E06 — la fiche d'un lot : les cinq tuiles, tout ce qui est rattaché (annulés compris), ses dépenses
 * vivantes, la raison d'un refus de suppression et les libellés de dépense à proposer (A10).
 * `null` : identifiant illisible ou lot supprimé (« Ce lot n'existe plus »).
 */
export const batchSheet = defineQuery((id: string): Promise<BatchSheetDTO | null> =>
  isTextId(id) ? cachedBatchSheet(id) : Promise.resolve(null),
);

// ── S13 — Rattacher des documents ──────────────────────────────────────────────

/**
 * S13 — les candidats du lot, servis par le RSC de la page sous `?assigner=1` (06 S13 : « aucune
 * requête lancée par un effet client »). JAMAIS caché : on coche sur l'état du moment (04 §10.4).
 * `null` : lot introuvable, ou lot clos — un lot clos n'accepte aucun rattachement (03 T13), l'écran
 * ne propose donc pas la sheet et le serveur refuserait de toute façon.
 */
export const assignSheet = defineQuery(async (id: string, q: string | null = null): Promise<AssignSheetDTO | null> => {
  if (!isTextId(id)) return null;
  const batch = await db.batch.findUnique({ where: { id }, select: { id: true, name: true, status: true } });
  if (!batch || batch.status !== "OPEN") return null;
  const search = { terms: searchTerms(q), phone: phoneDigitVariants(q) };
  const rows = await db.$queryRaw<DocumentRow[]>(
    assignCandidatesSql({ batchId: id, search, limit: ASSIGN_CANDIDATES_LIMIT }),
  );
  const total = rows[0]?.totalCount ?? 0;
  return {
    batchId: batch.id,
    batchName: batch.name,
    candidates: rows.map((row) => ({ ...documentRow(row), attached: row.batchId === id })),
    total,
    hasMore: total > rows.length,
  };
});

/**
 * S12 ouverte hors de E06 (« Nouvelle dépense » de la recherche) : les libellés à proposer en chips,
 * ceux du lot d'abord (A10). Hors cache comme tout ce qui alimente un formulaire d'écriture.
 */
export const expenseLabels = defineQuery(async (batchId: string | null = null): Promise<string[]> => {
  const rows = await db.$queryRaw<{ label: string }[]>(
    expenseLabelsSql({ batchId: batchId !== null && isTextId(batchId) ? batchId : null, limit: EXPENSE_LABEL_CHIPS }),
  );
  return rows.map((row) => row.label);
});
