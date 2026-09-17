import "server-only";
import type { DocumentState } from "@/contracts/documents";
import type {
  CorrectPaymentData,
  CorrectionResult,
  PaymentKind,
  PaymentReceipt,
  RefundData,
  RefundResult,
  VoidPaymentData,
  VoidResult,
} from "@/contracts/payments";
import { futureDateMessage, valueDateOf } from "@/contracts/treasury";
import { documentBalance } from "@/domain/document-balance";
import type { DocumentStatus } from "@/domain/document-status";
import { DomainError } from "@/domain/errors";
import { eur, eurFromDb, eurFromWire, formatEur, toWire, type Eur } from "@/domain/money";
import type { Tx } from "@/server/db/transaction";
import * as movements from "@/server/treasury/movements";
import * as treasuryWriter from "@/server/treasury/writer";

/**
 * Seul fichier qui écrit `Payment` (03 §4.2, 04 §4.3). Une pièce et son euro s'écrivent ensemble : le
 * mouvement `PAYMENT` par `treasury/movements.ts`, la pièce ici, dans la même transaction — compta et
 * Trésorerie ne peuvent plus diverger (01 §2.2 n°4). Les triggers de 03 §4.10 le vérifient au COMMIT.
 *
 * Deux étages :
 * - les pièces : `insertPayment` (acompte, solde, remboursement) et `reversePayment` (contre-passation),
 *   appelées sous les verrous de l'appelant — par ce fichier et par `documents/writer.ts` (T1, T4b, T5, T7,
 *   actions composées) ;
 * - le corps des transactions T8 qui n'écrivent aucun document : annuler, corriger, rembourser. T7
 *   (encaisser) écrit le document quand il le confirme : son corps vit dans `documents/writer.ts`, qui compose
 *   ces pièces ; ce fichier n'importe jamais le writer `documents` (pas de cycle).
 */

export const PAYMENT_NOT_FOUND = "Ce paiement n'existe plus. Recharge le document pour voir sa version à jour.";
const DOCUMENT_NOT_FOUND = "Ce document n'existe plus. Il a peut-être été supprimé depuis un autre écran.";
const PAYMENT_IS_REVERSAL = "Ce paiement annule déjà un autre paiement : il ne s'annule pas lui-même.";

/** « Le montant dépasse le reste dû (35,00 €). » (04 §9.2). */
export function dueExceededMessage(due: Eur): string {
  return `Le montant dépasse le reste dû (${formatEur(due)}).`;
}

export function refundExceededMessage(refundable: Eur): string {
  return `Le montant dépasse ce qui peut être remboursé (${formatEur(refundable)}).`;
}

// ── Lectures ───────────────────────────────────────────────────────────────────

const PAYMENT_SELECT = {
  id: true,
  documentId: true,
  kind: true,
  method: true,
  note: true,
  movement: {
    select: {
      id: true,
      pocketId: true,
      amount: true,
      occurredAt: true,
      reversesId: true,
      reversedBy: { select: { id: true } },
      reverses: { select: { payment: { select: { id: true } } } },
    },
  },
} as const;

export type StoredPayment = {
  id: string;
  documentId: string;
  kind: PaymentKind;
  method: string | null;
  note: string | null;
  movementId: string;
  pocketId: string;
  /** Signé, comme le mouvement. */
  amount: Eur;
  occurredAt: Date;
  reversesMovementId: string | null;
  reversedByMovementId: string | null;
  reversesPaymentId: string | null;
};

type PaymentRow = {
  id: string;
  documentId: string;
  kind: PaymentKind;
  method: string | null;
  note: string | null;
  movement: {
    id: string;
    pocketId: string;
    amount: { toString(): string };
    occurredAt: Date;
    reversesId: string | null;
    reversedBy: { id: string } | null;
    reverses: { payment: { id: string } | null } | null;
  };
};

function storedPayment(row: PaymentRow): StoredPayment {
  return {
    id: row.id,
    documentId: row.documentId,
    kind: row.kind,
    method: row.method,
    note: row.note,
    movementId: row.movement.id,
    pocketId: row.movement.pocketId,
    amount: eurFromDb(row.movement.amount),
    occurredAt: row.movement.occurredAt,
    reversesMovementId: row.movement.reversesId,
    reversedByMovementId: row.movement.reversedBy?.id ?? null,
    reversesPaymentId: row.movement.reverses?.payment?.id ?? null,
  };
}

export function paymentReceipt(payment: StoredPayment): PaymentReceipt {
  return {
    id: payment.id,
    documentId: payment.documentId,
    kind: payment.kind,
    amount: toWire(payment.amount),
    pocketId: payment.pocketId,
    occurredAt: payment.occurredAt.toISOString(),
    method: payment.method,
    note: payment.note,
    reversesPaymentId: payment.reversesPaymentId,
  };
}

