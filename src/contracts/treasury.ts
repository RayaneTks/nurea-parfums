/**
 * Contrat du module trésorerie (04 §3.4 ; transactions T11, T12, T15 de 03 §4.3 ; écrans E03, E04, S14–S16,
 * S21) et champs d'argent partagés par les encaissements (`payments.ts`) et les dépenses de lot (`batches.ts`).
 *
 * Un montant saisi au clavier (« 60 », « 59,90 ») devient une `MoneyString` exacte et strictement positive :
 * le sens (entrée, sortie) n'est jamais porté par le signe de la saisie mais par le geste — c'est
 * `insertMovement` qui signe le mouvement (07 §3.0.3).
 */
import { z } from "zod";
import "./zod-fr";
import { isTextId } from "@/domain/ids";
import { eur, parseEurInput, toWire, type MoneyString } from "@/domain/money";
import { parisDayKey } from "@/domain/periods";
import { STALE_ID_MESSAGE, entityId, optionalDate, optionalText } from "./fields";

// ── Champs partagés ────────────────────────────────────────────────────────────

/**
 * Identifiant d'une ligne DÉJÀ en base (paiement, mouvement, dépense, poche) : cuid, UUID, ou identifiant
 * déterministe posé par la reprise (`mig-pay-…`, `mig-poche-non-attribue`, 03 §7) ou par le serveur
 * (`poche-non-attribue`). `entityId` refuserait les pièces reprises : on ne pourrait plus les annuler.
 * Une création idempotente, elle, garde `entityId` (UUID fourni par le formulaire, 04 §3.6).
 */
const STORED_ID = /^(?:mig-)?[a-z]+(?:-[a-z0-9]+)+$/;

export function isRecordId(value: unknown): value is string {
  return isTextId(value) || (typeof value === "string" && value.length <= 128 && STORED_ID.test(value));
}

export const recordId = z.string().refine(isRecordId, STALE_ID_MESSAGE);

export const AMOUNT_FORMAT_MESSAGE = "Saisis un montant en euros (ex. 60 ou 59,90).";
export const AMOUNT_POSITIVE_MESSAGE = "Indique un montant supérieur à 0 €.";

/** Montant saisi (« 60 », « 59,90 », « 60.00 ») → `MoneyString` strictement positive. */
export const positiveAmount = z.string({ required_error: AMOUNT_POSITIVE_MESSAGE }).transform((text, ctx): MoneyString => {
  const parsed = parseEurInput(text);
  if (parsed === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: AMOUNT_FORMAT_MESSAGE });
    return z.NEVER;
  }
  if (eur.compare(parsed, eur.zero) <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: AMOUNT_POSITIVE_MESSAGE });
    return z.NEVER;
  }
  return toWire(parsed);
});

/**
 * Poche choisie pour un mouvement. `null` ou absente : « Non attribué » (03 §3 `Setting.defaultPocketId`,
 * 04 §4.4). L'écran pré-sélectionne la poche par défaut et l'envoie : l'absence n'est jamais « la poche
 * par défaut » implicite, qui changerait sous les doigts du gérant.
 */
export const pocketChoice = recordId.nullable().optional().transform((value) => value ?? null);

/**
 * Date de valeur d'un mouvement d'argent (06 §4.1 : « jamais dans le futur ») : absente, c'est l'instant de
 * l'écriture ; un jour de Paris postérieur à aujourd'hui est refusé (`null`) ; plus tard dans la journée
 * (horloge de l'appareil en avance, jour seul choisi) devient l'instant de l'écriture.
 */
export function valueDateOf(chosen: Date | null | undefined, now: Date): Date | null {
  if (!chosen) return now;
  if (parisDayKey(chosen) > parisDayKey(now)) return null;
  return chosen.getTime() > now.getTime() ? now : chosen;
}

export function futureDateMessage(noun: "paiement" | "dépense" | "mouvement"): string {
  const article = noun === "dépense" ? "une" : "un";
  return `Choisis une date passée : ${article} ${noun} ne se date pas dans le futur.`;
}

/** Date de valeur facultative (voir `valueDateOf`). */
export const valueDate = optionalDate;

