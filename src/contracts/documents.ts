/**
 * Contrat du module documents (04 §3.4 ; transactions T1–T6, T4b, T13 de 03 §4.3 ; actions composées A-5 ;
 * écrans E11, S01, S02, S03, S13).
 *
 * Un document est une commande (`ORDER`) ou une vente directe (`DIRECT_SALE`). Les schémas d'entrée
 * normalisent la saisie : montants tapés au clavier (« 119,90 ») rendus en chaînes exactes, lignes
 * confrontées aux règles des CHECK (`src/domain/sale-line.ts`), client choisi sous l'une de trois
 * formes. Les montants de sortie voyagent en `MoneyString` (04 §5).
 *
 * Paiements à la création (« Reçu maintenant », acompte, N1) : `creationPaymentInput` de `payments.ts`.
 */
import { z } from "zod";
import "./zod-fr";
import { DOCUMENT_ORIGINS, type DocumentOrigin, type DocumentStatus } from "@/domain/document-status";
import type { Fulfillment } from "@/domain/fulfillment";
import {
  eur,
  eurFromWire,
  formatEur,
  parseDzdInput,
  parseEurInput,
  parseRateInput,
  toDb,
  toWire,
  type Eur,
  type MoneyString,
} from "@/domain/money";
import {
  DEFAULT_VOLUME_ML,
  GIFT_PRICE_MESSAGE,
  MAX_LINE_QUANTITY,
  isVolumeMl,
  type VolumeMl,
} from "@/domain/sale-line";
import { customerFields } from "./customers";
import { confirmFlag, entityId, optionalDate, optionalText } from "./fields";
import { creationPaymentInput, type PaymentReceipt } from "./payments";
import { pocketChoice, positiveAmount, valueDate } from "./treasury";

// ── Lignes ─────────────────────────────────────────────────────────────────────

export const PRICE_REQUIRED_MESSAGE = "Indique un prix pour cette ligne, ou coche Offert.";
export const RATE_REQUIRED_MESSAGE = "Indique le taux de change de cette ligne.";
export const ITEM_REQUIRED_MESSAGE = "Choisis le parfum de cette ligne.";

/** Ce que la ligne vend : un parfum du catalogue (snapshot lu en base) ou un article saisi hors catalogue. */
export const lineItem = z.discriminatedUnion(
  "kind",
  [
    z.object({
      kind: z.literal("catalogue"),
      perfumeId: z.number().int(ITEM_REQUIRED_MESSAGE).positive(ITEM_REQUIRED_MESSAGE),
    }),
    z.object({
      kind: z.literal("offCatalog"),
      name: z
        .string()
        .trim()
        .min(2, "Indique le nom du parfum (2 caractères au moins).")
        .max(200, "Raccourcis ce nom : 200 caractères au plus."),
      brandName: optionalText(120),
    }),
  ],
  { errorMap: () => ({ message: ITEM_REQUIRED_MESSAGE }) },
);

export type LineItem = z.output<typeof lineItem>;

export const VOLUME_MESSAGE = "Choisis un volume : 10, 50 ou 80 ml.";

/** Contenances réelles 10 / 50 / 80 ml (`src/domain/sale-line.ts`). */
const volumeField = z.custom<VolumeMl>(isVolumeMl, VOLUME_MESSAGE);

const lineShape = {
  /** Absent sur une ligne existante : elle garde son parfum et son snapshot. */
  item: lineItem.optional(),
  volumeMl: volumeField,
  quantity: z
    .number()
    .int("Indique une quantité entière.")
    .min(1, "Indique une quantité d'au moins 1.")
    .max(MAX_LINE_QUANTITY, `Indique une quantité de ${MAX_LINE_QUANTITY} au plus.`),
  /** Saisie clavier : « 120 », « 119,90 ». Vide ou « 0 » pour une ligne offerte. */
  unitPriceEur: z.string().nullable().optional(),
  isGift: z.boolean().optional().default(false),
  /** Coût d'achat unitaire en dinars ; vide = coût à compléter. */
  unitCostDzd: z.string().nullable().optional(),
  /** Dinars pour 1 € ; exigé dès qu'un coût est saisi. */
  exchangeRate: z.string().nullable().optional(),
  /** Note par ligne (01 §3.1, A-12). */
  note: optionalText(500),
};