export async function findPayment(tx: Tx, id: string): Promise<StoredPayment | null> {
  const row = await tx.db.payment.findUnique({ where: { id }, select: PAYMENT_SELECT });
  return row ? storedPayment(row) : null;
}

/** Les paiements existants parmi ces identifiants, dans l'ordre demandé. */
export async function findPayments(tx: Tx, ids: readonly string[]): Promise<StoredPayment[]> {
  if (ids.length === 0) return [];
  const rows = await tx.db.payment.findMany({ where: { id: { in: [...ids] } }, select: PAYMENT_SELECT });
  const byId = new Map(rows.map((row) => [row.id, storedPayment(row)]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

/** Le paiement porté par un mouvement (contre-passation d'un paiement). */
export async function findPaymentByMovement(tx: Tx, movementId: string): Promise<StoredPayment | null> {
  const row = await tx.db.payment.findUnique({ where: { movementId }, select: PAYMENT_SELECT });
  return row ? storedPayment(row) : null;
}

export type DocumentMoney = {
  state: DocumentState;
  status: DocumentStatus;
  total: Eur;
  paid: Eur;
  due: Eur;
  /** max(0 ; payé − total). */
  overpaid: Eur;
};

/**
 * Argent d'un document lu dans la transaction : jumeau de la vue `DocumentBalance` (03 §5.1, 04 §6.4) et
 * horodatages. Sert les plafonds (T7 au dû, T8 au payé ou au trop-perçu) et les réponses aux écrans.
 */
export async function readDocumentMoney(tx: Tx, documentId: string): Promise<DocumentMoney> {
  const doc = await tx.db.saleDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      origin: true,
      status: true,
      confirmedAt: true,
      deliveredAt: true,
      cancelledAt: true,
      lines: { select: { quantity: true, unitPriceEur: true, unitCostEur: true } },
      payments: { select: { movement: { select: { amount: true } } } },
    },
  });
  if (!doc) throw new DomainError("NOT_FOUND", DOCUMENT_NOT_FOUND);
  const balance = documentBalance(
    doc.lines.map((line) => ({
      quantity: line.quantity,
      unitPriceEur: eurFromDb(line.unitPriceEur),
      unitCostEur: line.unitCostEur === null ? null : eurFromDb(line.unitCostEur),
    })),
    doc.payments.map((payment) => ({ amount: eurFromDb(payment.movement.amount) })),
  );
  return {
    state: {
      id: doc.id,
      origin: doc.origin,
      status: doc.status,
      total: toWire(balance.total),
      paid: toWire(balance.paid),
      due: toWire(balance.due),
      confirmedAt: doc.confirmedAt?.toISOString() ?? null,
      deliveredAt: doc.deliveredAt?.toISOString() ?? null,
      cancelledAt: doc.cancelledAt?.toISOString() ?? null,
    },
    status: doc.status,
    total: balance.total,
    paid: balance.paid,
    due: balance.due,
    overpaid: balance.overpaid,
  };
}

/**
 * Ce qu'un remboursement peut rendre (06 S03) : le payé net d'un document annulé, le trop-perçu sinon.
 * Un document engagé qui n'est pas trop payé ne se rembourse pas : il s'annule (T5) ou se corrige (T8).
 */
export function refundable(money: Pick<DocumentMoney, "status" | "paid" | "overpaid">): Eur {
  return money.status === "CANCELLED" ? eur.clampZero(money.paid) : money.overpaid;
}

// ── Pièces ─────────────────────────────────────────────────────────────────────

export type NewPayment = {
  /** Identifiant fourni par le formulaire (04 §3.6). */
  id?: string;
  documentId: string;
  kind: PaymentKind;
  /** Positif : un remboursement sort de la poche, une entrée y entre. */
  amount: Eur;
  pocketId: string;
  occurredAt: Date;
  method?: string | null;
  note?: string | null;
};

/**
 * Une pièce et son mouvement `PAYMENT`, dans la transaction de l'appelant, qui a verrouillé le document et la
 * poche (exclusivement pour un remboursement). Plafonds et nature sont décidés par l'appelant.
 */
export async function insertPayment(tx: Tx, input: NewPayment): Promise<StoredPayment> {
  const movement = await movements.insertMovement(tx, {
    pocketId: input.pocketId,
    kind: "PAYMENT",
    direction: input.kind === "REFUND" ? "out" : "in",
    amount: input.amount,
    occurredAt: input.occurredAt,
  });
  const row = await tx.db.payment.create({
    data: {
      ...(input.id ? { id: input.id } : {}),
      documentId: input.documentId,
      kind: input.kind,
      movementId: movement.id,
      method: input.method ?? null,
      note: input.note ?? null,
    },
    select: PAYMENT_SELECT,
  });
  return storedPayment(row);
}

