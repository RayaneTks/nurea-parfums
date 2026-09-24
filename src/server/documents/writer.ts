import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  DIRECT_SALE_DELIVERY_MESSAGE,
  ITEM_REQUIRED_MESSAGE,
  customerNameRequirement,
  hasCustomerName,
  receivedAboveTotalMessage,
  type AssignDocumentsToBatchData,
  type BatchAssignment,
  type CancelDocumentData,
  type CancellationResult,
  type ChangeDocumentStatusData,
  type CreateDocumentData,
  type CreateLineData,
  type DeliverAndCollectData,
  type DeliveryAndCollection,
  type DocumentCustomerData,
  type DocumentDeletion,
  type DocumentState,
  type DocumentStatusChange,
  type DocumentSummary,
  type LineDelivery,
  type LineItem,
  type RevertResult,
  type AttachLineToCatalogueData,
  type SetLineDeliveredData,
  type UpdateDocumentData,
  type UpdateLineData,
} from "@/contracts/documents";
import type { CollectAllData, CollectAllResult, PaymentKind, PaymentResult, RecordPaymentData } from "@/contracts/payments";
import { futureDateMessage, valueDateOf } from "@/contracts/treasury";
import { documentBalance } from "@/domain/document-balance";
import {
  assertTransition,
  canTransition,
  initialStatus,
  isEngaged,
  timestampsAfter,
  type DocumentOrigin,
  type DocumentStatus,
} from "@/domain/document-status";
import { DomainError, NeedsConfirmation } from "@/domain/errors";
import { clampDelivered, deriveFulfillment } from "@/domain/fulfillment";
import {
  dzdFromDb,
  dzdToEur,
  eur,
  eurFromDb,
  eurFromWire,
  formatEur,
  rateFromDb,
  toDb,
  toWire,
  type Dzd,
  type Eur,
  type MoneyString,
  type Rate,
} from "@/domain/money";
import { periodStart } from "@/domain/periods";
import { storedLineViolation, type VolumeMl } from "@/domain/sale-line";
import { insufficientStock } from "@/domain/stock";
import { BATCH_NOT_FOUND } from "@/server/batches/writer";
import { marqueEquivalente } from "@/server/catalogue/resoudMarque";
import * as catalogueStock from "@/server/catalogue/stock";
import { upsertPricing } from "@/server/catalogue/writer";
import * as customersWriter from "@/server/customers/writer";
import type { Tx } from "@/server/db/transaction";
import { adminJwtSecret } from "@/server/env";
import * as paymentsWriter from "@/server/payments/writer";
import * as settingsWriter from "@/server/settings/writer";
import * as treasuryWriter from "@/server/treasury/writer";

/**
 * Seul fichier qui écrit `SaleDocument` et `SaleLine` (03 §4.2, 04 §4.3). Il décide les deltas de stock
 * (écrits par `catalogue/stock.ts`), apprend les tarifs (`catalogue/writer.ts`, N8) et crée en ligne les
 * fiches client (`customers/writer.ts`).
 *
 * Chaque fonction exportée est le corps complet d'une transaction de 03 §4.3 et reçoit `tx` : l'action
 * l'enveloppe dans `inTransaction`, un test peut l'y appeler directement. Ordre invariable : verrous,
 * lectures, gardes et réserves, PUIS écritures — une réserve non confirmée ou un refus n'écrit rien
 * (et le ROLLBACK le garantirait de toute façon).
 *
 * J5 : T1 sans paiement, T2, T3, T4, T6, T13. J6 : les gestes d'argent qui écrivent aussi le document —
 * paiements de création (T1, N1), encaisser (T7, confirmation automatique), « Tout encaisser » et « Livrer et
 * encaisser » (A-5), annuler (T5, remboursements), défaire un geste (T4b). Ils composent les pièces de
 * `payments/writer.ts` (seul écrivain de `Payment`), qui n'importe jamais ce fichier.
 */

// ── Messages ───────────────────────────────────────────────────────────────────

const DOCUMENT_NOT_FOUND = "Ce document n'existe plus. Il a peut-être été supprimé depuis un autre écran.";
const LINE_NOT_FOUND = "Cette ligne n'existe plus. Recharge le document pour voir sa version à jour.";
const PERFUME_NOT_FOUND = "Ce parfum n'existe plus dans le catalogue : choisis-en un autre.";
const FOREIGN_LINE = "Une des lignes appartient à un autre document : recharge la page et réessaie.";

const noun = (origin: DocumentOrigin) => (origin === "DIRECT_SALE" ? "vente" : "commande");

function closedBatch(name: string, origin: DocumentOrigin, gesture: "attach" | "detach"): DomainError {
  const verb = gesture === "attach" ? "y rattacher" : "en retirer";
  return new DomainError("CONFLICT", `Le lot « ${name} » est clos : rouvre-le pour ${verb} cette ${noun(origin)}.`);
}

/** « Sauvage 100 ml — 2 déjà livrés : le livré passera à 1. » (06 S01). */
function belowDeliveredReserve(name: string, volumeMl: number, delivered: number, quantity: number): string {
  const already = delivered > 1 ? `${delivered} déjà livrés` : `${delivered} déjà livré`;
  return `${name} ${volumeMl} ml — ${already} : le livré passera à ${quantity}.`;
}

// ── Lectures sous verrou ───────────────────────────────────────────────────────

const DOCUMENT_SELECT = {
  id: true,
  origin: true,
  status: true,
  customerId: true,
  customerName: true,
  batchId: true,
  expectedDeliveryAt: true,
  expectedDeliveryHasTime: true,
  confirmedAt: true,
  deliveredAt: true,
  cancelledAt: true,
} as const;

const LINE_SELECT = {
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
} as const;

/** Verrou `FOR UPDATE` du document (rang 1) puis sa lecture ; NOT_FOUND s'il a disparu. */
async function lockDocument(tx: Tx, id: string) {
  const { documents } = await tx.lock({ documents: [id] });
  if (documents.length === 0) throw new DomainError("NOT_FOUND", DOCUMENT_NOT_FOUND);
  return tx.db.saleDocument.findUniqueOrThrow({ where: { id }, select: DOCUMENT_SELECT });
}

type StoredDocument = Awaited<ReturnType<typeof lockDocument>>;

