import "server-only";
import type { ReceivableDTO } from "@/contracts/chiffres";
import {
  RECENT_CUSTOMERS_LIMIT,
  SEARCH_GROUP_LIMIT,
  SEARCH_MIN_LENGTH,
  phoneDigitVariants,
  searchTerms,
  type CustomerHitDTO,
  type DocumentHitDTO,
  type PerfumeHitDTO,
  type SearchGroupDTO,
  type SearchResultsDTO,
  type SearchScope,
} from "@/contracts/search";
import { isEngaged, type DocumentOrigin, type DocumentStatus } from "@/domain/document-status";
import { eurFromDb, toWire, type MoneyString } from "@/domain/money";
import { formatPhoneNational, phoneSearchDigits } from "@/domain/phone";
import { cleNom } from "@/lib/nommage";
import { cached } from "@/server/cache/cached";
import { adminCatalogue } from "@/server/catalogue/queries";
import { aEncaisserDetail, aEncaisserParClient } from "@/server/chiffres";
import { defineQuery } from "@/server/core/define-query";
import { db } from "@/server/db/client";
import { activePockets } from "@/server/treasury/queries";

/**
 * Recherche à la frappe (04 §3.5, §15 règle 10 ; 06 §4.4 S17, S06) : clients, documents et parfums filtrés sur
 * des instantanés en mémoire — les volumes de la gestion (< 10⁴ lignes) se filtrent en quelques millisecondes,
 * insensibles aux accents partout, sans extension SQL. Clients et documents : cache `gestion` (invalidé par toute
 * écriture) ; parfums : l'instantané admin du catalogue (`admin-catalogue`).
 *
 * Une saisie correspond si TOUS ses mots (pliés par `cleNom`) figurent dans le texte cherché de l'objet, ou si
 * c'est un numéro dont les chiffres figurent dans un téléphone (« 06 12 » trouve « +33 6 12… »).
 */

// ── Instantanés ────────────────────────────────────────────────────────────────

type CustomerEntry = {
  id: string;
  fullName: string;
  contact: string | null;
  /** Mots pliés du nom et du Snap, chiffres des téléphones sous leurs deux formes. */
  haystack: string;
  digits: string;
  /** ISO 8601 du document le plus récent, ou null. */
  lastDocumentAt: string | null;
};

type CustomerRow = {
  id: string;
  fullName: string;
  phoneE164: string | null;
  whatsappE164: string | null;
  snapchat: string | null;
  lastDocumentAt: Date | null;
};

const words = (...parts: (string | null | undefined)[]) =>
  parts
    .filter((part): part is string => !!part)
    .flatMap((part) => part.split(/\s+/))
    .map(cleNom)
    .filter(Boolean)
    .join(" ");

const cachedCustomers = cached("search.customers", "gestion", async (): Promise<CustomerEntry[]> => {
  const rows = await db.$queryRaw<CustomerRow[]>`
    SELECT c.id, c."fullName", c."phoneE164", c."whatsappE164", c.snapchat, max(d."orderedAt") AS "lastDocumentAt"
    FROM "Customer" c
    LEFT JOIN "SaleDocument" d ON d."customerId" = c.id
    GROUP BY c.id
    ORDER BY max(d."orderedAt") DESC NULLS LAST, c."fullName" ASC, c.id ASC`;
  return rows.map((row) => {
    const digits = [row.phoneE164, row.whatsappE164].filter((p): p is string => !!p).flatMap(phoneSearchDigits);
    return {
      id: row.id,
      fullName: row.fullName,
      contact: row.phoneE164 ? formatPhoneNational(row.phoneE164) : row.snapchat ? `@${row.snapchat}` : null,
      haystack: `${words(row.fullName, row.snapchat)} ${digits.join(" ")}`,
      digits: digits.join(" "),
      lastDocumentAt: row.lastDocumentAt?.toISOString() ?? null,
    };
  });
});

type DocumentEntry = Omit<DocumentHitDTO, "due"> & { due: MoneyString; haystack: string };

type DocumentRow = {
  id: string;
  origin: DocumentOrigin;
  status: DocumentStatus;
  orderedAt: Date;
  typedName: string | null;
  liveName: string | null;
  total: string;
  due: string;
};

const cachedDocuments = cached("search.documents", "gestion", async (): Promise<DocumentEntry[]> => {
  const rows = await db.$queryRaw<DocumentRow[]>`
    SELECT d.id, d.origin::text AS origin, d.status::text AS status, d."orderedAt",
           d."customerName" AS "typedName", c."fullName" AS "liveName", b.total::text AS total, b.due::text AS due
    FROM "SaleDocument" d
    JOIN "DocumentBalance" b ON b."documentId" = d.id
    LEFT JOIN "Customer" c ON c.id = d."customerId"
    ORDER BY d."orderedAt" DESC, d.id DESC`;
  return rows.map((row) => ({
    id: row.id,
    origin: row.origin,
    status: row.status,
    orderedAt: row.orderedAt.toISOString(),
    customerName: row.liveName ?? row.typedName,
    total: toWire(eurFromDb(row.total)),
    due: toWire(eurFromDb(row.due)),
    // Nom VIVANT de la fiche ET nom saisi dans le document (06 §4.4).
    haystack: words(row.liveName, row.typedName),
  }));
});

// ── Correspondance ─────────────────────────────────────────────────────────────

type Matcher = { terms: string[]; phone: string[] | null };