/**
 * Annuler un paiement (03 §4.4) : son mouvement est contre-passé (même poche, même date de valeur, montant
 * opposé) et la contre-passation porte sa pièce — REFUND pour une entrée ; pour un remboursement, une entrée
 * DEPOSIT si le document n'est pas livré, BALANCE sinon (le trigger exige REFUND ⇔ montant négatif).
 * Ne touche jamais au statut du document.
 */
export async function reversePayment(
  tx: Tx,
  payment: StoredPayment,
  documentStatus: DocumentStatus,
  options: { id?: string } = {},
): Promise<StoredPayment> {
  if (payment.reversedByMovementId !== null) throw new DomainError("CONFLICT", movements.ALREADY_REVERSED);
  if (payment.reversesMovementId !== null) throw new DomainError("CONFLICT", PAYMENT_IS_REVERSAL);
  const kind: PaymentKind = payment.kind !== "REFUND" ? "REFUND" : documentStatus === "DELIVERED" ? "BALANCE" : "DEPOSIT";
  const reversal = await movements.insertReversal(tx, payment.movementId);
  const row = await tx.db.payment.create({
    data: { ...(options.id ? { id: options.id } : {}), documentId: payment.documentId, kind, movementId: reversal.id },
    select: PAYMENT_SELECT,
  });
  return storedPayment(row);
}

/** Moyen et note, seules colonnes modifiables d'une pièce (trigger `nurea_append_only('method', 'note')`). */
async function updatePaymentDetails(
  tx: Tx,
  payment: StoredPayment,
  details: { method: string | null; note: string | null },
): Promise<StoredPayment> {
  if (payment.method === details.method && payment.note === details.note) return payment;
  const row = await tx.db.payment.update({ where: { id: payment.id }, data: details, select: PAYMENT_SELECT });
  return storedPayment(row);
}

// ── T8 : annuler ───────────────────────────────────────────────────────────────

/**
 * T8 annuler (S01 « Annuler ce paiement ») : contre-passation datée comme l'original ; seconde annulation ⇒
 * `CONFLICT` « Ce mouvement a déjà été annulé. ». Verrous : document, puis la poche EXCLUSIVEMENT (annuler une
 * entrée en retire l'argent : « Non attribué » jamais négatif). Pas de plafond pour l'annulation d'un
 * remboursement : elle rétablit l'état d'avant celui-ci. Le statut ne change jamais (seul T4b, dans la fenêtre
 * du toast, rétablit l'état d'avant).
 */
export async function voidPayment(tx: Tx, input: VoidPaymentData): Promise<VoidResult> {
  const found = await findPayment(tx, input.paymentId);
  if (!found) throw new DomainError("NOT_FOUND", PAYMENT_NOT_FOUND);
  await tx.lock({ documents: [found.documentId], pockets: { update: [found.pocketId] } });
  const payment = (await findPayment(tx, input.paymentId)) as StoredPayment;
  const money = await readDocumentMoney(tx, payment.documentId);
  const reversal = await reversePayment(tx, payment, money.status);
  return {
    payment: paymentReceipt(reversal),
    voidedPaymentId: payment.id,
    document: (await readDocumentMoney(tx, payment.documentId)).state,
  };
}

// ── T8 : corriger ──────────────────────────────────────────────────────────────

async function correctionReplay(tx: Tx, created: StoredPayment, original: StoredPayment | null): Promise<CorrectionResult> {
  const reversal = original?.reversedByMovementId ? await findPaymentByMovement(tx, original.reversedByMovementId) : null;
  return {
    payment: paymentReceipt(created),
    reversal: reversal ? paymentReceipt(reversal) : null,
    document: (await readDocumentMoney(tx, created.documentId)).state,
  };
}

/**
 * T8 corriger (S04) : l'ancien paiement est contre-passé À SA DATE et remplacé par le nouveau, à la date
 * saisie, en une transaction ; même nature que l'original (un acompte corrigé reste un acompte). Plafond du
 * nouveau paiement lu APRÈS la contre-passation : le reste dû pour une entrée, le remboursable pour un
 * remboursement. Seuls le moyen ou la note changent : pièce modifiée en place, aucun mouvement. Rien ne
 * change : succès sans écriture.
 */
