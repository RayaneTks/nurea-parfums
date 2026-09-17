import "server-only";
import {
  DIRECT_SALE_DELIVERY_MESSAGE,
  ITEM_REQUIRED_MESSAGE,
  customerNameRequirement,
  hasCustomerName,
  type AssignDocumentsToBatchData,
  type BatchAssignment,
  type ChangeDocumentStatusData,
  type CreateDocumentData,
  type CreateLineData,
  type DocumentCustomerData,
  type DocumentDeletion,
  type DocumentStatusChange,
  type DocumentSummary,
  type LineDelivery,
  type LineItem,
  type SetLineDeliveredData,
  type UpdateDocumentData,
  type UpdateLineData,
} from "@/contracts/documents";
import { documentBalance } from "@/domain/document-balance";
import {
  assertTransition,
  canTransition,
  initialStatus,
  isEngaged,
  timestampsAfter,
  type DocumentOrigin,
} from "@/domain/document-status";
import { DomainError, NeedsConfirmation } from "@/domain/errors";
import { clampDelivered, deriveFulfillment } from "@/domain/fulfillment";
import {
  dzdFromDb,
  dzdToEur,
  eur,
  eurFromDb,
  eurFromWire,
  rateFromDb,
  toDb,
  toWire,
  type Dzd,
  type Eur,
  type Rate,
} from "@/domain/money";
import { periodStart } from "@/domain/periods";
import { storedLineViolation, type VolumeMl } from "@/domain/sale-line";
import { insufficientStock } from "@/domain/stock";
import { BATCH_NOT_FOUND } from "@/server/batches/writer";
import * as catalogueStock from "@/server/catalogue/stock";
import { upsertPricing } from "@/server/catalogue/writer";
import * as customersWriter from "@/server/customers/writer";
import type { Tx } from "@/server/db/transaction";

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
 * Livré à J5 : T1 sans paiement, T2, T3, T4, T6, T13. À J6 : paiements de T1, T4b, T5, et les actions
 * composées qui encaissent.
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

function offCatalogSnapshot(item: Extract<LineItem, { kind: "offCatalog" }>, imageUrl: string | null = null): Snapshot {
  return { perfumeId: null, isOffCatalog: true, perfumeName: item.name, brandName: item.brandName ?? null, imageUrl };
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

// ── T1 : créer un document (sans paiement) ─────────────────────────────────────

export type PocketLocks = { update?: readonly string[]; share?: readonly string[] };

/**
 * T1. Une commande naît `PENDING`, une vente directe naît `DELIVERED` (quantités livrées complètes, stock
 * décrémenté, `confirmedAt` et `deliveredAt` posés). Rejeu : un identifiant déjà écrit rend le document
 * existant sans rien réécrire (04 §3.6).
 *
 * `options.pockets` : verrous de poche des paiements de création (J6), pris dans le même appel que le lot
 * pour tenir l'ordre canonique (lots → poches → parfums, 04 §4.2).
 */
export async function createDocument(
  tx: Tx,
  input: CreateDocumentData,
  options: { pockets?: PocketLocks } = {},
): Promise<DocumentSummary> {
  const replay = await summarize(tx, input.id);
  if (replay) return replay;

  await tx.lock({ batches: input.batchId ? { share: [input.batchId] } : undefined, pockets: options.pockets });
  if (input.batchId) await assertBatchOpen(tx, input.batchId, input.origin);

  const catalogueIds = unique(input.lines.flatMap((line) => (line.item.kind === "catalogue" ? [line.item.perfumeId] : [])));
  const perfumes = await readPerfumeSnapshots(tx, catalogueIds);
  const lines = input.lines.map((line, position) => ({
    line,
    position,
    snapshot: line.item.kind === "catalogue" ? (perfumes.get(line.item.perfumeId) as Snapshot) : offCatalogSnapshot(line.item),
    amounts: amountsOf(line),
  }));

  // Sans paiement (J5) : payé nul. Avec les paiements de J6, `initialStatus` confirme une commande à acompte.
  const status = initialStatus(input.origin, eur.zero);
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

  const documentDelivered = doc.status === "DELIVERED";
  const deltas: catalogueStock.DeliveredDelta[] = [];
  const lineReserves: string[] = [];
  const kept = new Set(lines.map((line) => line.id));

  const target = lines.map((line, position): TargetLine => {
    const existing = existingById.get(line.id) ?? null;
    let snapshot: Snapshot;
    if (!line.item) snapshot = existing as StoredLine;
    else if (line.item.kind === "offCatalog") snapshot = offCatalogSnapshot(line.item, existing?.imageUrl ?? null);
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
  const from = doc.status;
  const to = input.to;
  const timestamps = { confirmedAt: doc.confirmedAt, deliveredAt: doc.deliveredAt, cancelledAt: doc.cancelledAt };

  if (from !== to) {
    const lines = await readLines(tx, doc.id);
    const context = {
      origin: doc.origin,
      total: storedTotal(lines),
      paid: await readPaid(tx, doc.id),
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
    assertTransition(from, to, context, { confirmed: input.confirm, extraReserves: stock });

    for (const line of completed) {
      await tx.db.saleLine.update({ where: { id: line.id }, data: { deliveredQuantity: line.quantity }, select: { id: true } });
    }
    if (deltas.length > 0) await catalogueStock.applyDeliveredDeltas(tx, deltas, { confirm: input.confirm });
    Object.assign(timestamps, timestampsAfter(from, to, timestamps, tx.now));
    await tx.db.saleDocument.update({ where: { id: doc.id }, data: { status: to, ...timestamps }, select: { id: true } });
  }

  return {
    ...(await summaryOf(tx, doc.id)),
    confirmedAt: timestamps.confirmedAt?.toISOString() ?? null,
    deliveredAt: timestamps.deliveredAt?.toISOString() ?? null,
    cancelledAt: timestamps.cancelledAt?.toISOString() ?? null,
  };
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
