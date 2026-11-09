import "server-only";
import type { Prisma } from "@prisma/client";
import type {
  SupplierBalanceDTO,
  SupplierDetailDebtDTO,
  SupplierEntryDTO,
  SupplierEntryItemDTO,
  SupplierLedgerDTO,
  SupplierNotedDTO,
  SupplierPickerDTO,
} from "@/contracts/supplier";
import { isTextId } from "@/domain/ids";
import { dzdFromDb, rateFromDb, toDb } from "@/domain/money";
import { supplierBalanceState, supplierRemaining } from "@/domain/supplier-debt";
import { defineQuery } from "@/server/core/define-query";
import { db } from "@/server/db/client";
import { ENTRY_SUMMARY_SELECT, entrySummary } from "@/server/supplier/dto";
import { pickerBatchesSql, pickerDocumentsSql, type PickerBatchRow, type PickerDocumentRow } from "@/server/supplier/sql";

/**
 * Lectures du carnet fournisseur (E22, S22, rangée de l'Accueil). Hors cache : le carnet est petit, et
 * un écran qui vient d'écrire relit sa propre ligne. Le Reste à payer sort d'UNE fonction
 * (`supplierBalance`) : l'en-tête de E22 et l'Accueil disent le même montant.
 */

/** Taux du carnet, à défaut celui des Réglages, à défaut 277 (mêmes valeurs que `settings/writer`). */
async function supplierRate(): Promise<string> {
  const row = await db.setting.findUnique({
    where: { id: 1 },
    select: { supplierExchangeRate: true, defaultExchangeRate: true },
  });
  return toDb(rateFromDb(row?.supplierExchangeRate ?? row?.defaultExchangeRate ?? "277"));
}

async function supplierBalance(): Promise<SupplierBalanceDTO> {
  const [sums, rate] = await Promise.all([
    db.supplierEntry.groupBy({ by: ["kind"], _sum: { amountDzd: true } }),
    supplierRate(),
  ]);
  const remaining = supplierRemaining(
    sums.map((sum) => ({ kind: sum.kind, amountDzd: dzdFromDb(sum._sum.amountDzd ?? "0") })),
  );
  return { remainingDzd: toDb(remaining), state: supplierBalanceState(remaining), rate };
}

/** Rangée « Fournisseur » de l'Accueil : le Reste à payer et le taux du carnet. */
export const getSupplierBalance = defineQuery(supplierBalance);

/**
 * L'écran E22 : en-tête et carnet entier, du plus récent au plus ancien.
 * shortcut: carnet non paginé, assez petit pour des années ; paginer au-delà de quelques centaines de lignes.
 */
export const getSupplierLedger = defineQuery(async (): Promise<SupplierLedgerDTO> => {
  const [balance, rows] = await Promise.all([
    supplierBalance(),
    db.supplierEntry.findMany({
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: { ...ENTRY_SUMMARY_SELECT, _count: { select: { items: true } } },
    }),
  ]);
  return {
    ...balance,
    entries: rows.map(({ _count, ...row }) => ({ ...entrySummary(row), itemCount: _count.items })),
  };
});