type RawLine = {
  unitPriceEur?: string | null;
  isGift: boolean;
  unitCostDzd?: string | null;
  exchangeRate?: string | null;
};

type NormalizedAmounts = {
  unitPriceEur: MoneyString;
  /** Dinars, chaîne décimale exacte (« 30000.00 »), ou null. */
  unitCostDzd: string | null;
  /** Taux, chaîne décimale exacte (« 277.00 »), ou null. */
  exchangeRate: string | null;
};

const blank = (text: string | null | undefined) => (text ?? "").trim() === "";

function normalizeLine<L extends RawLine>(line: L, ctx: z.RefinementCtx): Omit<L, keyof NormalizedAmounts> & NormalizedAmounts {
  let valid = true;
  const issue = (path: string, message: string) => {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    valid = false;
  };

  let price: Eur | null = null;
  if (blank(line.unitPriceEur)) {
    if (line.isGift) price = eur.zero;
    else issue("unitPriceEur", PRICE_REQUIRED_MESSAGE);
  } else {
    price = parseEurInput(line.unitPriceEur as string);
    if (price === null) issue("unitPriceEur", "Saisis un prix en euros (ex. 120 ou 119,90).");
    else if (line.isGift && !eur.isZero(price)) issue("unitPriceEur", GIFT_PRICE_MESSAGE);
    else if (!line.isGift && eur.isZero(price)) issue("unitPriceEur", PRICE_REQUIRED_MESSAGE);
  }

  let cost: string | null = null;
  if (!blank(line.unitCostDzd)) {
    const parsed = parseDzdInput(line.unitCostDzd as string);
    if (parsed === null) issue("unitCostDzd", "Saisis un coût en dinars (ex. 9000).");
    else cost = toDb(parsed);
  }

  let rate: string | null = null;
  if (!blank(line.exchangeRate)) {
    const parsed = parseRateInput(line.exchangeRate as string);
    if (parsed === null) issue("exchangeRate", "Saisis un taux supérieur à 0 (ex. 277).");
    else rate = toDb(parsed);
  } else if (!blank(line.unitCostDzd)) {
    issue("exchangeRate", RATE_REQUIRED_MESSAGE);
  }

  if (!valid || price === null) return z.NEVER;
  return { ...line, unitPriceEur: toWire(price), unitCostDzd: cost, exchangeRate: rate };
}

/**
 * Contenance pré-sélectionnée par le formulaire d'une ligne neuve sans mémoire de prix (03 §4.2).
 * Le contrat, lui, l'EXIGE : une écriture sans contenance est une faute d'écran, jamais un 80 silencieux.
 */
export const PROPOSED_VOLUME_ML = DEFAULT_VOLUME_ML;

/** Ligne d'un document neuf : le parfum et la contenance sont exigés, l'identifiant est posé par le serveur. */
export const createLineInput = z
  .object({ ...lineShape, item: lineItem })
  .transform(normalizeLine);

/**
 * Ligne d'un document modifié (T2) : l'identifiant est TOUJOURS fourni, généré par le formulaire pour
 * une ligne ajoutée. Connu du document : mise à jour en place ; inconnu : ligne créée sous cet id.
 * Un renvoi du même état ne duplique donc rien (04 §3.6).
 */
export const updateLineInput = z
  .object({ id: entityId, ...lineShape })
  .transform(normalizeLine);

export type CreateLineData = z.output<typeof createLineInput>;
export type UpdateLineData = z.output<typeof updateLineInput>;

// ── Client du document ─────────────────────────────────────────────────────────

/**
 * Trois façons de poser un client (06 S06, S10) : de passage (nom et contact libres, aucune fiche),
 * fiche existante (le nom est copié en snapshot), fiche créée en ligne dans la même transaction.
 */
export const documentCustomer = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("passing"), name: optionalText(120), contact: optionalText(200) }),
  z.object({ kind: z.literal("linked"), customerId: entityId }),
  z.object({ kind: z.literal("new"), customer: customerFields }),
]);

export type DocumentCustomerData = z.output<typeof documentCustomer>;

export function hasCustomerName(customer: DocumentCustomerData): boolean {
  return customer.kind !== "passing" || (customer.name ?? "") !== "";
}

