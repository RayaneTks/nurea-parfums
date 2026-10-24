/**
 * Contrat du carnet fournisseur (docs/admin/dettes-fournisseur.md ; écran E22, sheets S22–S25).
 *
 * Un seul compte avec le fournisseur, en dinars : des dettes et des versements, et un Reste à payer dérivé.
 * Indépendant de la Trésorerie et de la compta : rien ici ne crée un mouvement d'argent. L'euro n'est
 * qu'une lecture au taux de l'écran (`Setting.supplierExchangeRate`), jamais figée sur une ligne.
 */
import { z } from "zod";
import "./zod-fr";
import { dzd, parseDzdInput, parseRateInput, toDb } from "@/domain/money";
import { SUPPLIER_ENTRY_KINDS, type SupplierBalanceState, type SupplierEntryKind } from "@/domain/supplier-debt";
import { entityId, optionalDate, optionalText } from "./fields";
import { RATE_MESSAGE } from "./settings";

export { SUPPLIER_ENTRY_KINDS, type SupplierEntryKind };

export const SUPPLIER_AMOUNT_MESSAGE = "Saisis un montant en dinars supérieur à 0 (ex. 92700).";
export const SUPPLIER_FUTURE_DATE_MESSAGE = "Choisis une date passée : une ligne du carnet ne se date pas dans le futur.";

/** Montant saisi (« 92 700 », « 92700,50 », « 92 700 DA ») → chaîne de base strictement positive. */
const amountDzd = z.string({ required_error: SUPPLIER_AMOUNT_MESSAGE }).transform((text, ctx) => {
  const parsed = parseDzdInput(text);
  if (parsed === null || dzd.compare(parsed, dzd.zero) <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: SUPPLIER_AMOUNT_MESSAGE });
    return z.NEVER;
  }
  return toDb(parsed);
});

/** Plafond d'éléments cochés par dette : au-delà, l'écran est périmé ou fabriqué. */
export const SUPPLIER_ITEMS_MAX = 500;

/**
 * Un élément coché dans le sélecteur (S25) : un document ou un lot entier. Sans montant : le serveur
 * recalcule le coût de chacun au moment d'écrire (`supplier/sql.ts`), il ne croit pas l'écran.
 */
const supplierItem = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("document"), documentId: entityId }),
  z.object({ kind: z.literal("batch"), batchId: entityId }),
]);

export type SupplierItemInput = z.input<typeof supplierItem>;

/**
 * Noter une dette (à la main ou depuis le sélecteur) ou un versement. L'identifiant vient du formulaire :
 * un double tap rend la même ligne (04 §3.6). Date absente : maintenant ; jamais un jour futur.
 */
export const recordSupplierEntryInput = z
  .object({
    id: entityId,
    kind: z.enum(SUPPLIER_ENTRY_KINDS),
    amountDzd,
    label: optionalText(120),
    note: optionalText(2000),
    occurredAt: optionalDate,
    items: z.array(supplierItem).max(SUPPLIER_ITEMS_MAX).optional().default([]),
  })
  .superRefine((input, ctx) => {
    if (input.kind === "PAYMENT" && input.items.length > 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "Un versement ne porte pas d'éléments cochés." });
    }
    const seen = new Set<string>();
    for (const item of input.items) {
      const key = item.kind === "document" ? `d:${item.documentId}` : `b:${item.batchId}`;
      if (seen.has(key)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "Un élément est coché deux fois : recharge la liste." });
        return;
      }
      seen.add(key);
    }
  });

/** Corriger une ligne : un champ absent n'est pas touché, un nom ou une note vidés sont effacés. Le sens reste. */
export const updateSupplierEntryInput = z.object({
  id: entityId,
  amountDzd: amountDzd.optional(),
  label: optionalText(120),
  note: optionalText(2000),
  occurredAt: optionalDate.transform((date) => date ?? undefined),
});

/** Supprimer une ligne (le filet « Annuler » 5 s est côté écran, `UndoProvider`). */
export const deleteSupplierEntryInput = z.object({ id: entityId });

/** Taux de lecture du carnet (DA pour 1 €), mémorisé ; ne change pas le taux proposé à la vente. */
export const setSupplierRateInput = z.object({
  rate: z.string({ required_error: RATE_MESSAGE }).transform((text, ctx) => {
    const rate = parseRateInput(text);
    if (rate === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: RATE_MESSAGE });
      return z.NEVER;
    }
    return toDb(rate);
  }),
});

