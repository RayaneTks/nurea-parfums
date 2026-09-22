/**
 * Contrat du module encaissements (04 §3.4 ; transactions T7 et T8 de 03 §4.3 ; action composée
 * `collectAllAction`, A-5 ; écrans S02, S03, S04).
 *
 * La nature d'un paiement (acompte, solde, remboursement) n'est JAMAIS demandée : le serveur la fixe selon
 * le geste et l'état du document (03 §3 `PaymentKind`). Le montant saisi est positif ; le mouvement de
 * Trésorerie porte le signe. Les identifiants de paiement viennent du formulaire (04 §3.6).
 */
import { z } from "zod";
import "./zod-fr";
import type { MoneyString } from "@/domain/money";
import type { DocumentState } from "./documents";
import { entityId, optionalText } from "./fields";
import { pocketChoice, positiveAmount, recordId, valueDate } from "./treasury";

export const PAYMENT_KINDS = ["DEPOSIT", "BALANCE", "REFUND"] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

/** Moyen (« Espèces · Virement · Carte · Autre ») et note : informatifs, seuls modifiables après écriture. */
const paymentDetails = {
  method: optionalText(40),
  note: optionalText(500),
};

/**
 * Paiement saisi avec la création d'un document (T1) : « Reçu maintenant » d'une vente, acompte d'une
 * commande (N1). Daté de l'instant de la création ; plusieurs poches possibles (S08).
 */
export const creationPaymentInput = z.object({
  id: entityId,
  amount: positiveAmount,
  pocketId: pocketChoice,
});

export type CreationPaymentInput = z.input<typeof creationPaymentInput>;
export type CreationPaymentData = z.output<typeof creationPaymentInput>;

/** T7 — encaisser un acompte ou un solde (S02 Acompte, Solde), plafonné au reste dû. */
export const recordPaymentInput = z.object({
  id: entityId,
  documentId: entityId,
  amount: positiveAmount,
  pocketId: pocketChoice,
  occurredAt: valueDate,
  ...paymentDetails,
});

/** T8 — annuler un paiement (contre-passation datée comme l'original). */
export const voidPaymentInput = z.object({ paymentId: recordId });

/**
 * T8 — corriger montant, date ou poche (S04) : l'ancien paiement est contre-passé à sa date et remplacé par
 * `newPaymentId`, en une transaction. `pocketId` absent : même poche ; `null` : « Non attribué ». `occurredAt`
 * absent : même date. Seuls le moyen ou la note changent : ils sont modifiés en place, sans mouvement.
 */
export const correctPaymentInput = z.object({
  paymentId: recordId,
  newPaymentId: entityId,
  amount: positiveAmount,
  pocketId: recordId.nullable().optional(),
  occurredAt: valueDate,
  ...paymentDetails,
});

/** T8 — rembourser (S03) : sortie datée du jour, plafonnée au payé d'un document annulé, au trop-perçu sinon. */
export const refundInput = z.object({
  id: entityId,
  documentId: entityId,
  amount: positiveAmount,
  pocketId: pocketChoice,
  ...paymentDetails,
});

/**
 * « Tout encaisser » d'un client (S02, A-5) : un T7 par document, du plus ancien au plus récent, en UNE
 * transaction. La répartition affichée par l'écran est envoyée telle quelle ; le serveur replafonne chaque
 * document et refuse tout si un seul dépasse.
 */
export const collectAllInput = z
  .object({
    pocketId: pocketChoice,
    occurredAt: valueDate,
    ...paymentDetails,
    payments: z
      .array(z.object({ id: entityId, documentId: entityId, amount: positiveAmount }))
      .min(1, "Aucun document à encaisser.")
      .max(50, "Encaisse au plus 50 documents à la fois."),
  })
  .superRefine((input, ctx) => {
    const ids = new Set<string>();
    const documents = new Set<string>();
    input.payments.forEach((payment, index) => {
      if (typeof payment?.id !== "string" || typeof payment.documentId !== "string") return;
      if (ids.has(payment.id) || documents.has(payment.documentId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["payments", index],
          message: "Ce document apparaît deux fois : recharge la page et réessaie.",
        });
      }
      ids.add(payment.id);
      documents.add(payment.documentId);
    });
  });

export type RecordPaymentInput = z.input<typeof recordPaymentInput>;
export type RecordPaymentData = z.output<typeof recordPaymentInput>;
export type VoidPaymentInput = z.input<typeof voidPaymentInput>;
export type VoidPaymentData = z.output<typeof voidPaymentInput>;
export type CorrectPaymentInput = z.input<typeof correctPaymentInput>;
export type CorrectPaymentData = z.output<typeof correctPaymentInput>;
export type RefundInput = z.input<typeof refundInput>;
export type RefundData = z.output<typeof refundInput>;
export type CollectAllInput = z.input<typeof collectAllInput>;
export type CollectAllData = z.output<typeof collectAllInput>;

// ── Sorties ────────────────────────────────────────────────────────────────────

export type PaymentReceipt = {
  id: string;
  documentId: string;
  kind: PaymentKind;
  /** Signé, comme son mouvement : négatif pour un remboursement. */
  amount: MoneyString;
  pocketId: string;
  /** ISO 8601 : date de valeur. */
  occurredAt: string;
  method: string | null;
  note: string | null;
  /** Paiement que celui-ci annule (contre-passation), s'il y en a un. */
  reversesPaymentId: string | null;
};

export type PaymentResult = {
  payment: PaymentReceipt;
  document: DocumentState;
  /**
   * Jeton de `revertDocumentChangeAction` (T4b, filet « Annuler » du toast). `null` sur un renvoi : le
   * premier envoi l'a déjà rendu.
   */
  undo: string | null;
};

export type RefundResult = {
  payment: PaymentReceipt;
  document: DocumentState;
};

export type VoidResult = {
  /** Contre-passation écrite (paiement d'entrée si l'on annule un remboursement, 03 §4.4). */
  payment: PaymentReceipt;
  voidedPaymentId: string;
  document: DocumentState;
};

export type CorrectionResult = {
  /** Le paiement qui vaut désormais : le nouveau, ou l'ancien si seuls le moyen ou la note ont changé. */
  payment: PaymentReceipt;
  /** Contre-passation de l'ancien, s'il a été remplacé. */
  reversal: PaymentReceipt | null;
  document: DocumentState;
};

export type CollectAllResult = {
  /** Du plus ancien document au plus récent : l'ordre d'écriture. */
  payments: PaymentReceipt[];
  documents: DocumentState[];
  undo: string | null;
};
