import "server-only";
import {
  ORDERS_PAGE_SIZE,
  ORDER_URGENCIES,
  parseOrdersParams,
  type DocumentLineDTO,
  type DocumentPaymentDTO,
  type DocumentSheetDTO,
  type OrderRowDTO,
  type OrderSectionDTO,
  type OrdersListDTO,
  type RecentlySoldDTO,
} from "@/contracts/documents";
import { parsePeriod, type PeriodKey } from "@/contracts/chiffres";
import {
  COMPTA_FILTERS,
  COMPTA_SEARCH_MAX_LENGTH,
  type ComptaDocumentSectionDTO,
  type ComptaDocumentsDTO,
  type ComptaFilter,
} from "@/contracts/compta";
import { phoneDigitVariants, searchTerms } from "@/contracts/search";
import { isTextId } from "@/domain/ids";
import { dzdFromDb, eur, eurFromDb, eurFromWire, percentOf, rateFromDb, toDb, toWire, type MoneyString } from "@/domain/money";
import { isVolumeMl } from "@/domain/sale-line";
import { cached } from "@/server/cache/cached";
import { documentBalance } from "@/server/chiffres";
import { defineQuery } from "@/server/core/define-query";
import { db } from "@/server/db/client";
import {
  comptaDocumentsSql,
  comptaScopeCountSql,
  ordersCountsSql,
  ordersListSql,
  recentlySoldSql,
  type ComptaDocumentRow,
  type OrdersListRow,
} from "@/server/documents/sql";

/**
 * Lectures du module documents pour les écrans (04 §2.1) : fiche document (S01), liste Commandes (E10),
 * « Vendus récemment » (N7). Montants lus dans la vue `DocumentBalance` (03 §5.1) ; aucun chiffre agrégé
 * recomposé ici (04 §6).
 */

type Decimalish = { toString(): string };

const money = (value: Decimalish | string): MoneyString => toWire(eurFromDb(value));

/** Un taux repris non positif est illisible par le module monétaire : il s'affiche comme absent. */
function rateOrNull(value: Decimalish | null): string | null {
  if (value === null) return null;
  try {
    return toDb(rateFromDb(value));
  } catch {
    return null;
  }
}

// ── Fiche document (S01) ───────────────────────────────────────────────────────

/**
 * La fiche d'un document ouverte pour agir (06 S01) : document, lignes, paiements avec leurs contre-passations,
 * client, lot, et ses montants lus dans la vue. JAMAIS cachée : on encaisse sur ces montants (04 §10.4).
 * `null` : identifiant illisible ou document supprimé (« Ce document n'existe plus »).
 */
export const documentSheet = defineQuery(async (id: string): Promise<DocumentSheetDTO | null> => {
  if (!isTextId(id)) return null;
  const [doc, balances] = await Promise.all([
    db.saleDocument.findUnique({
      where: { id },
      select: {
        id: true,
        origin: true,
        status: true,
        customerName: true,
        customerContact: true,
        orderedAt: true,
        expectedDeliveryAt: true,
        expectedDeliveryHasTime: true,
        confirmedAt: true,
        deliveredAt: true,
        cancelledAt: true,
        notes: true,
        customer: { select: { id: true, fullName: true, phoneE164: true, snapchat: true } },
        batch: { select: { id: true, name: true, status: true } },
        lines: {
          orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            position: true,
            perfumeId: true,
            isOffCatalog: true,
            perfumeName: true,
            brandName: true,
            imageUrl: true,
            volumeMl: true,
            quantity: true,
            deliveredQuantity: true,
            unitPriceEur: true,
            isGift: true,
            unitCostDzd: true,
            exchangeRate: true,
            unitCostEur: true,
            note: true,
          },
        },
        payments: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            kind: true,
            method: true,
            note: true,
            movement: {
              select: {
                amount: true,
                occurredAt: true,
                pocket: { select: { id: true, name: true } },
                reverses: { select: { payment: { select: { id: true } } } },
                reversedBy: { select: { payment: { select: { id: true } } } },
              },
            },
          },
        },
      },
    }),
    documentBalance(id),
  ]);
  const balance = balances[id];
  if (!doc || !balance) return null;

  const lines: DocumentLineDTO[] = doc.lines.map((line) => ({
    id: line.id,
    position: line.position,
    perfumeId: line.perfumeId,
    isOffCatalog: line.isOffCatalog,
    perfumeName: line.perfumeName,
    brandName: line.brandName,
    imageUrl: line.imageUrl,
    volumeMl: line.volumeMl,
    quantity: line.quantity,
    deliveredQuantity: line.deliveredQuantity,
    unitPriceEur: money(line.unitPriceEur),
    isGift: line.isGift,
    unitCostDzd: line.unitCostDzd === null ? null : toDb(dzdFromDb(line.unitCostDzd)),
    exchangeRate: rateOrNull(line.exchangeRate),
    unitCostEur: line.unitCostEur === null ? null : money(line.unitCostEur),
    note: line.note,
  }));

  const payments: DocumentPaymentDTO[] = doc.payments.map((payment) => ({
    id: payment.id,
    kind: payment.kind,
    amount: money(payment.movement.amount),
    occurredAt: payment.movement.occurredAt.toISOString(),
    pocketId: payment.movement.pocket.id,
    pocketName: payment.movement.pocket.name,
    method: payment.method,
    note: payment.note,
    reversesPaymentId: payment.movement.reverses?.payment?.id ?? null,
    reversedByPaymentId: payment.movement.reversedBy?.payment?.id ?? null,
  }));

  const total = eurFromWire(balance.total);
  const paid = eurFromWire(balance.paid);
  const margin = balance.hasUnknownCost ? null : eur.sub(total, eurFromWire(balance.cost));

  return {
    id: doc.id,
    origin: doc.origin,
    status: doc.status,
    customer: doc.customer,
    customerName: doc.customerName,
    customerContact: doc.customerContact,
    batch: doc.batch,
    orderedAt: doc.orderedAt.toISOString(),
    expectedDeliveryAt: doc.expectedDeliveryAt?.toISOString() ?? null,
    expectedDeliveryHasTime: doc.expectedDeliveryHasTime,
    confirmedAt: doc.confirmedAt?.toISOString() ?? null,
    deliveredAt: doc.deliveredAt?.toISOString() ?? null,
    cancelledAt: doc.cancelledAt?.toISOString() ?? null,
    notes: doc.notes,
    lines,
    payments,
    balance: {
      total: balance.total,
      paid: balance.paid,
      due: balance.due,
      overpaid: toWire(eur.clampZero(eur.sub(paid, total))),
      hasUnknownCost: balance.hasUnknownCost,
      marginBeforeExpenses: margin === null ? null : toWire(margin),
      marginPercent: margin === null ? null : percentOf(margin, total),
    },
  };
});

