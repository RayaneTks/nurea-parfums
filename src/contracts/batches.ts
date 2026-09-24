/**
 * Contrat des lots (04 §3.4 ; écrans E05, E06, E21, S11, S12, S13) : le lot lui-même (J5), ses dépenses
 * (T9, T10 — J6) et les lectures de ses écrans (J13).
 */
import { z } from "zod";
import "./zod-fr";
import type { DocumentOrigin, DocumentStatus } from "@/domain/document-status";
import type { MoneyString } from "@/domain/money";
import type { BatchFiguresDTO } from "./chiffres";
import { entityId, optionalDate, optionalText } from "./fields";
import { pocketChoice, positiveAmount, recordId, valueDate } from "./treasury";

export const BATCH_STATUSES = ["OPEN", "CLOSED"] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

const batchName = z
  .string()
  .trim()
  .min(2, "Donne un nom au lot (2 caractères au moins).")
  .max(120, "Raccourcis ce nom : 120 caractères au plus.");

export const createBatchInput = z.object({
  /** Facultatif : fourni par le formulaire (E21, S11), il rend un renvoi sans doublon (04 §3.6). */
  id: entityId.optional(),
  name: batchName,
  expectedAt: optionalDate,
  notes: optionalText(2000),
});

/** Renommer, dater, annoter : un champ absent n'est pas touché, une date ou une note vidée est effacée. */
export const updateBatchInput = z.object({
  id: entityId,
  name: batchName.optional(),
  expectedAt: optionalDate,
  notes: optionalText(2000),
});

/** Clôturer / rouvrir : valeur cible, idempotente. */
export const setBatchStatusInput = z.object({
  id: entityId,
  status: z.enum(BATCH_STATUSES),
});

export const deleteBatchInput = z.object({ id: entityId });

export type CreateBatchInput = z.input<typeof createBatchInput>;
export type CreateBatchData = z.output<typeof createBatchInput>;
export type UpdateBatchInput = z.input<typeof updateBatchInput>;
export type UpdateBatchData = z.output<typeof updateBatchInput>;
export type SetBatchStatusInput = z.input<typeof setBatchStatusInput>;
export type SetBatchStatusData = z.output<typeof setBatchStatusInput>;
export type DeleteBatchInput = z.input<typeof deleteBatchInput>;

export type BatchSummary = {
  id: string;
  name: string;
  status: BatchStatus;
  /** ISO 8601. */
  expectedAt: string | null;
  notes: string | null;
};

export type BatchDeletion = { id: string; deleted: boolean };

// ── Dépenses (T9, T10) ─────────────────────────────────────────────────────────

/**
 * T9 — ajouter une dépense (S12) : libellé, montant, poche, date (jamais dans le futur), notes. Un lot clos
 * accepte encore ses dépenses tardives (03 `BatchStatus`). L'identifiant vient du formulaire (04 §3.6).
 */
const expenseLabel = z
  .string({ required_error: "Indique le libellé de la dépense (Transport, Douane…)." })
  .trim()
  .min(2, "Indique le libellé de la dépense (Transport, Douane…).")
  .max(120, "Raccourcis ce libellé : 120 caractères au plus.");

export const addBatchExpenseInput = z.object({
  id: entityId,
  batchId: entityId,
  label: expenseLabel,
  amount: positiveAmount,
  pocketId: pocketChoice,
  occurredAt: valueDate,
  notes: optionalText(2000),
});

/**
 * Modifier une dépense (06 E06 zone 4 « Modifier », S12 en mode modification) : SEULS le libellé et les
 * notes. Montant, date et poche sont en écriture seule (trigger `batch_expense_append_only`) — pour les
 * changer, on supprime la dépense et on la ressaisit, ce que la sheet dit en clair.
 */
export const updateBatchExpenseInput = z.object({
  id: recordId,
  label: expenseLabel.optional(),
  notes: optionalText(2000),
});

/** T10 — supprimer une dépense : son mouvement est contre-passé à sa date (03 §4.4). */
export const deleteBatchExpenseInput = z.object({ id: recordId });

export type AddBatchExpenseInput = z.input<typeof addBatchExpenseInput>;
export type AddBatchExpenseData = z.output<typeof addBatchExpenseInput>;
export type UpdateBatchExpenseInput = z.input<typeof updateBatchExpenseInput>;
export type UpdateBatchExpenseData = z.output<typeof updateBatchExpenseInput>;
export type DeleteBatchExpenseInput = z.input<typeof deleteBatchExpenseInput>;

export type BatchExpenseSummary = {
  id: string;
  batchId: string;
  label: string;
  notes: string | null;
  /** Montant de la dépense, positif (son mouvement est négatif). */
  amount: MoneyString;
  pocketId: string;
  /** ISO 8601 : date de valeur. */
  occurredAt: string;
  movementId: string;
};

/** `deleted: false` : la dépense était déjà supprimée (renvoi après coupure), rien n'a été écrit. */
export type BatchExpenseDeletion = { id: string; deleted: boolean };

// ── Lectures d'écran (E05, E06, S13 — J13) ─────────────────────────────────────

/**
 * Pages de 100 pour la zone « À rattacher » de E05 (06 E05 zone 0 : « 100 lignes au plus puis
 * "Afficher plus" ») ; `pages` en ajoute une à la suite, comme la liste Commandes.
 */
export const UNBATCHED_PAGE_SIZE = 100;
export const MAX_UNBATCHED_PAGES = 20;

/** Candidats de S13 : au-delà, la recherche de la sheet est le seul chemin — le compte reste dit. */
export const ASSIGN_CANDIDATES_LIMIT = 300;