// ── Poches ─────────────────────────────────────────────────────────────────────

/** Natures qu'un gérant peut créer ; `UNASSIGNED` est réservée à la poche système. */
export const POCKET_KINDS = ["CASH", "BANK", "SUPPLIER", "OTHER"] as const;
export type CreatablePocketKind = (typeof POCKET_KINDS)[number];
export type PocketKind = CreatablePocketKind | "UNASSIGNED";

const pocketName = z
  .string()
  .trim()
  .min(2, "Donne un nom à la poche (2 caractères au moins).")
  .max(60, "Raccourcis ce nom : 60 caractères au plus.");

/** Solde d'ouverture : vide ⇒ 0 ; positif ou nul (S16). */
const openingBalance = z
  .string()
  .nullable()
  .optional()
  .transform((text, ctx): MoneyString => {
    if (text === undefined || text === null || text.trim() === "") return toWire(eur.zero);
    const parsed = parseEurInput(text);
    if (parsed === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Saisis un solde en euros (ex. 200 ou 0)." });
      return z.NEVER;
    }
    return toWire(parsed);
  });

export const createPocketInput = z.object({
  /** Facultatif : fourni par le formulaire (S16), il rend un renvoi sans doublon (04 §3.6). */
  id: entityId.optional(),
  name: pocketName,
  kind: z.enum(POCKET_KINDS),
  openingBalance,
  /** « Proposer par défaut » (S16) : la poche devient la poche proposée partout (N2). */
  makeDefault: z.boolean().optional().default(false),
});

/**
 * Renommer, changer de nature, réordonner (S14, S21). `position` : rang voulu parmi les poches actives hors
 * « Non attribué », à partir de 0 — le serveur renumérote l'ordre en une écriture cohérente.
 */
export const updatePocketInput = z
  .object({
    id: recordId,
    name: pocketName.optional(),
    kind: z.enum(POCKET_KINDS).optional(),
    position: z.number().int("Indique un rang entier.").min(0, "Indique un rang de 0 ou plus.").optional(),
  })
  .refine((input) => input.name !== undefined || input.kind !== undefined || input.position !== undefined, {
    message: "Aucune modification à enregistrer.",
  });

export const archivePocketInput = z.object({ id: recordId });
export const deletePocketInput = z.object({ id: recordId });

// ── Mouvements manuels ─────────────────────────────────────────────────────────

export const SAME_POCKET_MESSAGE = "Choisis deux poches différentes.";

/**
 * T11 : transfert entre poches, ou « Répartir le non attribué » (`fromPocketId` à `null`). Une poche autre
 * que « Non attribué » qui passerait en négatif est une réserve (`confirm: true`) ; « Non attribué » ne passe
 * jamais sous zéro.
 */
export const transferInput = z
  .object({
    /** Facultatif : identifiant de la jambe de sortie, et du groupe ; rend un renvoi sans doublon. */
    id: entityId.optional(),
    fromPocketId: pocketChoice,
    toPocketId: recordId,
    amount: positiveAmount,
    occurredAt: valueDate,
    label: optionalText(200),
    confirm: z.boolean().optional().default(false),
  })
  .superRefine((input, ctx) => {
    if (input.fromPocketId !== null && input.fromPocketId === input.toPocketId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["toPocketId"], message: SAME_POCKET_MESSAGE });
    }
  });

export const ADJUSTMENT_DIRECTIONS = ["in", "out"] as const;

/** Ajustement signé (S15) : « Ajouter » (`in`) ou « Retirer » (`out`), raison exigée. */
export const adjustInput = z.object({
  id: entityId.optional(),
  pocketId: pocketChoice,
  direction: z.enum(ADJUSTMENT_DIRECTIONS),
  amount: positiveAmount,
  reason: z
    .string({ required_error: "Indique la raison de l'ajustement." })
    .trim()
    .min(2, "Indique la raison de l'ajustement.")
    .max(200, "Raccourcis ce texte : 200 caractères au plus."),
  occurredAt: valueDate,
});

/** Paiement fournisseur (S15) : sort de la Trésorerie sans toucher la Marge nette (03 §5.4). */
export const supplierPaymentInput = z.object({
  id: entityId.optional(),
  pocketId: pocketChoice,
  amount: positiveAmount,
  note: optionalText(200),
  occurredAt: valueDate,
});