/** La sheet d'une ligne (`?ligne=<id>`) ; `null` si elle n'existe plus ou si l'id est fabriqué. */
export const getSupplierEntry = defineQuery(async (id: string): Promise<SupplierEntryDTO | null> => {
  if (!isTextId(id)) return null;
  const row = await db.supplierEntry.findUnique({
    where: { id },
    select: {
      ...ENTRY_SUMMARY_SELECT,
      settles: { select: { id: true, label: true } },
      createdAt: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          amountDzd: true,
          document: {
            select: { id: true, origin: true, orderedAt: true, customerName: true, customer: { select: { fullName: true } } },
          },
          batch: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!row) return null;
  const { createdAt, items, settles, ...entry } = row;
  return {
    ...entrySummary(entry),
    createdAt: createdAt.toISOString(),
    settles,
    items: items.flatMap((item): SupplierEntryItemDTO[] => {
      const amountDzd = toDb(dzdFromDb(item.amountDzd));
      if (item.document) {
        const { document } = item;
        return [
          {
            kind: "document",
            id: item.id,
            documentId: document.id,
            origin: document.origin,
            customerName: document.customer?.fullName ?? document.customerName,
            orderedAt: document.orderedAt.toISOString(),
            amountDzd,
          },
        ];
      }
      return item.batch ? [{ kind: "batch", id: item.id, batchId: item.batch.id, name: item.batch.name, amountDzd }] : [];
    }),
  };
});

const DETAIL_DOCUMENT_SELECT = {
  id: true,
  status: true,
  orderedAt: true,
  customerName: true,
  customer: { select: { fullName: true } },
  lines: {
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: { perfumeName: true, brandName: true, volumeMl: true, quantity: true, unitCostDzd: true },
  },
} satisfies Prisma.SaleDocumentSelect;

/**
 * « Détail du reste à payer » : les dettes demandées (celles qui ont encore un reste, calculé par l'écran),
 * avec les lignes de parfum de ce qu'elles ont coché. Un lot rend ses commandes et ventes non annulées (même
 * périmètre que son coût au sélecteur) ; une commande cochée directement reste, même annulée depuis, signalée.
 * Coûts relus sur les lignes, au présent : l'écart avec le montant de la dette est montré par l'écran.
 */
export const getSupplierDetail = defineQuery(async (debtIds: readonly string[]): Promise<SupplierDetailDebtDTO[]> => {
  const ids = debtIds.filter(isTextId);
  if (ids.length === 0) return [];
  const rows = await db.supplierEntry.findMany({
    where: { id: { in: ids }, kind: "DEBT" },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      label: true,
      amountDzd: true,
      occurredAt: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          document: { select: DETAIL_DOCUMENT_SELECT },
          batch: {
            select: {
              documents: {
                where: { status: { not: "CANCELLED" } },
                orderBy: [{ orderedAt: "asc" }, { id: "asc" }],
                select: DETAIL_DOCUMENT_SELECT,
              },
            },
          },
        },
      },
    },
  });
  return rows.map((row) => {
    const documents = row.items
      .flatMap((item) => (item.document ? [item.document] : (item.batch?.documents ?? [])))
      .sort((a, b) => a.orderedAt.getTime() - b.orderedAt.getTime() || a.id.localeCompare(b.id));
    return {
      id: row.id,
      label: row.label,
      amountDzd: toDb(dzdFromDb(row.amountDzd)),
      occurredAt: row.occurredAt.toISOString(),
      hasItems: row.items.length > 0,
      lines: documents.flatMap((document) =>
        document.lines.map((line) => ({
          documentId: document.id,
          customerName: document.customer?.fullName ?? document.customerName,
          cancelled: document.status === "CANCELLED",
          perfumeName: line.perfumeName,
          brandName: line.brandName,
          volumeMl: line.volumeMl,
          quantity: line.quantity,
          unitCostDzd: line.unitCostDzd === null ? null : toDb(dzdFromDb(line.unitCostDzd)),
        })),
      ),
    };
  });
});

function notedOf(row: { notedEntryId: string | null; notedLabel: string | null; notedAt: Date | null }): SupplierNotedDTO | null {
  return row.notedEntryId && row.notedAt
    ? { entryId: row.notedEntryId, label: row.notedLabel, occurredAt: row.notedAt.toISOString() }
    : null;
}

/** S25 — documents non annulés et lots, avec leur coût d'achat en DA et la dette qui les a déjà notés. */
export const getSupplierPicker = defineQuery(async (): Promise<SupplierPickerDTO> => {
  const [documents, batches] = await Promise.all([
    db.$queryRaw<PickerDocumentRow[]>(pickerDocumentsSql()),
    db.$queryRaw<PickerBatchRow[]>(pickerBatchesSql()),
  ]);
  return {
    documents: documents.map((row) => ({
      id: row.id,
      origin: row.origin,
      status: row.status,
      orderedAt: row.orderedAt.toISOString(),
      customerName: row.customerName,
      batchId: row.batchId,
      costDzd: toDb(dzdFromDb(row.costDzd)),
      lineCount: row.lineCount,
      missingLines: row.missingLines,
      items: row.items,
      noted: notedOf(row),
    })),
    batches: batches.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      documentCount: row.documentCount,
      costDzd: toDb(dzdFromDb(row.costDzd)),
      missingLines: row.missingLines,
      noted: notedOf(row),
    })),
    total: documents[0]?.totalCount ?? 0,
  };
});