function matcherOf(q: string): Matcher | null {
  if (q.trim().length < SEARCH_MIN_LENGTH) return null;
  const terms = searchTerms(q).map(cleNom).filter(Boolean);
  const phone = phoneDigitVariants(q);
  return terms.length > 0 || phone ? { terms, phone } : null;
}

function matches(matcher: Matcher, haystack: string, digits = ""): boolean {
  if (matcher.terms.length > 0 && matcher.terms.every((term) => haystack.includes(term))) return true;
  return matcher.phone !== null && digits !== "" && matcher.phone.some((variant) => digits.includes(variant));
}

/** Les correspondances dont un mot COMMENCE par la saisie passent devant ; l'ordre d'origine est gardé sinon. */
function rank<T extends { haystack: string }>(entries: T[], matcher: Matcher): T[] {
  const first = matcher.terms[0];
  if (!first) return entries;
  const starts = (entry: T) => entry.haystack.split(" ").some((word) => word.startsWith(first));
  return [...entries.filter(starts), ...entries.filter((entry) => !starts(entry))];
}

function group<T, H>(entries: T[], limit: number, hit: (entry: T) => H): SearchGroupDTO<H> {
  return { total: entries.length, items: entries.slice(0, limit).map(hit) };
}

const EMPTY: SearchGroupDTO<never> = { total: 0, items: [] };

/** Groupes de 6 pour la palette ; une portée seule rend jusqu'à 50 résultats (sélecteurs S06). */
const SCOPED_LIMIT = 50;

/**
 * S17 et sélecteurs : les résultats de `q` dans la portée demandée. Saisie de moins de 2 caractères : aucun
 * résultat, sauf, pour la portée `customers`, les 8 clients au document le plus récent (S06 « Récents »).
 */
export const searchAdmin = defineQuery(async (q: string, scope: SearchScope): Promise<SearchResultsDTO> => {
  const matcher = matcherOf(q);
  const limit = scope === "all" ? SEARCH_GROUP_LIMIT : SCOPED_LIMIT;
  const wants = (target: SearchScope) => scope === "all" || scope === target;

  const needCustomers = wants("customers") && (matcher !== null || scope === "customers");
  // Les créances ne servent qu'aux actions de résultat de S17 (portée `all`, A16) : un sélecteur S06 ne les lit pas.
  const needReceivables = needCustomers && scope === "all" && matcher !== null;
  const [customers, dues, receivables, documents, catalogue] = await Promise.all([
    needCustomers ? cachedCustomers() : Promise.resolve([] as CustomerEntry[]),
    needCustomers ? aEncaisserParClient() : Promise.resolve({} as Record<string, MoneyString>),
    needReceivables ? aEncaisserDetail() : Promise.resolve([] as ReceivableDTO[]),
    matcher && wants("documents") ? cachedDocuments() : Promise.resolve([] as DocumentEntry[]),
    matcher && wants("perfumes") ? adminCatalogue() : Promise.resolve(null),
  ]);

  const customerHit = (entry: CustomerEntry): CustomerHitDTO => ({
    id: entry.id,
    fullName: entry.fullName,
    contact: entry.contact,
    due: dues[entry.id] ?? null,
    // Déjà triées des plus anciennes aux plus récentes par `aEncaisserDetail()` : « Tout encaisser » les
    // solde dans cet ordre (06 S02, A-5).
    receivables: receivables.filter((item) => item.customerId === entry.id),
  });

  if (!matcher) {
    return {
      q,
      customers: EMPTY,
      documents: EMPTY,
      perfumes: EMPTY,
      recentCustomers: scope === "customers" ? customers.slice(0, RECENT_CUSTOMERS_LIMIT).map(customerHit) : [],
      pockets: [],
    };
  }

  const foundCustomers = rank(
    customers.filter((entry) => matches(matcher, entry.haystack, entry.digits)),
    matcher,
  );
  const foundDocuments = documents.filter((entry) => matches(matcher, entry.haystack));
  const perfumeEntries = (catalogue?.perfumes ?? []).map((perfume) => ({ perfume, haystack: perfume.searchKey }));
  const foundPerfumes = rank(
    perfumeEntries.filter((entry) => matcher.terms.length > 0 && matcher.terms.every((term) => entry.haystack.includes(term))),
    matcher,
  );

  const customerGroup = group(foundCustomers, limit, customerHit);
  // Les poches ne se lisent que si une action « Encaisser xx € » va vraiment s'afficher : hors cache
  // (`activePockets`), c'est une lecture de soldes qu'une frappe ordinaire ne doit pas payer.
  const pockets = customerGroup.items.some((hit) => hit.receivables.length > 0) ? await activePockets() : [];

  return {
    q,
    customers: customerGroup,
    documents: group(foundDocuments, limit, (entry): DocumentHitDTO => ({
      id: entry.id,
      origin: entry.origin,
      status: entry.status,
      orderedAt: entry.orderedAt,
      customerName: entry.customerName,
      total: entry.total,
      due: isEngaged(entry.status) ? entry.due : null,
    })),
    perfumes: group(foundPerfumes, limit, ({ perfume }): PerfumeHitDTO => ({
      id: perfume.id,
      name: perfume.name,
      brandName: perfume.brand.name,
      image: perfume.image,
      status: perfume.status,
      stockStatus: perfume.stockStatus,
    })),
    recentCustomers: [],
    pockets,
  };
});
