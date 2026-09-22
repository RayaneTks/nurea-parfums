import "server-only";
import {
  CUSTOMERS_PAGE_SIZE,
  CUSTOMER_HISTORY_PAGE_SIZE,
  parseCustomersParams,
  parsePages,
  type CustomerDirectoryEntry,
  type CustomerHistoryRowDTO,
  type CustomerListRowDTO,
  type CustomerSheetDTO,
  type CustomerSummary,
  type CustomersListDTO,
  type FrequentPerfumeDTO,
} from "@/contracts/customers";
import { phoneDigitVariants, searchTerms } from "@/contracts/search";
import { isEngaged } from "@/domain/document-status";
import { isTextId } from "@/domain/ids";
import { eurFromDb, toWire, type MoneyString } from "@/domain/money";
import { formatPhoneNational } from "@/domain/phone";
import { isVolumeMl } from "@/domain/sale-line";
import { cached } from "@/server/cache/cached";
import { aEncaisserParClient } from "@/server/chiffres";
import { defineQuery } from "@/server/core/define-query";
import {
  customerHistorySql,
  customerStatsSql,
  customersListSql,
  frequentPerfumesSql,
  type CustomerHistoryRow,
  type CustomerStatsRow,
  type CustomersListRow,
  type FrequentPerfumeRow,
} from "@/server/customers/sql";
import { db } from "@/server/db/client";

/**
 * Lectures du module clients pour les écrans (06 E12, E14, E20 ; 04 §2.1). Le dû d'une fiche n'est JAMAIS calculé
 * ici : il vient de `aEncaisserParClient()` (badge) et, sur la fiche, de `aEncaisser(null, id)` et
 * `aEncaisserDetail()` appelés par le bloc — le même chiffre que l'écran À encaisser (02 §6, 04 §6).
 *
 * Cache `gestion` (invalidé par toute écriture, dont celles des fiches et des documents) : lire ses écritures
 * relit la liste et la fiche à jour (04 §10.2).
 */

const money = (value: string): MoneyString => toWire(eurFromDb(value));

const SUMMARY_SELECT = {
  id: true,
  fullName: true,
  phoneE164: true,
  whatsappE164: true,
  snapchat: true,
  address: true,
  notes: true,
} as const;

/** « 06 12 34 56 78 », à défaut « @fares.b » : la légende d'une fiche dans une liste (06 E12). */
function contactOf(row: { phoneE164: string | null; snapchat: string | null }): string | null {
  if (row.phoneE164) return formatPhoneNational(row.phoneE164);
  return row.snapchat ? `@${row.snapchat}` : null;
}

// ── E12 — Liste ────────────────────────────────────────────────────────────────

const cachedCustomersList = cached(
  "customers.list",
  "gestion",
  async (q: string, pages: number): Promise<CustomersListDTO> => {
    const search = {
      terms: searchTerms(q.replace(/(^|\s)@+/g, "$1")),
      phone: phoneDigitVariants(q),
    };
    const [rows, all] = await Promise.all([
      db.$queryRaw<CustomersListRow[]>(customersListSql({ search, limit: pages * CUSTOMERS_PAGE_SIZE })),
      db.customer.count(),
    ]);
    const total = rows[0]?.total ?? 0;
    return {
      q,
      pages,
      rows: rows.map((row) => ({ id: row.id, fullName: row.fullName, letter: row.letter, contact: contactOf(row), due: null })),
      total,
      all,
      hasMore: total > rows.length,
    };
  },
);

/**
 * E12 — une fenêtre de la liste A–Z (`pages` × 50 fiches), recherche nom / téléphone normalisé / Snap / WhatsApp
 * appliquée, et le badge « X € dû » de chaque fiche. Arguments bruts de l'URL : `parseCustomersParams` les borne.
 */
export const customersList = defineQuery(async (q: string | null = null, pages: string | null = null): Promise<CustomersListDTO> => {
  const params = parseCustomersParams({ q, pages });
  const [list, dues] = await Promise.all([cachedCustomersList(params.q, params.pages), aEncaisserParClient()]);
  return { ...list, rows: list.rows.map((row): CustomerListRowDTO => ({ ...row, due: dues[row.id] ?? null })) };
});