function readLines(tx: Tx, documentId: string) {
  return tx.db.saleLine.findMany({
    where: { documentId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: LINE_SELECT,
  });
}

type StoredLine = Awaited<ReturnType<typeof readLines>>[number];
type DbDecimal = StoredLine["unitPriceEur"];

/** Payé net : somme signée des mouvements des paiements du document. */
async function readPaid(tx: Tx, documentId: string): Promise<Eur> {
  const payments = await tx.db.payment.findMany({
    where: { documentId },
    select: { movement: { select: { amount: true } } },
  });
  return eur.sum(payments.map((payment) => eurFromDb(payment.movement.amount)));
}

function storedTotal(lines: readonly Pick<StoredLine, "quantity" | "unitPriceEur">[]): Eur {
  return eur.sum(lines.map((line) => eur.times(eurFromDb(line.unitPriceEur), line.quantity)));
}

/** Le résumé renvoyé à l'écran : jumeau de la vue `DocumentBalance` pour ce document (04 §6.4). */
async function summarize(tx: Tx, id: string): Promise<DocumentSummary | null> {
  const doc = await tx.db.saleDocument.findUnique({
    where: { id },
    select: {
      id: true,
      origin: true,
      status: true,
      lines: { select: { quantity: true, unitPriceEur: true, unitCostEur: true } },
      payments: { select: { movement: { select: { amount: true } } } },
    },
  });
  if (!doc) return null;
  const balance = documentBalance(
    doc.lines.map((line) => ({
      quantity: line.quantity,
      unitPriceEur: eurFromDb(line.unitPriceEur),
      unitCostEur: line.unitCostEur === null ? null : eurFromDb(line.unitCostEur),
    })),
    doc.payments.map((payment) => ({ amount: eurFromDb(payment.movement.amount) })),
  );
  return {
    id: doc.id,
    origin: doc.origin,
    status: doc.status,
    total: toWire(balance.total),
    paid: toWire(balance.paid),
    due: toWire(balance.due),
  };
}

async function summaryOf(tx: Tx, id: string): Promise<DocumentSummary> {
  const summary = await summarize(tx, id);
  if (!summary) throw new DomainError("NOT_FOUND", DOCUMENT_NOT_FOUND);
  return summary;
}

// ── Lignes reprises hors règles (03 §4.3) ──────────────────────────────────────

function isPositiveRate(value: DbDecimal | null): boolean {
  if (value === null) return false;
  try {
    rateFromDb(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Toute transaction qui met à jour une ligne existante sans en réécrire les valeurs (T3, T4) la confronte
 * d'abord aux règles de ligne : un CHECK resté `NOT VALID` après la reprise refuserait sinon l'écriture.
 * Le champ désigne la ligne par son identifiant (`lines.<id>.volumeMl`) : l'écran ouvre la fiche en
 * édition sur elle (06 S01). T2 réécrit les valeurs depuis une saisie validée par le contrat : la
 * correction passe par là.
 */
function assertStoredLinesWritable(lines: readonly StoredLine[]): void {
  for (const line of lines) {
    const violation = storedLineViolation({
      perfumeName: line.perfumeName,
      volumeMl: line.volumeMl,
      isGift: line.isGift,
      unitPriceEur: eurFromDb(line.unitPriceEur),
      hasUnitCostDzd: line.unitCostDzd !== null,
      hasValidExchangeRate: isPositiveRate(line.exchangeRate),
    });
    if (violation) throw new DomainError("VALIDATION", violation.message, `lines.${line.id}.${violation.field}`);
  }
}

// ── Pièces communes ────────────────────────────────────────────────────────────

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

type CustomerColumns = { customerId: string | null; customerName: string | null; customerContact: string | null };

/**
 * Pose le client : la clé étrangère est TOUJOURS écrite avec le snapshot du nom (fin de l'historique
 * client vide, 01 §4.10) ; une fiche créée en ligne l'est par le writer `customers`, dans la transaction.
 */
async function resolveCustomer(tx: Tx, choice: DocumentCustomerData): Promise<CustomerColumns> {
  switch (choice.kind) {
    case "passing":
      return { customerId: null, customerName: choice.name ?? null, customerContact: choice.contact ?? null };
    case "linked": {
      const customer = await customersWriter.findCustomerForLink(tx, choice.customerId);
      return { customerId: customer.id, customerName: customer.fullName, customerContact: null };
    }
    case "new": {
      const customer = await customersWriter.createCustomer(tx, choice.customer);
      return { customerId: customer.id, customerName: customer.fullName, customerContact: null };
    }
    case "named": {
      const customer = await customersWriter.findOrCreateCustomerByName(tx, choice.name);
      return { customerId: customer.id, customerName: customer.fullName, customerContact: null };
    }
    default: {
      const _exhaustive: never = choice;
      return _exhaustive;
    }
  }
}

/** Sans heure choisie, la livraison prévue est le jour à 00:00 Europe/Paris (03 §3, 06 E11). */
function expectedDelivery(at: Date | null | undefined, hasTime: boolean | undefined) {
  if (!at) return { expectedDeliveryAt: null, expectedDeliveryHasTime: false };
  return hasTime
    ? { expectedDeliveryAt: at, expectedDeliveryHasTime: true }
    : { expectedDeliveryAt: periodStart("day", at), expectedDeliveryHasTime: false };
}

type Snapshot = {
  perfumeId: number | null;
  isOffCatalog: boolean;
  perfumeName: string;
  brandName: string | null;
  imageUrl: string | null;
};

/** Snapshot typé d'un parfum du catalogue, lu en base — jamais envoyé par l'écran. */
async function readPerfumeSnapshots(tx: Tx, ids: readonly number[]): Promise<Map<number, Snapshot>> {
  if (ids.length === 0) return new Map();
  const rows = await tx.db.perfume.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, name: true, image: true, brand: { select: { name: true } } },
  });
  const snapshots = new Map<number, Snapshot>(
    rows.map((perfume) => [
      perfume.id,
      {
        perfumeId: perfume.id,
        isOffCatalog: false,
        perfumeName: perfume.name,
        brandName: perfume.brand.name,
        imageUrl: perfume.image.trim() === "" ? null : perfume.image,
      },
    ]),
  );
  if (ids.some((id) => !snapshots.has(id))) throw new DomainError("NOT_FOUND", PERFUME_NOT_FOUND);
  return snapshots;
}

type OffCatalogItem = Extract<LineItem, { kind: "offCatalog" }>;

/**
 * Marque d'un article hors catalogue (06 S05) : si une marque équivalente est au catalogue (`cleNom` : casse,
 * accents, ponctuation), la ligne en prend l'orthographe — « lattafa » devient « Lattafa ». Lecture seule
 * (`resoudMarque`) : aucune marque n'est créée par une vente.
 */
async function readOffCatalogBrands(tx: Tx, items: readonly (LineItem | undefined)[]): Promise<Map<string, string>> {
  const typed = unique(items.flatMap((item) => (item?.kind === "offCatalog" && item.brandName ? [item.brandName] : [])));
  const resolved = new Map<string, string>();
  for (const name of typed) {
    const existing = await marqueEquivalente(tx.db, name);
    if (existing) resolved.set(name, existing.name);
  }
  return resolved;
}

function offCatalogSnapshot(item: OffCatalogItem, brands: ReadonlyMap<string, string>, imageUrl: string | null = null): Snapshot {
  const brandName = item.brandName ? (brands.get(item.brandName) ?? item.brandName) : null;
  return { perfumeId: null, isOffCatalog: true, perfumeName: item.name, brandName, imageUrl };
}

type LineAmounts = { unitPriceEur: Eur; unitCostDzd: Dzd | null; exchangeRate: Rate | null };

function amountsOf(line: CreateLineData | UpdateLineData): LineAmounts {
  return {
    unitPriceEur: eurFromWire(line.unitPriceEur),
    unitCostDzd: line.unitCostDzd === null ? null : dzdFromDb(line.unitCostDzd),
    exchangeRate: line.exchangeRate === null ? null : rateFromDb(line.exchangeRate),
  };
}

/** LA conversion, à l'écriture de la ligne : `unitCostEur = dzdToEur(coût, taux)`, NULL sans coût (03 §4.8). */
function costEurOf(amounts: LineAmounts): string | null {
  return amounts.unitCostDzd !== null && amounts.exchangeRate !== null
    ? toDb(dzdToEur(amounts.unitCostDzd, amounts.exchangeRate))
    : null;
}

function amountColumns(amounts: LineAmounts) {
  return {
    unitPriceEur: toDb(amounts.unitPriceEur),
    unitCostDzd: amounts.unitCostDzd === null ? null : toDb(amounts.unitCostDzd),
    exchangeRate: amounts.exchangeRate === null ? null : toDb(amounts.exchangeRate),
  };
}

/** Même valeur exacte, quelle que soit sa graphie (« 277 » et « 277.0000 »). */
function sameDecimal(
  stored: DbDecimal | null,
  next: Eur | Dzd | Rate | null,
  read: (value: DbDecimal) => Eur | Dzd | Rate,
): boolean {
  if (stored === null || next === null) return stored === null && next === null;
  try {
    return toDb(read(stored)) === toDb(next);
  } catch {
    return false;
  }
}

type PricedLine = { perfumeId: number | null; isGift: boolean; volumeMl: VolumeMl; amounts: LineAmounts };

/** N8 : chaque ligne non offerte d'un parfum du catalogue met à jour sa mémoire de prix. */
async function learnPricing(tx: Tx, lines: readonly PricedLine[]): Promise<void> {
  for (const line of lines) {
    if (line.perfumeId === null || line.isGift) continue;
    await upsertPricing(tx, {
      perfumeId: line.perfumeId,
      volumeMl: line.volumeMl,
      unitPriceEur: line.amounts.unitPriceEur,
      unitCostDzd: line.amounts.unitCostDzd,
      exchangeRate: line.amounts.exchangeRate,
    });
  }
}

/** Lot verrouillé par l'appelant (`FOR SHARE`), lu ; ouvert exigé pour y rattacher (03 §4.3 T13). */
async function assertBatchOpen(tx: Tx, batchId: string, origin: DocumentOrigin): Promise<void> {
  const batch = await tx.db.batch.findUnique({ where: { id: batchId }, select: { name: true, status: true } });
  if (!batch) throw new DomainError("NOT_FOUND", BATCH_NOT_FOUND);
  if (batch.status === "CLOSED") throw closedBatch(batch.name, origin, "attach");
}

// ── T1 : créer un document ─────────────────────────────────────────────────────

export type PocketLocks = { update?: readonly string[]; share?: readonly string[] };

/**
 * T1. Une commande naît `PENDING` — `CONFIRMED` si elle reçoit un acompte (verdict sans réserve, 03 §2.3) —,
 * une vente directe naît `DELIVERED` (quantités livrées complètes, stock décrémenté, `confirmedAt` et
 * `deliveredAt` posés). Rejeu : un identifiant déjà écrit rend le document existant sans rien réécrire
 * (04 §3.6).
 *
 * Paiements de création (« Reçu maintenant », acompte, N1) : Σ ≤ total, datés de l'instant de la création,
 * solde pour une vente (livrée), acompte pour une commande ; poches verrouillées en partage (des entrées,
 * 04 §4.2) dans le même appel que le lot, pour tenir l'ordre canonique (lots → poches → parfums). La poche du
 * premier paiement devient la poche proposée (N2). `options.pockets` : verrous supplémentaires éventuels.
 */
export async function createDocument(
  tx: Tx,
  input: CreateDocumentData,
  options: { pockets?: PocketLocks } = {},
): Promise<DocumentSummary> {
  const replay = await summarize(tx, input.id);
  if (replay) return replay;

  const payments = input.payments ?? [];
  const paymentPockets: string[] = [];
  for (const payment of payments) paymentPockets.push(await treasuryWriter.resolvePocketId(tx, payment.pocketId));
  await tx.lock({
    batches: input.batchId ? { share: [input.batchId] } : undefined,
    pockets: { update: options.pockets?.update, share: [...(options.pockets?.share ?? []), ...paymentPockets] },
  });
  if (input.batchId) await assertBatchOpen(tx, input.batchId, input.origin);

  const catalogueIds = unique(input.lines.flatMap((line) => (line.item.kind === "catalogue" ? [line.item.perfumeId] : [])));
  const perfumes = await readPerfumeSnapshots(tx, catalogueIds);
  const brands = await readOffCatalogBrands(tx, input.lines.map((line) => line.item));
  const lines = input.lines.map((line, position) => ({
    line,
    position,
    snapshot: line.item.kind === "catalogue" ? (perfumes.get(line.item.perfumeId) as Snapshot) : offCatalogSnapshot(line.item, brands),
    amounts: amountsOf(line),
  }));

  const total = eur.sum(lines.map(({ line, amounts }) => eur.times(amounts.unitPriceEur, line.quantity)));
  const received = eur.sum(payments.map((payment) => eurFromWire(payment.amount)));
  if (eur.compare(received, total) > 0) throw new DomainError("VALIDATION", receivedAboveTotalMessage(total), "payments");
  const status = initialStatus(input.origin, received);
  const delivered = status === "DELIVERED";
  const deltas = delivered
    ? lines.flatMap(({ line, snapshot }) =>
        snapshot.perfumeId === null ? [] : [{ perfumeId: snapshot.perfumeId, delta: line.quantity }],
      )
    : [];
  if (deltas.length > 0) {
    const reserves = await catalogueStock.stockReserves(tx, deltas);
    if (reserves.length > 0 && !input.confirm) throw insufficientStock(reserves);
  }

  const customer = await resolveCustomer(tx, input.customer);
  await tx.db.saleDocument.create({
    data: {
      id: input.id,
      origin: input.origin,
      status,
      ...customer,
      batchId: input.batchId ?? null,
      orderedAt: tx.now,
      ...expectedDelivery(input.expectedDeliveryAt, input.expectedDeliveryHasTime),
      confirmedAt: isEngaged(status) ? tx.now : null,
      deliveredAt: delivered ? tx.now : null,
      notes: input.notes ?? null,
    },
    select: { id: true },
  });
  await tx.db.saleLine.createMany({
    data: lines.map(({ line, position, snapshot, amounts }) => ({
      documentId: input.id,
      position,
      ...snapshot,
      volumeMl: line.volumeMl,
      quantity: line.quantity,
      deliveredQuantity: delivered ? line.quantity : 0,
      isGift: line.isGift,
      ...amountColumns(amounts),
      unitCostEur: costEurOf(amounts),
      note: line.note ?? null,
    })),
  });
  if (deltas.length > 0) await catalogueStock.applyDeliveredDeltas(tx, deltas, { confirm: input.confirm });
  await learnPricing(
    tx,
    lines.map(({ line, snapshot, amounts }) => ({
      perfumeId: snapshot.perfumeId,
      isGift: line.isGift,
      volumeMl: line.volumeMl,
      amounts,
    })),
  );
  for (const [index, payment] of payments.entries()) {
    await paymentsWriter.insertPayment(tx, {
      id: payment.id,
      documentId: input.id,
      kind: delivered ? "BALANCE" : "DEPOSIT",
      amount: eurFromWire(payment.amount),
      pocketId: paymentPockets[index] as string,
      occurredAt: tx.now,
    });
  }
  if (paymentPockets.length > 0) await settingsWriter.rememberPocket(tx, paymentPockets[0] as string);
  return summaryOf(tx, input.id);
}

// ── T2 : modifier en place ─────────────────────────────────────────────────────

type TargetLine = {
  id: string;
  position: number;
  existing: StoredLine | null;
  snapshot: Snapshot;
  volumeMl: VolumeMl;
  quantity: number;
  deliveredQuantity: number;
  isGift: boolean;
  amounts: LineAmounts;
  /** Chaîne exacte, ou la valeur en base conservée quand coût et taux ne changent pas. */
  unitCostEur: string | null;
  note: string | null;
  write: "create" | "update" | "none";
  /** Ligne neuve, ou parfum, volume, prix, coût ou taux changés : elle apprend (N8). */
  tariffChanged: boolean;
};

type LinePlan = {
  target: TargetLine[];
  removed: StoredLine[];
  deltas: catalogueStock.DeliveredDelta[];
  lineReserves: string[];
};

/**
 * Plan de T2, sans écriture. Les lignes sont modifiées EN PLACE — jamais supprimées puis recréées : la
 * quantité livrée survit à toute édition (bug haute 01 §4.1). Quantité livrée cible :
 * - ligne ajoutée : 0, sauf dans un document livré (vente directe, commande livrée) où elle naît livrée ;
 * - document livré, ligne entièrement livrée : elle le reste à sa nouvelle quantité ;
 * - sinon le livré est conservé, borné à la nouvelle quantité avec une réserve s'il la dépasse (06 S01).
 * Le stock suit le delta de chaque ligne, parfum changé compris ; une ligne retirée restitue son livré.
 */
async function planLines(
  tx: Tx,
  doc: StoredDocument,
  current: readonly StoredLine[],
  lines: readonly UpdateLineData[],
): Promise<LinePlan> {
  const existingById = new Map(current.map((line) => [line.id, line]));
  const unknownIds = lines.filter((line) => !existingById.has(line.id)).map((line) => line.id);
  if (unknownIds.length > 0 && (await tx.db.saleLine.count({ where: { id: { in: unknownIds } } })) > 0) {
    throw new DomainError("CONFLICT", FOREIGN_LINE);
  }

  lines.forEach((line, index) => {
    const existing = existingById.get(line.id);
    const field = `lines.${index}.item`;
    if (!existing && !line.item) throw new DomainError("VALIDATION", ITEM_REQUIRED_MESSAGE, field);
    if (existing && line.item?.kind === "offCatalog" && !existing.isOffCatalog) {
      throw new DomainError("VALIDATION", "Cette ligne vient du catalogue : retire-la puis ajoute l'article hors catalogue.", field);
    }
    if (existing && line.item?.kind === "catalogue" && existing.isOffCatalog) {
      throw new DomainError("VALIDATION", "Cette ligne est hors catalogue : retire-la puis ajoute le parfum du catalogue.", field);
    }
  });

  const snapshotIds = unique(
    lines.flatMap((line) =>
      line.item?.kind === "catalogue" && line.item.perfumeId !== existingById.get(line.id)?.perfumeId
        ? [line.item.perfumeId]
        : [],
    ),
  );
  const perfumes = await readPerfumeSnapshots(tx, snapshotIds);
  const brands = await readOffCatalogBrands(tx, lines.map((line) => line.item));

  const documentDelivered = doc.status === "DELIVERED";
  const deltas: catalogueStock.DeliveredDelta[] = [];
  const lineReserves: string[] = [];
  const kept = new Set(lines.map((line) => line.id));

  const target = lines.map((line, position): TargetLine => {
    const existing = existingById.get(line.id) ?? null;
    let snapshot: Snapshot;
    if (!line.item) snapshot = existing as StoredLine;
    else if (line.item.kind === "offCatalog") snapshot = offCatalogSnapshot(line.item, brands, existing?.imageUrl ?? null);
    else if (existing && existing.perfumeId === line.item.perfumeId) snapshot = existing;
    else snapshot = perfumes.get(line.item.perfumeId) as Snapshot;
    snapshot = {
      perfumeId: snapshot.perfumeId,
      isOffCatalog: snapshot.isOffCatalog,
      perfumeName: snapshot.perfumeName,
      brandName: snapshot.brandName,
      imageUrl: snapshot.imageUrl,
    };

    let deliveredQuantity: number;
    if (!existing) {
      deliveredQuantity = documentDelivered ? line.quantity : 0;
    } else if (documentDelivered && existing.deliveredQuantity >= existing.quantity) {
      deliveredQuantity = line.quantity;
    } else if (existing.deliveredQuantity > line.quantity) {
      deliveredQuantity = line.quantity;
      lineReserves.push(
        belowDeliveredReserve(snapshot.perfumeName, line.volumeMl, existing.deliveredQuantity, line.quantity),
      );
    } else {
      deliveredQuantity = existing.deliveredQuantity;
    }

    if (existing?.perfumeId != null && existing.deliveredQuantity > 0) {
      deltas.push({ perfumeId: existing.perfumeId, delta: -existing.deliveredQuantity });
    }
    if (snapshot.perfumeId !== null && deliveredQuantity > 0) {
      deltas.push({ perfumeId: snapshot.perfumeId, delta: deliveredQuantity });
    }

    const amounts = amountsOf(line);
    const note = line.note ?? null;
    const costUnchanged =
      existing !== null &&
      sameDecimal(existing.unitCostDzd, amounts.unitCostDzd, dzdFromDb) &&
      sameDecimal(existing.exchangeRate, amounts.exchangeRate, rateFromDb);
    // Un coût figé à la saisie ne se re-dérive pas quand ni le coût ni le taux ne changent (03 §4.6) :
    // un coût en euros repris de l'existant sans coût en dinars survit à l'édition d'une note.
    const unitCostEur = costUnchanged ? (existing.unitCostEur?.toString() ?? null) : costEurOf(amounts);

    const identityChanged =
      existing === null ||
      existing.perfumeId !== snapshot.perfumeId ||
      existing.isOffCatalog !== snapshot.isOffCatalog ||
      existing.perfumeName !== snapshot.perfumeName ||
      existing.brandName !== snapshot.brandName ||
      existing.imageUrl !== snapshot.imageUrl;
    const tariffChanged =
      identityChanged ||
      existing.volumeMl !== line.volumeMl ||
      !sameDecimal(existing.unitPriceEur, amounts.unitPriceEur, eurFromDb) ||
      !costUnchanged;
    const changed =
      tariffChanged ||
      existing.position !== position ||
      existing.quantity !== line.quantity ||
      existing.deliveredQuantity !== deliveredQuantity ||
      existing.isGift !== line.isGift ||
      !sameDecimal(existing.unitCostEur, unitCostEur === null ? null : eurFromDb(unitCostEur), eurFromDb) ||
      existing.note !== note;

    return {
      id: line.id,
      position,
      existing,
      snapshot,
      volumeMl: line.volumeMl,
      quantity: line.quantity,
      deliveredQuantity,
      isGift: line.isGift,
      amounts,
      unitCostEur,
      note,
      write: existing === null ? "create" : changed ? "update" : "none",
      tariffChanged,
    };
  });

  const removed = current.filter((line) => !kept.has(line.id));
  for (const line of removed) {
    if (line.perfumeId !== null && line.deliveredQuantity > 0) {
      deltas.push({ perfumeId: line.perfumeId, delta: -line.deliveredQuantity });
    }
  }
  return { target, removed, deltas, lineReserves };
}

function lineColumns(line: TargetLine) {
  return {
    position: line.position,
    ...line.snapshot,
    volumeMl: line.volumeMl,
    quantity: line.quantity,
    deliveredQuantity: line.deliveredQuantity,
    isGift: line.isGift,
    ...amountColumns(line.amounts),
    unitCostEur: line.unitCostEur,
    note: line.note,
  };
}

/**
 * T2. Lignes (mise à jour, ajout, retrait), client, livraison prévue, notes. Un champ absent n'est pas
 * touché ; `lines` présent est l'état cible complet. Réserves (quantité passée sous le livré, stock
 * insuffisant) réunies en un seul dialogue.
 */
export async function updateDocument(tx: Tx, input: UpdateDocumentData): Promise<DocumentSummary> {
  const doc = await lockDocument(tx, input.documentId);
  const current = await readLines(tx, doc.id);
  const plan = input.lines ? await planLines(tx, doc, current, input.lines) : null;

  if (input.expectedDeliveryAt && doc.origin === "DIRECT_SALE") {
    throw new DomainError("VALIDATION", DIRECT_SALE_DELIVERY_MESSAGE, "expectedDeliveryAt");
  }
  if (input.customer !== undefined && !hasCustomerName(input.customer)) {
    const total = plan
      ? eur.sum(plan.target.map((line) => eur.times(line.amounts.unitPriceEur, line.quantity)))
      : storedTotal(current);
    const due = eur.clampZero(eur.sub(total, await readPaid(tx, doc.id)));
    const message = customerNameRequirement(doc.origin, due);
    if (message) throw new DomainError("VALIDATION", message, "customer");
  }

  if (plan) {
    const stock = plan.deltas.length > 0 ? await catalogueStock.stockReserves(tx, plan.deltas) : [];
    const reserves = [...plan.lineReserves, ...stock];
    if (reserves.length > 0 && !input.confirm) {
      throw plan.lineReserves.length > 0
        ? new NeedsConfirmation("Enregistrer les modifications ?", reserves, "Enregistrer")
        : insufficientStock(reserves);
    }
  }

  const data = {
    ...(input.customer !== undefined ? await resolveCustomer(tx, input.customer) : {}),
    ...(input.expectedDeliveryAt !== undefined
      ? expectedDelivery(input.expectedDeliveryAt, input.expectedDeliveryHasTime)
      : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  };
  if (Object.keys(data).length > 0) {
    await tx.db.saleDocument.update({ where: { id: doc.id }, data, select: { id: true } });
  }

  if (plan) {
    if (plan.removed.length > 0) {
      await tx.db.saleLine.deleteMany({ where: { documentId: doc.id, id: { in: plan.removed.map((line) => line.id) } } });
    }
    for (const line of plan.target) {
      if (line.write !== "update") continue;
      await tx.db.saleLine.update({ where: { id: line.id }, data: lineColumns(line), select: { id: true } });
    }
    const created = plan.target.filter((line) => line.write === "create");
    if (created.length > 0) {
      await tx.db.saleLine.createMany({ data: created.map((line) => ({ id: line.id, documentId: doc.id, ...lineColumns(line) })) });
    }
    if (plan.deltas.length > 0) await catalogueStock.applyDeliveredDeltas(tx, plan.deltas, { confirm: input.confirm });
    await learnPricing(
      tx,
      plan.target
        .filter((line) => line.tariffChanged)
        .map((line) => ({ perfumeId: line.snapshot.perfumeId, isGift: line.isGift, volumeMl: line.volumeMl, amounts: line.amounts })),
    );
  }
  return summaryOf(tx, doc.id);
}

// ── T3 : pointer une livraison ─────────────────────────────────────────────────

/**
 * T3. Valeur absolue bornée à 0..quantité (un envoi rejoué ou excessif se borne au lieu d'échouer) ;
 * le stock suivi suit le delta. Le statut ne bouge pas : tout pointer met seulement « Livrée » en
 * évidence à l'écran (06 S01). Refusé sur une vente directe (livrée en entier, sans pointage) et sur
 * un document annulé.
 */
/**
 * Recolle une ligne « hors catalogue » au parfum du catalogue qu'elle désignait.
 *
 * Le besoin vient du terrain : on vend un flacon avant de l'avoir inscrit au catalogue — la ligne est
 * saisie à la main — et le parfum y entre plus tard. Sans ce geste, la vente reste orpheline pour
 * toujours : absente de « Top parfums », de « Achète souvent » et de l'historique du parfum.
 *
 * **Ce que ce geste ne fait pas, et c'est délibéré :**
 * - il ne touche pas au STOCK. La vente a déjà eu lieu ; décompter maintenant retrancherait une
 *   unité qui est sortie il y a des semaines, et fausserait l'inventaire du jour ;
 * - il ne touche pas à l'ARGENT. Prix, coût, taux, quantités livrées restent au mot près ce qu'ils
 *   étaient — aucun chiffre de la compta ne bouge ;
 * - il n'appelle pas `assertStoredLinesWritable` : une vieille ligne peut porter une contenance hors
 *   règle ou un coût inconnu, et ce n'est pas une raison de refuser de la rattacher. On corrige ces
 *   champs-là par l'édition normale, séparément.
 *
 * Il est donc permis à TOUT statut, livré et annulé compris : il ne change que l'identité de ce qui a
 * été vendu, jamais ce qui a été compté.
 */
export async function attachLineToCatalogue(tx: Tx, input: AttachLineToCatalogueData): Promise<{ lineId: string; perfumeName: string }> {
  const doc = await lockDocument(tx, input.documentId);
  const lines = await readLines(tx, doc.id);
  const line = lines.find((candidate) => candidate.id === input.lineId);
  if (!line) throw new DomainError("NOT_FOUND", LINE_NOT_FOUND);

  if (!line.isOffCatalog) {
    throw new DomainError(
      "CONFLICT",
      line.perfumeId === null
        ? "Cette ligne désigne un parfum supprimé du catalogue, pas un article hors catalogue : recrée le parfum puis refais la vente."
        : "Cette ligne est déjà rattachée à un parfum du catalogue.",
    );
  }

  const perfume = await tx.db.perfume.findUnique({
    where: { id: input.perfumeId },
    select: { id: true, name: true, brand: { select: { name: true } } },
  });
  if (!perfume) throw new DomainError("NOT_FOUND", "Ce parfum n'existe pas (ou plus) au catalogue.");

  await tx.db.saleLine.update({
    where: { id: line.id },
    // `isOffCatalog` repasse à faux : la contrainte `line_off_catalog_ck` interdit « hors catalogue
    // ET rattaché ». Le nom devient celui du catalogue, sans quoi la ligne resterait à part dans les
    // regroupements par nom — ce qui viderait le geste de son sens.
    data: {
      perfumeId: perfume.id,
      isOffCatalog: false,
      perfumeName: perfume.name,
      brandName: perfume.brand?.name ?? null,
    },
    select: { id: true },
  });

  return { lineId: line.id, perfumeName: perfume.name };
}

export async function setLineDelivered(tx: Tx, input: SetLineDeliveredData): Promise<LineDelivery> {
  const doc = await lockDocument(tx, input.documentId);
  if (doc.origin === "DIRECT_SALE") {
    throw new DomainError("CONFLICT", "Une vente directe est livrée en entier : modifie plutôt ses articles.");
  }
  if (doc.status === "CANCELLED") {
    throw new DomainError("CONFLICT", "Cette commande est annulée : réactive-la pour pointer une livraison.");
  }
  const lines = await readLines(tx, doc.id);
  const line = lines.find((candidate) => candidate.id === input.lineId);
  if (!line) throw new DomainError("NOT_FOUND", LINE_NOT_FOUND);

  const deliveredQuantity = clampDelivered(input.deliveredQuantity, line.quantity);
  if (deliveredQuantity !== line.deliveredQuantity) {
    assertStoredLinesWritable([line]);
    if (line.perfumeId !== null) {
      await catalogueStock.applyDeliveredDeltas(
        tx,
        [{ perfumeId: line.perfumeId, delta: deliveredQuantity - line.deliveredQuantity }],
        { confirm: input.confirm },
      );
    }
    await tx.db.saleLine.update({ where: { id: line.id }, data: { deliveredQuantity }, select: { id: true } });
  }

  return {
    documentId: doc.id,
    lineId: line.id,
    quantity: line.quantity,
    deliveredQuantity,
    fulfillment: deriveFulfillment(
      lines.map((candidate) => (candidate.id === line.id ? { ...candidate, deliveredQuantity } : candidate)),
    ),
  };
}

// ── T4 : changer de statut ─────────────────────────────────────────────────────

/**
 * T4 : livrer, revenir, confirmer, réactiver (03 §2.3). Refus sans recours seulement là où les données
 * casseraient (`canTransition`) ; toute autre réserve se confirme — dont `PENDING → CONFIRMED` sans
 * acompte : une commande offerte à 0 € se confirme (bug haute 01 §4.1). Entrer en `DELIVERED` complète
 * les quantités livrées et décrémente le stock suivi, ses réserves jointes à celles de la transition en
 * UN dialogue ; en sortir ne touche pas aux quantités. Même statut : succès sans écriture.
 */
export async function changeDocumentStatus(tx: Tx, input: ChangeDocumentStatusData): Promise<DocumentStatusChange> {
  const doc = await lockDocument(tx, input.documentId);
  const lines = await readLines(tx, doc.id);
  const before = snapshotOf(doc, lines);
  const plan = await planStatusChange(tx, doc, lines, input.to, { confirm: input.confirm });
  if (plan) await writeStatusChange(tx, doc, plan, input.confirm);
  return {
    ...(await documentState(tx, doc.id)),
    undo: await revertToken(tx, "status", [{ id: doc.id, before, payments: [] }]),
  };
}

type StatusPlan = {
  from: DocumentStatus;
  to: DocumentStatus;
  /** Lignes complétées à l'entrée en `DELIVERED`. */
  completed: StoredLine[];
  deltas: catalogueStock.DeliveredDelta[];
};

/**
 * Gardes et réserves de T4, sans écriture ; `null` pour un statut identique (succès sans écriture). `paid` :
 * payé net à retenir pour les réserves — celui d'après l'encaissement quand T7 et T4 sont composés (A-5) :
 * « Il reste 60 € à encaisser » ne s'affiche pas pour une livraison qui encaisse ces 60 €.
 */
async function planStatusChange(
  tx: Tx,
  doc: StoredDocument,
  lines: readonly StoredLine[],
  to: DocumentStatus,
  options: { confirm: boolean; paid?: Eur },
): Promise<StatusPlan | null> {
  const from = doc.status;
  if (from === to) return null;
  const context = {
    origin: doc.origin,
    total: storedTotal(lines),
    paid: options.paid ?? (await readPaid(tx, doc.id)),
    lineCount: lines.length,
  };
  const verdict = canTransition(from, to, context);
  if (!verdict.ok) throw new DomainError("CONFLICT", verdict.reason);

  const completed = to === "DELIVERED" ? lines.filter((line) => line.deliveredQuantity !== line.quantity) : [];
  assertStoredLinesWritable(completed);
  const deltas = completed.flatMap((line) =>
    line.perfumeId === null ? [] : [{ perfumeId: line.perfumeId, delta: line.quantity - line.deliveredQuantity }],
  );
  const stock = deltas.length > 0 ? await catalogueStock.stockReserves(tx, deltas) : [];
  assertTransition(from, to, context, { confirmed: options.confirm, extraReserves: stock });
  return { from, to, completed, deltas };
}

async function writeStatusChange(tx: Tx, doc: StoredDocument, plan: StatusPlan, confirm: boolean): Promise<void> {
  for (const line of plan.completed) {
    await tx.db.saleLine.update({ where: { id: line.id }, data: { deliveredQuantity: line.quantity }, select: { id: true } });
  }
  if (plan.deltas.length > 0) await catalogueStock.applyDeliveredDeltas(tx, plan.deltas, { confirm });
  const timestamps = timestampsAfter(
    plan.from,
    plan.to,
    { confirmedAt: doc.confirmedAt, deliveredAt: doc.deliveredAt, cancelledAt: doc.cancelledAt },
    tx.now,
  );
  await tx.db.saleDocument.update({ where: { id: doc.id }, data: { status: plan.to, ...timestamps }, select: { id: true } });
}

// ── T6 : supprimer un document sans paiement ───────────────────────────────────

/**
 * T6. Réservé à l'erreur de saisie : un document qui a un paiement s'annule (T5), il ne se supprime pas
 * (03 §4.4 ; la clé `Restrict` le double en base). Lignes en cascade, livré restitué au stock suivi.
 * Un document déjà absent est un succès : le renvoi après coupure ne doit pas afficher d'erreur.
 */
export async function deleteDocument(tx: Tx, documentId: string): Promise<DocumentDeletion> {
  const { documents } = await tx.lock({ documents: [documentId] });
  if (documents.length === 0) return { id: documentId, deleted: false };
  const doc = await tx.db.saleDocument.findUniqueOrThrow({
    where: { id: documentId },
    select: { origin: true, _count: { select: { payments: true } } },
  });
  if (doc._count.payments > 0) {
    throw new DomainError("CONFLICT", `Cette ${noun(doc.origin)} a des paiements : annule-la plutôt.`);
  }
  const lines = await readLines(tx, documentId);
  const deltas = lines.flatMap((line) =>
    line.perfumeId === null || line.deliveredQuantity === 0 ? [] : [{ perfumeId: line.perfumeId, delta: -line.deliveredQuantity }],
  );
  // Une restitution ne porte jamais de réserve.
  if (deltas.length > 0) await catalogueStock.applyDeliveredDeltas(tx, deltas, { confirm: true });
  await tx.db.saleDocument.delete({ where: { id: documentId }, select: { id: true } });
  return { id: documentId, deleted: true };
}

// ── T13 : rattacher des documents à un lot ─────────────────────────────────────

/**
 * T13, unitaire (S01) ou en masse (S13). Verrous : documents `FOR UPDATE`, lots `FOR SHARE` — la clôture
 * d'un lot (verrou exclusif) attend la fin du rattachement, et inversement. Un lot clos ne reçoit ni ne
 * perd aucun document (verrou serveur, 01 §4.4). Tout ou rien : un refus sur un document n'écrit aucun
 * des autres.
 */
export async function assignDocumentsToBatch(tx: Tx, input: AssignDocumentsToBatchData): Promise<BatchAssignment> {
  const documentIds = unique(input.changes.map((change) => change.documentId));
  const batchIds = unique(input.changes.flatMap((change) => [change.from, change.to]).filter((id): id is string => id !== null));
  const locked = await tx.lock({ documents: documentIds, batches: { share: batchIds } });
  if (locked.documents.length < documentIds.length) throw new DomainError("NOT_FOUND", DOCUMENT_NOT_FOUND);
  if (locked.batches.length < batchIds.length) throw new DomainError("NOT_FOUND", BATCH_NOT_FOUND);

  const documents = new Map(
    (
      await tx.db.saleDocument.findMany({
        where: { id: { in: documentIds } },
        select: { id: true, origin: true, batchId: true },
      })
    ).map((doc) => [doc.id, doc]),
  );
  const batches = new Map(
    (await tx.db.batch.findMany({ where: { id: { in: batchIds } }, select: { id: true, name: true, status: true } })).map(
      (batch) => [batch.id, batch],
    ),
  );

  const moves = new Map<string | null, string[]>();
  for (const change of input.changes) {
    const doc = documents.get(change.documentId);
    if (!doc) throw new DomainError("NOT_FOUND", DOCUMENT_NOT_FOUND);
    if (doc.batchId === change.to) continue;
    if (doc.batchId !== change.from) {
      throw new DomainError(
        "CONFLICT",
        `Cette ${noun(doc.origin)} a changé de lot entre-temps : recharge pour voir sa version à jour.`,
      );
    }
    const left = change.from === null ? null : batches.get(change.from);
    if (left?.status === "CLOSED") throw closedBatch(left.name, doc.origin, "detach");
    const joined = change.to === null ? null : batches.get(change.to);
    if (joined?.status === "CLOSED") throw closedBatch(joined.name, doc.origin, "attach");
    moves.set(change.to, [...(moves.get(change.to) ?? []), doc.id]);
  }

  let changed = 0;
  for (const [batchId, ids] of moves) {
    const result = await tx.db.saleDocument.updateMany({ where: { id: { in: ids } }, data: { batchId } });
    changed += result.count;
  }
  return { changed };
}

// ── Client supprimé ────────────────────────────────────────────────────────────

/**
 * Avant la suppression d'une fiche (action `customers`) : le snapshot de nom des documents liés reprend
 * le DERNIER nom de la fiche, pour qu'ils restent affichés sous le nom que le gérant connaît une fois la
 * clé passée à NULL (06 E14).
 */
export async function freezeCustomerName(tx: Tx, customerId: string, fullName: string): Promise<void> {
  await tx.db.saleDocument.updateMany({
    where: { customerId, OR: [{ customerName: null }, { customerName: { not: fullName } }] },
    data: { customerName: fullName },
  });
}

// ── Argent du document (J6) ────────────────────────────────────────────────────

async function documentState(tx: Tx, id: string): Promise<DocumentState> {
  return (await paymentsWriter.readDocumentMoney(tx, id)).state;
}

/** Relecture d'un document déjà verrouillé par l'appelant (verrou pris avec ceux des poches). */
function readLockedDocument(tx: Tx, id: string): Promise<StoredDocument> {
  return tx.db.saleDocument.findUniqueOrThrow({ where: { id }, select: DOCUMENT_SELECT });
}

type Collection = {
  id: string;
  amount: Eur;
  pocketId: string;
  occurredAt: Date;
  method: string | null;
  note: string | null;
};

function collectionOf(
  input: { id: string; amount: MoneyString; occurredAt?: Date | null; method?: string | null; note?: string | null },
  pocketId: string,
  now: Date,
): Collection {
  const occurredAt = valueDateOf(input.occurredAt, now);
  if (occurredAt === null) throw new DomainError("VALIDATION", futureDateMessage("paiement"), "occurredAt");
  return {
    id: input.id,
    amount: eurFromWire(input.amount),
    pocketId,
    occurredAt,
    method: input.method ?? null,
    note: input.note ?? null,
  };
}

type CollectionPlan = {
  kind: PaymentKind;
  /** Payé net AVANT l'encaissement. */
  paid: Eur;
  /** Le premier acompte confirme la commande : verdict sans réserve seulement (03 §2.3). */
  confirms: boolean;
};

/**
 * Gardes de T7 sur un document verrouillé, sans écriture : document non annulé, montant ≤ reste dû (plafond
 * systématique, commandes comprises, 02 §4.2). Nature fixée ici : solde sur un document livré, acompte sinon.
 */
async function planCollection(
  tx: Tx,
  doc: StoredDocument,
  lines: readonly StoredLine[],
  amount: Eur,
  options: { autoConfirm: boolean; kind?: PaymentKind },
): Promise<CollectionPlan> {
  if (doc.status === "CANCELLED") {
    throw new DomainError("CONFLICT", `Cette ${noun(doc.origin)} est annulée : réactive-la avant d'encaisser.`);
  }
  const total = storedTotal(lines);
  const paid = await readPaid(tx, doc.id);
  const due = eur.clampZero(eur.sub(total, paid));
  if (eur.compare(amount, due) > 0) throw new DomainError("CONFLICT", paymentsWriter.dueExceededMessage(due));
  let confirms = false;
  if (options.autoConfirm && doc.status === "PENDING") {
    const verdict = canTransition("PENDING", "CONFIRMED", {
      origin: doc.origin,
      total,
      paid: eur.add(paid, amount),
      lineCount: lines.length,
    });
    confirms = verdict.ok && verdict.reserves.length === 0;
  }
  return { kind: options.kind ?? (doc.status === "DELIVERED" ? "BALANCE" : "DEPOSIT"), paid, confirms };
}

async function writeCollection(
  tx: Tx,
  doc: StoredDocument,
  plan: CollectionPlan,
  collection: Collection,
): Promise<paymentsWriter.StoredPayment> {
  const payment = await paymentsWriter.insertPayment(tx, { ...collection, documentId: doc.id, kind: plan.kind });
  if (plan.confirms) {
    const timestamps = timestampsAfter(
      "PENDING",
      "CONFIRMED",
      { confirmedAt: doc.confirmedAt, deliveredAt: doc.deliveredAt, cancelledAt: doc.cancelledAt },
      tx.now,
    );
    await tx.db.saleDocument.update({ where: { id: doc.id }, data: { status: "CONFIRMED", ...timestamps }, select: { id: true } });
  }
  return payment;
}

// ── T7 : encaisser ─────────────────────────────────────────────────────────────

async function paymentReplay(tx: Tx, payment: paymentsWriter.StoredPayment): Promise<PaymentResult> {
  return { payment: paymentsWriter.paymentReceipt(payment), document: await documentState(tx, payment.documentId), undo: null };
}

/**
 * T7 (S02 Acompte, Solde ; E13) — une seule écriture pour tout encaissement. Verrous : document, puis poche en
 * partage (une entrée). Nature fixée par le serveur ; montant ≤ reste dû ; sur une commande en attente, le
 * paiement la confirme si le verdict ne porte aucune réserve (`confirmedAt` posé), sinon le statut reste.
 * La poche choisie devient la poche proposée (N2). Renvoie le jeton de T4b (« Annuler » du toast).
 * Double envoi du même identifiant : le paiement existant, sans rien réécrire (04 §3.6).
 */
export async function recordPayment(tx: Tx, input: RecordPaymentData): Promise<PaymentResult> {
  const early = await paymentsWriter.findPayment(tx, input.id);
  if (early) return paymentReplay(tx, early);

  const pocketId = await treasuryWriter.resolvePocketId(tx, input.pocketId);
  const { documents } = await tx.lock({ documents: [input.documentId], pockets: { share: [pocketId] } });
  if (documents.length === 0) throw new DomainError("NOT_FOUND", DOCUMENT_NOT_FOUND);
  // Relu sous verrou : un envoi croisé a pu écrire ce paiement pendant l'attente.
  const replay = await paymentsWriter.findPayment(tx, input.id);
  if (replay) return paymentReplay(tx, replay);

  const doc = await readLockedDocument(tx, input.documentId);
  const lines = await readLines(tx, doc.id);
  const before = snapshotOf(doc, lines);
  const collection = collectionOf(input, pocketId, tx.now);
  const plan = await planCollection(tx, doc, lines, collection.amount, { autoConfirm: true });

  const payment = await writeCollection(tx, doc, plan, collection);
  await settingsWriter.rememberPocket(tx, pocketId);
  return {
    payment: paymentsWriter.paymentReceipt(payment),
    document: await documentState(tx, doc.id),
    undo: await revertToken(tx, "payment", [{ id: doc.id, before, payments: [payment.id] }]),
  };
}

// ── A-5 : tout encaisser ───────────────────────────────────────────────────────

async function collectAllReplay(tx: Tx, ids: readonly string[]): Promise<CollectAllResult | null> {
  const existing = await paymentsWriter.findPayments(tx, ids);
  if (existing.length === 0) return null;
  if (existing.length < ids.length) {
    throw new DomainError("CONFLICT", "Une partie de ces encaissements est déjà enregistrée : recharge la page et réessaie.");
  }
  const documents: DocumentState[] = [];
  for (const payment of existing) documents.push(await documentState(tx, payment.documentId));
  return { payments: existing.map(paymentsWriter.paymentReceipt), documents, undo: null };
}

type AgedDocument = StoredDocument & { orderedAt: Date };

/** Du plus ancien au plus récent : date d'engagement (ou de prise de commande), puis identifiant. */
function byAge(a: AgedDocument, b: AgedDocument): number {
  const since = (doc: AgedDocument) => (doc.confirmedAt ?? doc.orderedAt).getTime();
  return since(a) - since(b) || a.orderedAt.getTime() - b.orderedAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * « Tout encaisser » d'un client (S02, A-5) : un T7 par document, du plus ancien au plus récent, en UNE
 * transaction. Tous les documents sont verrouillés d'un appel, puis TOUTES les gardes passent avant la
 * première écriture : un plafond dépassé sur le dernier document n'écrit rien. Poche en partage (entrées).
 */
export async function collectAll(tx: Tx, input: CollectAllData): Promise<CollectAllResult> {
  const ids = input.payments.map((payment) => payment.id);
  const early = await collectAllReplay(tx, ids);
  if (early) return early;

  const pocketId = await treasuryWriter.resolvePocketId(tx, input.pocketId);
  const documentIds = unique(input.payments.map((payment) => payment.documentId));
  const locked = await tx.lock({ documents: documentIds, pockets: { share: [pocketId] } });
  if (locked.documents.length < documentIds.length) throw new DomainError("NOT_FOUND", DOCUMENT_NOT_FOUND);
  const replay = await collectAllReplay(tx, ids);
  if (replay) return replay;

  const rows = await tx.db.saleDocument.findMany({
    where: { id: { in: documentIds } },
    select: { ...DOCUMENT_SELECT, orderedAt: true },
  });
  const docs = new Map<string, AgedDocument>(rows.map((doc) => [doc.id, doc]));
  const docOf = (id: string) => docs.get(id) as AgedDocument;
  const ordered = [...input.payments].sort((a, b) => byAge(docOf(a.documentId), docOf(b.documentId)));

  const plans = [];
  for (const item of ordered) {
    const doc = docOf(item.documentId);
    const lines = await readLines(tx, doc.id);
    const collection = collectionOf(
      { ...item, occurredAt: input.occurredAt, method: input.method, note: input.note },
      pocketId,
      tx.now,
    );
    const plan = await planCollection(tx, doc, lines, collection.amount, { autoConfirm: true });
    plans.push({ doc, before: snapshotOf(doc, lines), collection, plan });
  }

  const payments: paymentsWriter.StoredPayment[] = [];
  for (const { doc, plan, collection } of plans) payments.push(await writeCollection(tx, doc, plan, collection));
  await settingsWriter.rememberPocket(tx, pocketId);

  const documents: DocumentState[] = [];
  for (const { doc } of plans) documents.push(await documentState(tx, doc.id));
  const entries = plans.map(({ doc, before }, index) => ({
    id: doc.id,
    before,
    payments: [(payments[index] as paymentsWriter.StoredPayment).id],
  }));
  return {
    payments: payments.map(paymentsWriter.paymentReceipt),
    documents,
    undo: await revertToken(tx, "collectAll", entries),
  };
}

// ── A-5 : livrer et encaisser ──────────────────────────────────────────────────

async function deliveryReplay(tx: Tx, payment: paymentsWriter.StoredPayment): Promise<DeliveryAndCollection> {
  return { document: await documentState(tx, payment.documentId), payment: paymentsWriter.paymentReceipt(payment), undo: null };
}

/**
 * « Encaisser 60 € et livrer » (S02 variante Livrer, A-5) : T7 puis T4 en UNE transaction. Les gardes des
 * deux parties passent avant la première écriture — plafond au dû, puis transition et stock, dont les
 * réserves se lisent avec le payé d'APRÈS l'encaissement. Le paiement est un solde (BALANCE) : il est reçu à
 * la livraison, dans le même geste. Pas de confirmation automatique intermédiaire : la transition part du
 * statut réel, avec ses propres réserves (« En attente » → « Livrée »).
 */
export async function deliverAndCollect(tx: Tx, input: DeliverAndCollectData): Promise<DeliveryAndCollection> {
  const early = await paymentsWriter.findPayment(tx, input.payment.id);
  if (early) return deliveryReplay(tx, early);

  const pocketId = await treasuryWriter.resolvePocketId(tx, input.payment.pocketId);
  const { documents } = await tx.lock({ documents: [input.documentId], pockets: { share: [pocketId] } });
  if (documents.length === 0) throw new DomainError("NOT_FOUND", DOCUMENT_NOT_FOUND);
  const replay = await paymentsWriter.findPayment(tx, input.payment.id);
  if (replay) return deliveryReplay(tx, replay);

  const doc = await readLockedDocument(tx, input.documentId);
  const lines = await readLines(tx, doc.id);
  const before = snapshotOf(doc, lines);
  const collection = collectionOf(input.payment, pocketId, tx.now);
  const collect = await planCollection(tx, doc, lines, collection.amount, { autoConfirm: false, kind: "BALANCE" });
  const delivery = await planStatusChange(tx, doc, lines, "DELIVERED", {
    confirm: input.confirm,
    paid: eur.add(collect.paid, collection.amount),
  });

  const payment = await writeCollection(tx, doc, collect, collection);
  if (delivery) await writeStatusChange(tx, doc, delivery, input.confirm);
  await settingsWriter.rememberPocket(tx, pocketId);
  return {
    document: await documentState(tx, doc.id),
    payment: paymentsWriter.paymentReceipt(payment),
    undo: await revertToken(tx, "deliverAndCollect", [{ id: doc.id, before, payments: [payment.id] }]),
  };
}

// ── T5 : annuler ───────────────────────────────────────────────────────────────

/**
 * T5 (S03, PC-10) : le document passe `CANCELLED` et reste consultable ; ses quantités livrées reviennent à 0
 * (stock restitué) ; les remboursements choisis sont écrits, datés du jour, Σ ≤ payé net. Verrous : document,
 * puis les poches de sortie EXCLUSIVEMENT (« Non attribué » jamais négatif, 04 §4.2). Réserve d'un document
 * livré (« le stock est restitué ») à confirmer. Ligne reprise hors règles parmi celles à remettre à 0 :
 * `VALIDATION` avant toute écriture (03 §4.3). Déjà annulé : succès sans écriture si c'est un renvoi.
 */
export async function cancelDocument(tx: Tx, input: CancelDocumentData): Promise<CancellationResult> {
  const refunds = input.refunds ?? [];
  const pockets: string[] = [];
  for (const refund of refunds) pockets.push(await treasuryWriter.resolvePocketId(tx, refund.pocketId));
  const { documents } = await tx.lock({ documents: [input.documentId], pockets: { update: unique(pockets) } });
  if (documents.length === 0) throw new DomainError("NOT_FOUND", DOCUMENT_NOT_FOUND);

  const doc = await readLockedDocument(tx, input.documentId);
  const existing = await paymentsWriter.findPayments(
    tx,
    refunds.map((refund) => refund.id),
  );
  if (doc.status === "CANCELLED") {
    if (existing.length === refunds.length && existing.every((payment) => payment.documentId === doc.id)) {
      return { document: await documentState(tx, doc.id), refunds: existing.map(paymentsWriter.paymentReceipt) };
    }
    throw new DomainError("CONFLICT", `Cette ${noun(doc.origin)} est déjà annulée : rembourse depuis sa fiche.`);
  }
  if (existing.length > 0) {
    throw new DomainError("CONFLICT", "Un de ces remboursements est déjà enregistré : recharge la page et réessaie.");
  }

  const lines = await readLines(tx, doc.id);
  const paid = await readPaid(tx, doc.id);
  const refundable = eur.clampZero(paid);
  const refundTotal = eur.sum(refunds.map((refund) => eurFromWire(refund.amount)));
  if (eur.compare(refundTotal, refundable) > 0) {
    throw new DomainError("CONFLICT", `Le remboursement dépasse ce qui a été payé (${formatEur(refundable)}).`);
  }
  const context = { origin: doc.origin, total: storedTotal(lines), paid, lineCount: lines.length };
  const verdict = canTransition(doc.status, "CANCELLED", context);
  if (!verdict.ok) throw new DomainError("CONFLICT", verdict.reason);
  const delivered = lines.filter((line) => line.deliveredQuantity > 0);
  assertStoredLinesWritable(delivered);
  assertTransition(doc.status, "CANCELLED", context, { confirmed: input.confirm });

  for (const line of delivered) {
    await tx.db.saleLine.update({ where: { id: line.id }, data: { deliveredQuantity: 0 }, select: { id: true } });
  }
  const deltas = delivered.flatMap((line) =>
    line.perfumeId === null ? [] : [{ perfumeId: line.perfumeId, delta: -line.deliveredQuantity }],
  );
  // Une restitution ne porte jamais de réserve.
  if (deltas.length > 0) await catalogueStock.applyDeliveredDeltas(tx, deltas, { confirm: true });
  const timestamps = timestampsAfter(
    doc.status,
    "CANCELLED",
    { confirmedAt: doc.confirmedAt, deliveredAt: doc.deliveredAt, cancelledAt: doc.cancelledAt },
    tx.now,
  );
  await tx.db.saleDocument.update({ where: { id: doc.id }, data: { status: "CANCELLED", ...timestamps }, select: { id: true } });

  const written: paymentsWriter.StoredPayment[] = [];
  for (const [index, refund] of refunds.entries()) {
    written.push(
      await paymentsWriter.insertPayment(tx, {
        id: refund.id,
        documentId: doc.id,
        kind: "REFUND",
        amount: eurFromWire(refund.amount),
        pocketId: pockets[index] as string,
        occurredAt: tx.now,
      }),
    );
  }
  return { document: await documentState(tx, doc.id), refunds: written.map(paymentsWriter.paymentReceipt) };
}

// ── T4b : défaire un geste ─────────────────────────────────────────────────────

/** Fenêtre au-delà de laquelle le filet du toast (5 s) n'a plus de sens : on corrige depuis la fiche. */
export const REVERT_WINDOW_MS = 10 * 60 * 1000;

export const REVERT_REFUSED = "Ce geste ne peut plus être annulé d'ici : corrige-le depuis la fiche du document.";
export const REVERT_TOO_LATE = "Trop tard pour annuler ce geste : corrige-le depuis la fiche du document.";
export const REVERT_CHANGED = "Ce document a changé depuis ce geste : rien n'a été annulé. Corrige-le depuis sa fiche.";

export type RevertGesture = "status" | "payment" | "deliverAndCollect" | "collectAll";

/** L'état d'un document que T4b rétablit : statut, horodatages, quantité livrée de chaque ligne (03 §2.3). */
export type RevertSnapshot = {
  status: DocumentStatus;
  confirmedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  /** [identifiant de ligne, quantité livrée]. */
  lines: [string, number][];
};

export type RevertPayload = {
  v: 1;
  gesture: RevertGesture;
  /** ISO 8601. */
  issuedAt: string;
  documents: {
    id: string;
    before: RevertSnapshot;
    /** Empreinte de l'état écrit par le geste. */
    after: string;
    /** Paiements créés par le geste, à contre-passer. */
    payments: string[];
  }[];
};

function snapshotOf(doc: StoredDocument, lines: readonly StoredLine[]): RevertSnapshot {
  return {
    status: doc.status,
    confirmedAt: doc.confirmedAt?.toISOString() ?? null,
    deliveredAt: doc.deliveredAt?.toISOString() ?? null,
    cancelledAt: doc.cancelledAt?.toISOString() ?? null,
    lines: lines.map((line) => [line.id, line.deliveredQuantity]),
  };
}

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Empreinte de tout ce qu'un geste ultérieur changerait : statut, horodatages, date de modification du document
 * (client, notes, lot, livraison prévue), lignes (ajout, retrait, quantité, livré, toute modification) et
 * paiements (ajout, contre-passation).
 */
async function fingerprint(tx: Tx, documentId: string): Promise<string> {
  const doc = await tx.db.saleDocument.findUnique({
    where: { id: documentId },
    select: {
      status: true,
      confirmedAt: true,
      deliveredAt: true,
      cancelledAt: true,
      updatedAt: true,
      lines: { select: { id: true, quantity: true, deliveredQuantity: true, updatedAt: true } },
      payments: { select: { id: true } },
    },
  });
  if (!doc) return "";
  const state = [
    doc.status,
    doc.confirmedAt?.toISOString() ?? null,
    doc.deliveredAt?.toISOString() ?? null,
    doc.cancelledAt?.toISOString() ?? null,
    doc.updatedAt.toISOString(),
    [...doc.lines].sort(byId).map((line) => [line.id, line.quantity, line.deliveredQuantity, line.updatedAt.toISOString()]),
    [...doc.payments].sort(byId).map((payment) => payment.id),
  ];
  return createHash("sha256").update(JSON.stringify(state)).digest("base64url");
}

function revertMac(body: string): string {
  return createHmac("sha256", adminJwtSecret()).update(`nurea-revert:${body}`).digest("base64url");
}

/** Jeton signé (secret des sessions) : l'écran le renvoie sans pouvoir fabriquer l'état qu'il rétablit. */
export function encodeRevertToken(payload: RevertPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${revertMac(body)}`;
}

export function decodeRevertToken(token: string, now: Date): RevertPayload {
  const [body, mac, extra] = token.split(".");
  if (!body || !mac || extra !== undefined) throw new DomainError("CONFLICT", REVERT_REFUSED);
  const expected = Buffer.from(revertMac(body));
  const received = Buffer.from(mac);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new DomainError("CONFLICT", REVERT_REFUSED);
  }
  let payload: RevertPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as RevertPayload;
  } catch {
    throw new DomainError("CONFLICT", REVERT_REFUSED);
  }
  if (payload?.v !== 1 || !Array.isArray(payload.documents)) throw new DomainError("CONFLICT", REVERT_REFUSED);
  const age = now.getTime() - new Date(payload.issuedAt).getTime();
  if (!(age <= REVERT_WINDOW_MS)) throw new DomainError("CONFLICT", REVERT_TOO_LATE);
  return payload;
}

/** Jeton rendu par un geste, lu sous verrou APRÈS ses écritures (03 §4.3 T4b). */
async function revertToken(
  tx: Tx,
  gesture: RevertGesture,
  entries: readonly { id: string; before: RevertSnapshot; payments: string[] }[],
): Promise<string> {
  const documents: RevertPayload["documents"] = [];
  for (const entry of entries) documents.push({ ...entry, after: await fingerprint(tx, entry.id) });
  return encodeRevertToken({ v: 1, gesture, issuedAt: tx.now.toISOString(), documents });
}

const dateOrNull = (iso: string | null) => (iso === null ? null : new Date(iso));
const sameInstant = (a: Date | null, b: Date | null) => (a?.getTime() ?? null) === (b?.getTime() ?? null);

/**
 * T4b (03 §4.3) — « Annuler » du toast après livrer, « Livrer et encaisser », changer de statut, encaisser.
 * Rétablit EXACTEMENT l'état d'avant le geste, sans réserve de transition : statut, horodatages, quantité
 * livrée de chaque ligne (donc le stock, delta borné à 0 comme une réserve confirmée), et contre-passe les
 * paiements du geste (T8 « annuler », même transaction). Refus `CONFLICT`, sans rien écrire, si un document a
 * changé depuis le geste. Verrous : documents, puis poches des paiements EXCLUSIVEMENT (une contre-passation
 * retire de l'argent).
 *
 * Exception de 03 §4.3 : une commande confirmée par l'acompte annulé ne revient « En attente » que si son payé
 * net est nul après contre-passation ; sinon elle reste confirmée et la notice le dit.
 */
export async function revertDocumentChange(
  tx: Tx,
  token: string,
): Promise<{ result: RevertResult; notice: string | null }> {
  const payload = decodeRevertToken(token, tx.now);
  const paymentIds = payload.documents.flatMap((entry) => entry.payments);
  const payments = await paymentsWriter.findPayments(tx, paymentIds);
  if (payments.length !== paymentIds.length) throw new DomainError("CONFLICT", REVERT_CHANGED);
  const documentIds = unique(payload.documents.map((entry) => entry.id));
  const locked = await tx.lock({
    documents: documentIds,
    pockets: { update: unique(payments.map((payment) => payment.pocketId)) },
  });
  if (locked.documents.length < documentIds.length) throw new DomainError("NOT_FOUND", DOCUMENT_NOT_FOUND);

  // Gardes, avant toute écriture.
  const plans = [];
  for (const entry of payload.documents) {
    if ((await fingerprint(tx, entry.id)) !== entry.after) throw new DomainError("CONFLICT", REVERT_CHANGED);
    const doc = await readLockedDocument(tx, entry.id);
    const lines = await readLines(tx, entry.id);
    const before = new Map(entry.before.lines);
    const restored = lines.flatMap((line) => {
      const target = before.get(line.id);
      if (target === undefined) throw new DomainError("CONFLICT", REVERT_CHANGED);
      return target === line.deliveredQuantity ? [] : [{ line, target }];
    });
    assertStoredLinesWritable(restored.map(({ line }) => line));
    plans.push({ entry, doc, lines, restored });
  }

  const notices: string[] = [];
  const documents: DocumentState[] = [];
  for (const { entry, doc, lines, restored } of plans) {
    for (const paymentId of entry.payments) {
      const payment = (await paymentsWriter.findPayment(tx, paymentId)) as paymentsWriter.StoredPayment;
      await paymentsWriter.reversePayment(tx, payment, doc.status);
    }
    for (const { line, target } of restored) {
      await tx.db.saleLine.update({ where: { id: line.id }, data: { deliveredQuantity: target }, select: { id: true } });
    }
    const deltas = restored.flatMap(({ line, target }) =>
      line.perfumeId === null ? [] : [{ perfumeId: line.perfumeId, delta: target - line.deliveredQuantity }],
    );
    if (deltas.length > 0) await catalogueStock.applyDeliveredDeltas(tx, deltas, { confirm: true });

    const target = entry.before;
    const confirmedByPayment =
      (payload.gesture === "payment" || payload.gesture === "collectAll") &&
      target.status === "PENDING" &&
      doc.status === "CONFIRMED";
    const paid = confirmedByPayment ? await readPaid(tx, doc.id) : eur.zero;
    if (confirmedByPayment && eur.compare(paid, eur.zero) > 0) {
      const due = eur.clampZero(eur.sub(storedTotal(lines), paid));
      notices.push(`La ${noun(doc.origin)} reste confirmée : ${formatEur(due)} à encaisser.`);
    } else {
      const next = {
        status: target.status,
        confirmedAt: dateOrNull(target.confirmedAt),
        deliveredAt: dateOrNull(target.deliveredAt),
        cancelledAt: dateOrNull(target.cancelledAt),
      };
      const changed =
        next.status !== doc.status ||
        !sameInstant(next.confirmedAt, doc.confirmedAt) ||
        !sameInstant(next.deliveredAt, doc.deliveredAt) ||
        !sameInstant(next.cancelledAt, doc.cancelledAt);
      if (changed) await tx.db.saleDocument.update({ where: { id: doc.id }, data: next, select: { id: true } });
    }
    documents.push(await documentState(tx, doc.id));
  }
  return {
    result: { documents, reversedPaymentIds: paymentIds },
    notice: notices.length > 0 ? notices.join(" ") : null,
  };
}