/**
 * Un nom est exigé pour suivre une commande, ou une vente dont il reste à encaisser (06 E11 zone 4,
 * S06). Rend le message à placer sous le client, ou null.
 */
export function customerNameRequirement(origin: DocumentOrigin, due: Eur): string | null {
  if (origin === "ORDER") return "Choisis le client : une commande se suit sous un nom.";
  if (eur.compare(due, eur.zero) > 0) {
    return `Choisis le client : il faut un nom pour suivre les ${formatEur(due)} à encaisser.`;
  }
  return null;
}

/** Σ quantité × prix d'une saisie déjà normalisée ; null si une ligne est restée invalide. */
export function linesTotal(lines: readonly { quantity: number; unitPriceEur: MoneyString }[]): Eur | null {
  try {
    return eur.sum(lines.map((line) => eur.times(eurFromWire(line.unitPriceEur), line.quantity)));
  } catch {
    return null;
  }
}

// ── T1 : créer ─────────────────────────────────────────────────────────────────

export const DIRECT_SALE_DELIVERY_MESSAGE = "Une vente directe est livrée sur-le-champ : retire la date de livraison prévue.";

/** Σ des paiements de création ; null si l'un d'eux est resté invalide. */
export function paymentsTotal(payments: readonly { amount: MoneyString }[]): Eur | null {
  try {
    return eur.sum(payments.map((payment) => eurFromWire(payment.amount)));
  } catch {
    return null;
  }
}

/** « Le montant reçu dépasse le total (120,00 €). » (N1 : Σ paiements ≤ total, 03 §4.3 T1). */
export function receivedAboveTotalMessage(total: Eur): string {
  return `Le montant reçu dépasse le total (${formatEur(total)}).`;
}

export const createDocumentInput = z
  .object({
    /** UUID v4 généré à l'ouverture du composeur et gardé jusqu'au succès (04 §3.6). */
    id: entityId,
    origin: z.enum(DOCUMENT_ORIGINS),
    customer: documentCustomer.optional().default({ kind: "passing" }),
    /** Lot dès la création (N9) ; ouvert exigé. */
    batchId: entityId.nullable().optional(),
    /** Commande seulement. Sans heure choisie, le jour est enregistré à 00:00 Europe/Paris (03 §3). */
    expectedDeliveryAt: optionalDate,
    expectedDeliveryHasTime: z.boolean().optional().default(false),
    notes: optionalText(2000),
    lines: z.array(createLineInput).min(1, "Ajoute au moins un article.").max(100, "Garde 100 articles au plus."),
    /**
     * « Reçu maintenant » d'une vente, acompte d'une commande (N1), éventuellement réparti sur plusieurs
     * poches (S08). Σ ≤ total. Une commande qui reçoit un acompte naît confirmée.
     */
    payments: z.array(creationPaymentInput).max(10, "Répartis sur 10 poches au plus.").optional().default([]),
    confirm: confirmFlag,
  })
  .superRefine((input, ctx) => {
    if (input.origin === "DIRECT_SALE" && input.expectedDeliveryAt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["expectedDeliveryAt"], message: DIRECT_SALE_DELIVERY_MESSAGE });
    }
    const total = linesTotal(input.lines);
    const received = paymentsTotal(input.payments ?? []);
    if (total !== null && received !== null && eur.compare(received, total) > 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["payments"], message: receivedAboveTotalMessage(total) });
    }
    const ids = new Set<string>();
    (input.payments ?? []).forEach((payment, index) => {
      if (typeof payment?.id !== "string") return;
      if (ids.has(payment.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["payments", index, "id"],
          message: "Ce paiement apparaît deux fois : recharge la page et réessaie.",
        });
      }
      ids.add(payment.id);
    });
    if (!input.customer || hasCustomerName(input.customer)) return;
    // Ce qui reste à encaisser après les paiements de création exige un nom (06 E11 zone 4).
    const due = total === null || received === null ? null : eur.clampZero(eur.sub(total, received));
    const message = due === null ? null : customerNameRequirement(input.origin, due);
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customer"], message });
  });

export type CreateDocumentInput = z.input<typeof createDocumentInput>;
export type CreateDocumentData = z.output<typeof createDocumentInput>;