export async function correctPayment(tx: Tx, input: CorrectPaymentData): Promise<CorrectionResult> {
  const replay = await findPayment(tx, input.newPaymentId);
  if (replay) return correctionReplay(tx, replay, await findPayment(tx, input.paymentId));

  const found = await findPayment(tx, input.paymentId);
  if (!found) throw new DomainError("NOT_FOUND", PAYMENT_NOT_FOUND);
  const pocketId = input.pocketId === undefined ? found.pocketId : await treasuryWriter.resolvePocketId(tx, input.pocketId);
  await tx.lock({ documents: [found.documentId], pockets: { update: [...new Set([found.pocketId, pocketId])] } });
  const again = await findPayment(tx, input.newPaymentId);
  if (again) return correctionReplay(tx, again, await findPayment(tx, input.paymentId));

  const original = (await findPayment(tx, input.paymentId)) as StoredPayment;
  if (original.reversedByMovementId !== null) throw new DomainError("CONFLICT", movements.ALREADY_REVERSED);
  if (original.reversesMovementId !== null) throw new DomainError("CONFLICT", PAYMENT_IS_REVERSAL);

  let occurredAt = original.occurredAt;
  if (input.occurredAt) {
    const chosen = valueDateOf(input.occurredAt, tx.now);
    if (chosen === null) throw new DomainError("VALIDATION", futureDateMessage("paiement"), "occurredAt");
    occurredAt = chosen;
  }
  const amount = eurFromWire(input.amount);
  const details = {
    method: input.method === undefined ? original.method : input.method,
    note: input.note === undefined ? original.note : input.note,
  };
  const magnitude = original.kind === "REFUND" ? eur.neg(original.amount) : original.amount;
  const moneyUnchanged =
    eur.compare(amount, magnitude) === 0 &&
    pocketId === original.pocketId &&
    occurredAt.getTime() === original.occurredAt.getTime();
  if (moneyUnchanged) {
    const updated = await updatePaymentDetails(tx, original, details);
    return { payment: paymentReceipt(updated), reversal: null, document: (await readDocumentMoney(tx, original.documentId)).state };
  }

  const before = await readDocumentMoney(tx, original.documentId);
  const reversal = await reversePayment(tx, original, before.status);
  const after = await readDocumentMoney(tx, original.documentId);
  if (original.kind === "REFUND") {
    const cap = refundable(after);
    if (eur.compare(amount, cap) > 0) throw new DomainError("CONFLICT", refundExceededMessage(cap));
  } else if (eur.compare(amount, after.due) > 0) {
    throw new DomainError("CONFLICT", dueExceededMessage(after.due));
  }
  const created = await insertPayment(tx, {
    id: input.newPaymentId,
    documentId: original.documentId,
    kind: original.kind,
    amount,
    pocketId,
    occurredAt,
    ...details,
  });
  return {
    payment: paymentReceipt(created),
    reversal: paymentReceipt(reversal),
    document: (await readDocumentMoney(tx, original.documentId)).state,
  };
}

// ── T8 : rembourser ────────────────────────────────────────────────────────────

/**
 * T8 rembourser (S03) : de l'argent rendu au client, daté du jour, sans contre-passation — un vrai événement
 * d'argent (03 §4.4). Plafond : payé net d'un document annulé, trop-perçu sinon. Poche verrouillée
 * exclusivement : « Non attribué » jamais négatif.
 */
export async function refund(tx: Tx, input: RefundData): Promise<RefundResult> {
  const replay = await findPayment(tx, input.id);
  if (replay) return { payment: paymentReceipt(replay), document: (await readDocumentMoney(tx, replay.documentId)).state };

  const pocketId = await treasuryWriter.resolvePocketId(tx, input.pocketId);
  const { documents } = await tx.lock({ documents: [input.documentId], pockets: { update: [pocketId] } });
  if (documents.length === 0) throw new DomainError("NOT_FOUND", DOCUMENT_NOT_FOUND);
  const again = await findPayment(tx, input.id);
  if (again) return { payment: paymentReceipt(again), document: (await readDocumentMoney(tx, again.documentId)).state };

  const money = await readDocumentMoney(tx, input.documentId);
  const amount = eurFromWire(input.amount);
  const cap = refundable(money);
  if (eur.compare(amount, cap) > 0) throw new DomainError("CONFLICT", refundExceededMessage(cap));
  const created = await insertPayment(tx, {
    id: input.id,
    documentId: input.documentId,
    kind: "REFUND",
    amount,
    pocketId,
    occurredAt: tx.now,
    method: input.method ?? null,
    note: input.note ?? null,
  });
  return { payment: paymentReceipt(created), document: (await readDocumentMoney(tx, input.documentId)).state };
}