export type RecordSupplierEntryInput = z.input<typeof recordSupplierEntryInput>;
export type RecordSupplierEntryData = z.output<typeof recordSupplierEntryInput>;
export type UpdateSupplierEntryInput = z.input<typeof updateSupplierEntryInput>;
export type UpdateSupplierEntryData = z.output<typeof updateSupplierEntryInput>;
export type DeleteSupplierEntryInput = z.input<typeof deleteSupplierEntryInput>;
export type SetSupplierRateInput = z.input<typeof setSupplierRateInput>;

// ── Lectures ───────────────────────────────────────────────────────────────────
// Montants en chaîne de base (« 92700.00 », `dzdFromDb`), taux en chaîne exacte (`rateFromDb`) :
// l'écran relit avec `dzdFromDb` / `rateFromDb` et convertit par `dzdToEur`, au taux qu'il affiche.

export type SupplierEntrySummary = {
  id: string;
  kind: SupplierEntryKind;
  amountDzd: string;
  label: string | null;
  note: string | null;
  /** ISO 8601. */
  occurredAt: string;
};

export type SupplierEntryRowDTO = SupplierEntrySummary & {
  /** Éléments cochés encore présents (0 pour une dette à la main et pour un versement). */
  itemCount: number;
};

/** Reste à payer et taux : l'en-tête de E22 et la rangée de l'Accueil lisent la même requête. */
export type SupplierBalanceDTO = {
  remainingDzd: string;
  state: SupplierBalanceState;
  /** Taux du carnet ; à défaut, le taux par défaut des Réglages. */
  rate: string;
};

export type SupplierLedgerDTO = SupplierBalanceDTO & {
  /** Du plus récent au plus ancien (date, puis saisie). */
  entries: SupplierEntryRowDTO[];
};

export type SupplierEntryItemDTO =
  | {
      kind: "document";
      id: string;
      documentId: string;
      origin: "ORDER" | "DIRECT_SALE";
      /** Nom vivant de la fiche, à défaut le nom saisi ; null : « Client de passage ». */
      customerName: string | null;
      /** ISO 8601. */
      orderedAt: string;
      amountDzd: string;
    }
  | { kind: "batch"; id: string; batchId: string; name: string; amountDzd: string };

/** La sheet d'une ligne (`?ligne=<id>`, S22). La requête rend `null` quand la ligne n'existe plus. */
export type SupplierEntryDTO = SupplierEntrySummary & {
  /** ISO 8601. */
  createdAt: string;
  items: SupplierEntryItemDTO[];
};

export type SupplierEntryDeletion = { id: string; deleted: boolean };

/** La dette la plus récente qui a déjà coché un élément (directement, ou par son lot pour un document). */
export type SupplierNotedDTO = { entryId: string; label: string | null; /** ISO 8601. */ occurredAt: string };

/** S25 — un document non annulé (en attente compris), avec son coût d'achat en DA. */
export type SupplierPickerDocumentDTO = {
  id: string;
  origin: "ORDER" | "DIRECT_SALE";
  status: "PENDING" | "CONFIRMED" | "DELIVERED";
  /** ISO 8601. */
  orderedAt: string;
  customerName: string | null;
  batchId: string | null;
  /** Σ quantité × coût en DA des lignes qui en ont un. */
  costDzd: string;
  lineCount: number;
  /** Lignes sans coût en DA : exclues de la somme, comptées à part. */
  missingLines: number;
  /** Premiers noms de parfum, pour la légende et la recherche. */
  items: string[];
  noted: SupplierNotedDTO | null;
};

/** S25 — un lot qui porte au moins un document non annulé. */
export type SupplierPickerBatchDTO = {
  id: string;
  name: string;
  status: "OPEN" | "CLOSED";
  documentCount: number;
  costDzd: string;
  missingLines: number;
  noted: SupplierNotedDTO | null;
};

/** S25 — servi par le RSC de E22 sous `?selection=1` : la sheet ne lance aucune requête. */
export type SupplierPickerDTO = {
  documents: SupplierPickerDocumentDTO[];
  batches: SupplierPickerBatchDTO[];
  /** Documents existants ; au-delà de la limite, la liste est tronquée SANS le taire. */
  total: number;
};