// ── T2 : modifier en place ─────────────────────────────────────────────────────

export const updateDocumentInput = z
  .object({
    documentId: entityId,
    /** Absent : client inchangé. */
    customer: documentCustomer.optional(),
    /** Absente : inchangée ; `null` : effacée. Commande seulement. */
    expectedDeliveryAt: optionalDate,
    /** Lu avec `expectedDeliveryAt` seulement (absent : pas d'heure choisie, le jour à 00:00 Europe/Paris). */
    expectedDeliveryHasTime: z.boolean().optional(),
    notes: optionalText(2000),
    /** Absent : lignes inchangées. Présent : l'état cible COMPLET des lignes, dans l'ordre d'affichage. */
    lines: z
      .array(updateLineInput)
      .min(1, "Garde au moins un article : pour tout retirer, annule ou supprime le document.")
      .max(100, "Garde 100 articles au plus.")
      .optional(),
    confirm: confirmFlag,
  })
  .superRefine((input, ctx) => {
    const seen = new Set<string>();
    input.lines?.forEach((line, index) => {
      if (typeof line?.id !== "string") return;
      if (seen.has(line.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lines", index, "id"],
          message: "Cette ligne apparaît deux fois : recharge la page et réessaie.",
        });
      }
      seen.add(line.id);
    });
  });

export type UpdateDocumentInput = z.input<typeof updateDocumentInput>;
export type UpdateDocumentData = z.output<typeof updateDocumentInput>;

// ── T3 : pointer une livraison ─────────────────────────────────────────────────

/** Valeur absolue (04 §3.6), bornée par le serveur à 0..quantité. */
export const setLineDeliveredInput = z.object({
  documentId: entityId,
  lineId: entityId,
  deliveredQuantity: z.number().int("Indique une quantité entière."),
  confirm: confirmFlag,
});

export type SetLineDeliveredInput = z.input<typeof setLineDeliveredInput>;
export type SetLineDeliveredData = z.output<typeof setLineDeliveredInput>;

// ── T4 : changer de statut ─────────────────────────────────────────────────────

/** Annuler est T5 (`cancelDocumentAction`, J6), avec ses remboursements : pas un simple statut cible. */
export const STATUS_TARGETS = ["PENDING", "CONFIRMED", "DELIVERED"] as const;

export const changeDocumentStatusInput = z.object({
  documentId: entityId,
  to: z.enum(STATUS_TARGETS),
  confirm: confirmFlag,
});

export type ChangeDocumentStatusInput = z.input<typeof changeDocumentStatusInput>;
export type ChangeDocumentStatusData = z.output<typeof changeDocumentStatusInput>;

// ── T4b : défaire un geste ─────────────────────────────────────────────────────

/**
 * « Annuler » du toast (5 s) après livrer, « Livrer et encaisser », changer de statut, encaisser (03 §4.3 T4b).
 * Le jeton est rendu, signé, par le geste lui-même : il porte l'état d'avant, l'empreinte de l'état écrit et
 * les paiements créés. L'écran ne le lit pas, il le renvoie.
 */
export const revertDocumentChangeInput = z.object({
  token: z.string().min(1, "Ce geste ne peut plus être annulé.").max(20_000, "Ce geste ne peut plus être annulé."),
});

export type RevertDocumentChangeInput = z.input<typeof revertDocumentChangeInput>;

// ── T5 : annuler ───────────────────────────────────────────────────────────────

/**
 * Annuler un document (S03) : il reste consultable, marqué annulé ; ses articles livrés reviennent en stock.
 * Remboursements proposés : un par poche de sortie, datés du jour, Σ ≤ payé net. Aucun : l'argent encaissé
 * reste dans l'Encaissé (acompte conservé, 02 §6).
 */
export const cancelDocumentInput = z
  .object({
    documentId: entityId,
    refunds: z
      .array(z.object({ id: entityId, amount: positiveAmount, pocketId: pocketChoice }))
      .max(10, "Rembourse depuis 10 poches au plus.")
      .optional()
      .default([]),
    confirm: confirmFlag,
  })
  .superRefine((input, ctx) => {
    const ids = new Set<string>();
    (input.refunds ?? []).forEach((refund, index) => {
      if (typeof refund?.id !== "string") return;
      if (ids.has(refund.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["refunds", index, "id"],
          message: "Ce remboursement apparaît deux fois : recharge la page et réessaie.",
        });
      }
      ids.add(refund.id);
    });
  });