// ── Liste Commandes (E10) ──────────────────────────────────────────────────────

function orderRow(row: OrdersListRow): OrderRowDTO {
  return {
    id: row.id,
    status: row.status,
    customerId: row.customerId,
    customerName: row.customerName,
    orderedAt: row.orderedAt.toISOString(),
    expectedDeliveryAt: row.expectedDeliveryAt?.toISOString() ?? null,
    expectedDeliveryHasTime: row.expectedDeliveryHasTime,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    itemCount: row.itemCount,
    deliveredCount: row.deliveredCount,
    total: money(row.total),
    paid: money(row.paid),
    due: money(row.due),
  };
}

/** Rangs des sections d'urgence dans l'ordre d'affichage ; une section de mois garde l'ordre des lignes. */
const URGENCY_RANK = new Map<string, number>(ORDER_URGENCIES.map((key, index) => [key, index]));

function sectionsOf(view: OrdersListDTO["vue"], rows: readonly OrdersListRow[]): OrderSectionDTO[] {
  const sections = new Map<string, OrderSectionDTO>();
  for (const row of rows) {
    let section = sections.get(row.section);
    if (!section) {
      const kind = view === "a-livrer" ? "urgency" : row.section === "a-encaisser" ? "receivable" : "month";
      section = { key: row.section, kind, count: row.sectionCount, rows: [] };
      sections.set(row.section, section);
    }
    section.rows.push(orderRow(row));
  }
  const list = [...sections.values()];
  return view === "a-livrer" ? list.sort((a, b) => (URGENCY_RANK.get(a.key) ?? 99) - (URGENCY_RANK.get(b.key) ?? 99)) : list;
}

const cachedOrdersList = cached(
  "documents.ordersList",
  "gestion",
  async (vue: string, filtre: string | null, q: string, pages: number): Promise<OrdersListDTO> => {
    const params = parseOrdersParams({ vue, filtre, q, pages: String(pages) });
    const now = new Date();
    const [rows, [counts]] = await Promise.all([
      db.$queryRaw<OrdersListRow[]>(
        ordersListSql({
          view: params.vue,
          filter: params.filtre,
          search: { terms: searchTerms(params.q), phone: phoneDigitVariants(params.q) },
          limit: params.pages * ORDERS_PAGE_SIZE,
          now,
        }),
      ),
      db.$queryRaw<OrdersListDTO["counts"][]>(ordersCountsSql()),
    ]);
    const total = rows[0]?.totalCount ?? 0;
    return {
      ...params,
      counts: counts ?? { aLivrer: 0, livrees: 0, annulees: 0, all: 0 },
      chips: { enAttente: rows[0]?.enAttente ?? 0, confirmees: rows[0]?.confirmees ?? 0 },
      sections: sectionsOf(params.vue, rows),
      total,
      hasMore: total > rows.length,
    };
  },
  { daily: true },
);