/** T12 : annuler un mouvement manuel (les deux jambes d'un transfert). */
export const reverseMovementInput = z.object({ movementId: recordId });

export type CreatePocketInput = z.input<typeof createPocketInput>;
export type CreatePocketData = z.output<typeof createPocketInput>;
export type UpdatePocketInput = z.input<typeof updatePocketInput>;
export type UpdatePocketData = z.output<typeof updatePocketInput>;
export type TransferInput = z.input<typeof transferInput>;
export type TransferData = z.output<typeof transferInput>;
export type AdjustInput = z.input<typeof adjustInput>;
export type AdjustData = z.output<typeof adjustInput>;
export type SupplierPaymentInput = z.input<typeof supplierPaymentInput>;
export type SupplierPaymentData = z.output<typeof supplierPaymentInput>;
export type ReverseMovementInput = z.input<typeof reverseMovementInput>;

// ── Sorties ────────────────────────────────────────────────────────────────────

export type CashMovementKind = "PAYMENT" | "EXPENSE" | "SUPPLIER" | "TRANSFER" | "ADJUSTMENT";

export type PocketSummary = {
  id: string;
  name: string;
  kind: PocketKind;
  isSystem: boolean;
  archived: boolean;
  sortOrder: number;
  openingBalance: MoneyString;
  /** Solde d'ouverture + Σ mouvements (03 §5.5). */
  balance: MoneyString;
  /** Poche proposée partout (N2) ; « Non attribué » l'est quand aucune ne l'est. */
  isDefault: boolean;
};

export type MovementSummary = {
  id: string;
  pocketId: string;
  kind: CashMovementKind;
  /** Signé : + l'argent entre dans la poche, − il en sort. */
  amount: MoneyString;
  /** ISO 8601 : date de valeur. */
  occurredAt: string;
  label: string | null;
  reversesId: string | null;
  transferGroupId: string | null;
};

export type PocketBalance = { pocketId: string; balance: MoneyString };

export type MovementResult = { movement: MovementSummary; pocket: PocketBalance };

export type TransferResult = {
  transferGroupId: string;
  /** Jambe de sortie puis jambe d'entrée. */
  movements: [MovementSummary, MovementSummary];
  from: PocketBalance;
  to: PocketBalance;
};

export type ReversalResult = {
  /** Mouvements d'origine contre-passés. */
  reversedIds: string[];
  /** Contre-passations écrites (une par jambe). */
  movements: MovementSummary[];
  pockets: PocketBalance[];
};

export type PocketDeletion = { id: string; deleted: boolean };

/** Une ligne du journal de Trésorerie (E04), avec sa pièce éventuelle. */
export type JournalEntry = MovementSummary & {
  pocketName: string;
  /** Mouvement qui annule celui-ci, s'il existe (la paire se replie à l'écran). */
  reversedById: string | null;
  /** Transfert : poche de l'autre jambe (« Transfert vers Banque », « Transfert depuis Espèces »). */
  counterpartPocketName: string | null;
  payment: {
    id: string;
    kind: "DEPOSIT" | "BALANCE" | "REFUND";
    documentId: string;
    documentOrigin: "ORDER" | "DIRECT_SALE";
    customerName: string | null;
  } | null;
  expense: { id: string; label: string; batchId: string; batchName: string } | null;
};

/** Fiche d'une poche (06 S14) : ses derniers mouvements et leur nombre total (0 : la poche se supprime). */
export type PocketActivity = {
  pocketId: string;
  movementCount: number;
  /** Les plus récents d'abord, tous mois confondus. */
  recent: JournalEntry[];
};

export type MonthlyJournal = {
  /** « 2026-09 ». */
  month: string;
  /** Poche filtrée (`?poche=`), `null` : toutes. */
  pocketId: string | null;
  /** ISO 8601, bornes `[from, to[` du mois en Europe/Paris. */
  from: string;
  to: string;
  /** Net du mois ENTIER (jamais d'un sous-ensemble, 01 §4.3). */
  net: MoneyString;
  entries: JournalEntry[];
};