/** Libellés de dépense proposés en chips (06 S12 zone « ajout » : « 6 au plus »). */
export const EXPENSE_LABEL_CHIPS = 6;

export type BatchesParams = { q: string; pages: number };

/**
 * `?q=&pages=` de E05 : la recherche et la pagination portent sur la zone « À rattacher » seule (la
 * liste des lots tient en entier). Valeur illisible : saisie vide, une page.
 */
export function parseBatchesParams(params: { q?: string | null; pages?: string | null }): BatchesParams {
  const q = (params.q ?? "").trim().slice(0, 120);
  const requested = /^\d{1,3}$/.test(params.pages ?? "") ? Number(params.pages) : 1;
  return { q, pages: Math.min(Math.max(requested, 1), MAX_UNBATCHED_PAGES) };
}

/**
 * Un document dans une liste de lot : zone 0 de E05, zone 3 de E06, candidats de S13. Montants lus dans
 * la vue `DocumentBalance` (03 §5.1), jamais recomposés.
 */
export type BatchDocumentRowDTO = {
  id: string;
  origin: DocumentOrigin;
  status: DocumentStatus;
  /** Nom vivant de la fiche, à défaut le nom saisi ; null : « Client de passage » (06 §1.7). */
  customerName: string | null;
  /** ISO 8601. */
  orderedAt: string;
  deliveredAt: string | null;
  cancelledAt: string | null;
  total: MoneyString;
  due: MoneyString;
  /** Premiers parfums du document, dans l'ordre des lignes (« Sauvage, Libre +2 »). */
  items: string[];
  /** Nombre de lignes du document, d'où vient le « +2 ». */
  lineCount: number;
};

/** Zone 0 de E05 : ce qui n'appartient à aucun lot, et son compte réel. */
export type UnbatchedDTO = {
  rows: BatchDocumentRowDTO[];
  /** Documents sans lot que la recherche retient : « 100 affichés sur 132 ». */
  total: number;
  hasMore: boolean;
};

/** Une ligne de la liste des lots (E05 zone 1) : ses chiffres viennent de `chiffresParLot()`. */
export type BatchRowDTO = {
  id: string;
  name: string;
  status: BatchStatus;
  expectedAt: string | null;
  /** ISO 8601 : « créé en sept. » quand aucune arrivée n'est prévue. */
  createdAt: string;
  /** TOUS les documents rattachés, annulés compris — le même nombre que le refus de suppression. */
  documentCount: number;
  figures: BatchFiguresDTO;
};

export type BatchesListDTO = BatchesParams & {
  unbatched: UnbatchedDTO;
  open: BatchRowDTO[];
  closed: BatchRowDTO[];
  /** Lots existants, tous statuts : distingue le vide de départ du vide de filtre. */
  total: number;
};

/** Une dépense de lot en lecture (E06 zone 4) : les contre-passées n'y sont pas. */
export type BatchExpenseRowDTO = {
  id: string;
  label: string;
  notes: string | null;
  /** Montant positif (son mouvement sort). */
  amount: MoneyString;
  /** ISO 8601 : date de valeur. */
  occurredAt: string;
  pocketId: string;
  pocketName: string;
};

/**
 * Une ligne d'un document non annulé du lot (E06) : de quoi dresser la liste du fournisseur (parfum,
 * contenance, client — jamais un prix) et relire l'achat dans la monnaie où il a été payé. Montants
 * d'achat en texte de base (`dzdFromDb`, `rateFromDb`, `eurFromWire`), null quand ils manquent.
 */
export type BatchLineDTO = {
  id: string;
  documentId: string;
  status: DocumentStatus;
  /** Nom vivant de la fiche, à défaut le nom saisi ; null : « Client de passage ». */
  customerName: string | null;
  perfumeName: string;
  brandName: string | null;
  volumeMl: number | null;
  quantity: number;
  deliveredQuantity: number;
  isGift: boolean;
  unitCostDzd: string | null;
  exchangeRate: string | null;
  unitCostEur: MoneyString | null;
};

/** La fiche d'un lot (E06). La requête rend `null` quand le lot n'existe plus. */
export type BatchSheetDTO = {
  batch: BatchSummary;
  createdAt: string;
  /** Les cinq tuiles : Encaissé, Marge nette (+ %), À encaisser, Coûts d'achat, Dépenses. */
  figures: BatchFiguresDTO;
  /** Rattachés non annulés, du plus récent au plus ancien. */
  documents: BatchDocumentRowDTO[];
  /** Rattachés annulés : sous-section repliée « Annulés · 1 », détachables. */
  cancelled: BatchDocumentRowDTO[];
  /** `documents` + `cancelled` : l'en-tête « Documents · 12 ». */
  documentCount: number;
  /** Lignes des documents non annulés, client par client, dans l'ordre des documents puis des lignes. */
  lines: BatchLineDTO[];
  expenses: BatchExpenseRowDTO[];
  /** Raison portée par l'entrée « Supprimer le lot » désactivée, ou `null` si elle est active. */
  deletionRefusal: string | null;
  /** Libellés déjà saisis, ceux du lot d'abord (A10, chips de S12). */
  expenseLabels: string[];
};

/** Un candidat de S13 : coché s'il appartient déjà à ce lot. */
export type AssignCandidateDTO = BatchDocumentRowDTO & { attached: boolean };

/** S13 — les candidats servis par le RSC de la page sous `?assigner=1` (aucune requête d'effet client). */
export type AssignSheetDTO = {
  batchId: string;
  batchName: string;
  candidates: AssignCandidateDTO[];
  /** Candidats existants ; au-delà de la limite, la liste est tronquée SANS le taire. */
  total: number;
  hasMore: boolean;
};