export type CancelDocumentInput = z.input<typeof cancelDocumentInput>;
export type CancelDocumentData = z.output<typeof cancelDocumentInput>;

// ── A-5 : livrer et encaisser ──────────────────────────────────────────────────

/**
 * S02 variante Livrer : « Encaisser 60 € et livrer » — T7 puis T4 en UNE transaction (A-5). Le paiement est
 * un solde (le document est livré par le même geste) ; les réserves de la livraison se confirment comme en T4.
 */
export const deliverAndCollectInput = z.object({
  documentId: entityId,
  payment: z.object({
    id: entityId,
    amount: positiveAmount,
    pocketId: pocketChoice,
    occurredAt: valueDate,
    method: optionalText(40),
    note: optionalText(500),
  }),
  confirm: confirmFlag,
});

export type DeliverAndCollectInput = z.input<typeof deliverAndCollectInput>;
export type DeliverAndCollectData = z.output<typeof deliverAndCollectInput>;

// ── T6 : supprimer ─────────────────────────────────────────────────────────────

export const deleteDocumentInput = z.object({ documentId: entityId });

export type DeleteDocumentInput = z.input<typeof deleteDocumentInput>;
export type DeleteDocumentData = z.output<typeof deleteDocumentInput>;

// ── T13 : rattacher à un lot ───────────────────────────────────────────────────

/**
 * Un changement dit d'où part le document (`from`, le lot que l'écran affichait) et où il va (`to`) ;
 * `null` = sans lot. Rattacher, retirer, déplacer, unitaire (S01) ou en masse (S13, seul le
 * différentiel part) : une seule forme. Un document qui a changé de lot entre-temps est refusé
 * plutôt que déplacé en silence (01 §4.4).
 */
export const assignDocumentsToBatchInput = z
  .object({
    changes: z
      .array(z.object({ documentId: entityId, from: entityId.nullable(), to: entityId.nullable() }))
      .min(1, "Aucun changement à enregistrer.")
      .max(500, "Enregistre au plus 500 changements à la fois."),
  })
  .superRefine((input, ctx) => {
    const seen = new Set<string>();
    input.changes.forEach((change, index) => {
      if (typeof change?.documentId !== "string") return;
      if (seen.has(change.documentId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["changes", index, "documentId"],
          message: "Ce document apparaît deux fois : recharge la page et réessaie.",
        });
      }
      seen.add(change.documentId);
    });
  });

export type AssignDocumentsToBatchInput = z.input<typeof assignDocumentsToBatchInput>;
export type AssignDocumentsToBatchData = z.output<typeof assignDocumentsToBatchInput>;

// ── Sorties ────────────────────────────────────────────────────────────────────

/** Le minimum utile à l'écran après une écriture (04 §3.3) ; le reste arrive par le RSC rafraîchi. */
export type DocumentSummary = {
  id: string;
  origin: DocumentOrigin;
  status: DocumentStatus;
  total: MoneyString;
  paid: MoneyString;
  due: MoneyString;
};

/** Résumé et horodatages d'événement (03 §2.3). */
export type DocumentState = DocumentSummary & {
  /** ISO 8601. */
  confirmedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
};

export type DocumentStatusChange = DocumentState & {
  /** Jeton de `revertDocumentChangeAction` (T4b, filet « Annuler » du toast). */
  undo: string | null;
};

export type CancellationResult = {
  document: DocumentState;
  /** Remboursements écrits (montants négatifs), dans l'ordre reçu. */
  refunds: PaymentReceipt[];
};

export type DeliveryAndCollection = {
  document: DocumentState;
  payment: PaymentReceipt;
  undo: string | null;
};

export type RevertResult = {
  documents: DocumentState[];
  /** Paiements contre-passés par l'annulation du geste. */
  reversedPaymentIds: string[];
};

export type LineDelivery = {
  documentId: string;
  lineId: string;
  quantity: number;
  deliveredQuantity: number;
  fulfillment: Fulfillment;
};

export type DocumentDeletion = { id: string; deleted: boolean };

export type BatchAssignment = { changed: number };