// ── E14 — Fiche ────────────────────────────────────────────────────────────────

const RECAP_LIMIT = 5;
const FREQUENT_LIMIT = 3;

function historyRow(row: CustomerHistoryRow): CustomerHistoryRowDTO {
  return {
    id: row.id,
    origin: row.origin,
    status: row.status,
    orderedAt: row.orderedAt.toISOString(),
    itemCount: row.itemCount,
    total: money(row.total),
    due: isEngaged(row.status) ? money(row.due) : null,
  };
}

function frequentRow(row: FrequentPerfumeRow): FrequentPerfumeDTO {
  return {
    perfumeId: row.perfumeId,
    name: row.name,
    brandName: row.brandName,
    times: row.times,
    volumeMl: isVolumeMl(row.volumeMl) ? row.volumeMl : null,
  };
}

const cachedCustomerSheet = cached(
  "customers.sheet",
  "gestion",
  async (id: string, pages: number): Promise<CustomerSheetDTO | null> => {
    const [customer, [stats], history, recap, frequent] = await Promise.all([
      db.customer.findUnique({ where: { id }, select: { ...SUMMARY_SELECT, createdAt: true } }),
      db.$queryRaw<CustomerStatsRow[]>(customerStatsSql(id)),
      db.$queryRaw<CustomerHistoryRow[]>(customerHistorySql(id, { limit: pages * CUSTOMER_HISTORY_PAGE_SIZE })),
      db.$queryRaw<CustomerHistoryRow[]>(customerHistorySql(id, { limit: RECAP_LIMIT, activeOnly: true })),
      db.$queryRaw<FrequentPerfumeRow[]>(frequentPerfumesSql(id, FREQUENT_LIMIT)),
    ]);
    if (!customer) return null;
    const { createdAt, ...summary } = customer;
    const firstAt = stats?.firstAt ?? null;
    const since = firstAt && firstAt < createdAt ? firstAt : createdAt;
    const historyCount = stats?.historyCount ?? 0;
    return {
      customer: summary,
      since: since.toISOString(),
      documentCount: stats?.documentCount ?? 0,
      historyCount,
      lastPurchaseAt: stats?.lastPurchaseAt?.toISOString() ?? null,
      openOrders: stats?.openOrders ?? 0,
      history: { rows: history.map(historyRow), pages, hasMore: historyCount > history.length },
      frequent: frequent.map(frequentRow),
      recap: recap.map(historyRow),
    };
  },
);

/**
 * E14 — la fiche d'un client : coordonnées, « client depuis », documents non annulés, dernier achat, commandes en
 * cours (garde de suppression), historique complet par pages de 20, « Achète souvent », récap. `null` : identifiant
 * illisible ou fiche supprimée (« Cette fiche n'existe plus »).
 */
export const customerSheet = defineQuery(async (id: string, pages: string | null = null): Promise<CustomerSheetDTO | null> => {
  if (!isTextId(id)) return null;
  return cachedCustomerSheet(id, parsePages(pages));
});

// ── E20 — Formulaire ───────────────────────────────────────────────────────────

/** E20 en modification : la fiche telle qu'elle est en base, hors cache (on la modifie). `null` : supprimée. */
export const customerForm = defineQuery(async (id: string): Promise<CustomerSummary | null> => {
  if (!isTextId(id)) return null;
  return db.customer.findUnique({ where: { id }, select: SUMMARY_SELECT });
});

const cachedDirectory = cached("customers.directory", "gestion", async (): Promise<CustomerDirectoryEntry[]> =>
  db.customer.findMany({
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
    select: { id: true, fullName: true, phoneE164: true, whatsappE164: true },
  }),
);

/**
 * E20 — toutes les fiches (nom, numéros) : l'alerte d'homonyme (« Fares Benali existe déjà ») et le numéro déjà
 * pris se disent AVANT l'enregistrement ; le serveur garde le dernier mot (`assertPhoneFree`).
 */
export const customerDirectory = defineQuery(() => cachedDirectory());