/**
 * E10 — une vue de la liste Commandes (« À livrer », « Livrées », « Annulées »), sections, compteurs, filtre et
 * recherche étendue appliqués ; `pages` pages de 50. Arguments bruts de l'URL : `parseOrdersParams` les borne.
 * Cache `gestion` à la clé du jour (les sections d'urgence changent à minuit, Paris).
 */
export const ordersList = defineQuery(
  (vue: string | null = null, filtre: string | null = null, q: string | null = null, pages: string | null = null) => {
    const params = parseOrdersParams({ vue, filtre, q, pages });
    return cachedOrdersList(params.vue, params.filtre, params.q, params.pages);
  },
);

// ── Documents de la période (Compta, E03 zone 5) ───────────────────────────────

function comptaSections(rows: readonly ComptaDocumentRow[]): ComptaDocumentSectionDTO[] {
  const sections = new Map<string, ComptaDocumentSectionDTO>();
  for (const row of rows) {
    const key = row.batchId ? `lot:${row.batchId}` : "hors-lot";
    let section = sections.get(key);
    if (!section) {
      section = {
        key,
        batch: row.batchId ? { id: row.batchId, name: row.batchName ?? "", status: row.batchStatus ?? "OPEN" } : null,
        rows: [],
      };
      sections.set(key, section);
    }
    section.rows.push({
      id: row.id,
      origin: row.origin,
      status: row.status,
      customerName: row.customerName,
      orderedAt: row.orderedAt.toISOString(),
      itemCount: row.itemCount,
      total: money(row.total),
      due: money(row.due),
      hasUnknownCost: row.hasUnknownCost,
    });
  }
  return [...sections.values()];
}

const cachedComptaDocuments = cached(
  "documents.comptaDocuments",
  "gestion",
  async (periode: PeriodKey, q: string, filtre: ComptaFilter | null): Promise<ComptaDocumentsDTO> => {
    const period = parsePeriod(periode);
    if (!period) throw new TypeError(`Compta : période illisible « ${periode} ».`);
    const now = new Date();
    const scope = { period, now, filter: filtre };
    const [rows, [count]] = await Promise.all([
      db.$queryRaw<ComptaDocumentRow[]>(
        comptaDocumentsSql({ ...scope, search: { terms: searchTerms(q), phone: phoneDigitVariants(q) } }),
      ),
      db.$queryRaw<{ n: number }[]>(comptaScopeCountSql(scope)),
    ]);
    return { periode, q, filtre, scopeCount: count?.n ?? 0, total: rows.length, sections: comptaSections(rows) };
  },
  { daily: true },
);

/**
 * E03 zone 5 — les documents de la période (paiement ou engagement dans la période, `documentsDeLaPeriode`), ou
 * sous `filtre=cout-a-completer` ceux de `coutACompleter` ; recherche étendue de E10 ; groupés par lot puis hors
 * lot. Cache `gestion` à la clé du jour (les bornes « ce mois » changent à minuit, Paris).
 */
export const comptaDocuments = defineQuery((periode: PeriodKey, q: string | null = null, filtre: string | null = null) => {
  const query = (q ?? "").trim().slice(0, COMPTA_SEARCH_MAX_LENGTH);
  const filter = (COMPTA_FILTERS as readonly string[]).includes(filtre ?? "") ? (filtre as ComptaFilter) : null;
  return cachedComptaDocuments(periode, query, filter);
});

// ── Vendus récemment (N7) ──────────────────────────────────────────────────────

const RECENTLY_SOLD_LIMIT = 8;

type RecentlySoldRow = {
  perfumeId: number;
  name: string;
  brandName: string;
  image: string;
  volumeMl: number | null;
  unitPriceEur: string;
  soldAt: Date;
};

const cachedRecentlySold = cached("documents.recentlySold", "gestion", async (): Promise<RecentlySoldDTO[]> => {
  const rows = await db.$queryRaw<RecentlySoldRow[]>(recentlySoldSql(RECENTLY_SOLD_LIMIT));
  return rows.map((row) => ({
    perfumeId: row.perfumeId,
    name: row.name,
    brandName: row.brandName,
    image: row.image,
    volumeMl: isVolumeMl(row.volumeMl) ? row.volumeMl : null,
    unitPriceEur: money(row.unitPriceEur),
    soldAt: row.soldAt.toISOString(),
  }));
});

/** « Vendus récemment » (N7) : S05 en tête, E11 (J9). 8 parfums, dernière contenance et dernier prix. */
export const recentlySold = defineQuery(() => cachedRecentlySold());
