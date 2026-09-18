/**
 * Contrat des fiches client (04 §3.4, 02 §4.10 ; écrans E14, E20, S10).
 *
 * Le téléphone et le WhatsApp se saisissent comme on les écrit en France et sont stockés en E.164
 * (`src/domain/phone.ts`) : « 06 12 34 56 78 » est accepté, « +33612345678 » n'est plus exigé.
 */
import { z } from "zod";
import "./zod-fr";
import type { DocumentOrigin, DocumentStatus } from "@/domain/document-status";
import type { MoneyString } from "@/domain/money";
import { normalizePhone } from "@/domain/phone";
import { entityId, optionalText } from "./fields";

export const PHONE_MESSAGE = "Numéro non reconnu : saisis-le comme 06 12 34 56 78 ou +33 6 12 34 56 78.";

/** Téléphone saisi → E.164 ; vide → `null` ; absent → `undefined` (non modifié). */
const phoneField = z
  .string()
  .nullable()
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value === null) return value;
    const text = value.trim();
    if (text === "") return null;
    const e164 = normalizePhone(text);
    if (e164 === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: PHONE_MESSAGE });
      return z.NEVER;
    }
    return e164;
  });

/** Identifiant Snapchat : « @ » de tête retiré (l'écran l'affiche lui-même). */
const snapchatField = z
  .string()
  .nullable()
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value === null) return value;
    const text = value.trim().replace(/^@+/, "");
    if (text === "") return null;
    if (text.length < 2 || text.length > 40) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indique un identifiant Snap de 2 à 40 caractères." });
      return z.NEVER;
    }
    return text;
  });

export const customerFullName = z
  .string()
  .trim()
  .min(2, "Indique le nom du client (2 caractères au moins).")
  .max(120, "Raccourcis ce nom : 120 caractères au plus.");

/** Les champs d'une fiche, communs à la création (E20, S10) et à la création en ligne d'un document. */
export const customerFields = z.object({
  fullName: customerFullName,
  phone: phoneField,
  whatsapp: phoneField,
  snapchat: snapchatField,
  address: optionalText(500),
  notes: optionalText(2000),
});

export const createCustomerInput = customerFields.extend({
  /** Facultatif : fourni par le formulaire, il rend un renvoi sans doublon (04 §3.6). */
  id: entityId.optional(),
});

/** Modification : un champ absent n'est pas touché ; vidé (`null` ou « »), il est effacé — sauf le nom. */
export const updateCustomerInput = customerFields.partial().extend({ id: entityId });

export const deleteCustomerInput = z.object({ id: entityId });

export type CustomerFieldsData = z.output<typeof customerFields>;
export type CreateCustomerInput = z.input<typeof createCustomerInput>;
export type CreateCustomerData = z.output<typeof createCustomerInput>;
export type UpdateCustomerInput = z.input<typeof updateCustomerInput>;
export type UpdateCustomerData = z.output<typeof updateCustomerInput>;
export type DeleteCustomerInput = z.input<typeof deleteCustomerInput>;

/** Ce que rend une écriture de fiche : de quoi poser le client sur l'écran appelant. */
export type CustomerSummary = {
  id: string;
  fullName: string;
  phoneE164: string | null;
  whatsappE164: string | null;
  snapchat: string | null;
  address: string | null;
  notes: string | null;
};

export type CustomerDeletion = { id: string; deleted: boolean };

// ── Suppression : la règle et sa raison, écrites une fois ─────────────────────

/**
 * Raison du refus de suppression d'une fiche (03 §4.4, 06 E14) : une commande en attente ou confirmée est liée.
 * Le writer la lève, la fiche l'affiche AVANT le geste (bouton désactivé) — le même texte aux deux endroits.
 * `null` : la fiche peut être supprimée (ses documents livrés ou annulés n'empêchent rien).
 */
export function customerDeletionBlock(openOrders: number): string | null {
  if (openOrders <= 0) return null;
  return openOrders === 1
    ? "Impossible : 1 commande en cours. Livre-la ou annule-la d'abord."
    : `Impossible : ${openOrders} commandes en cours. Livre-les ou annule-les d'abord.`;
}

// ── Lectures des écrans (06 E12, E14, E20) ─────────────────────────────────────

/** E12 : pages de 50 fiches ; « Afficher plus » ajoute une page (`pages`, 1 ne s'écrit pas). */
export const CUSTOMERS_PAGE_SIZE = 50;
/** E14 : l'historique par pages de 20 documents. */
export const CUSTOMER_HISTORY_PAGE_SIZE = 20;
/** Au-delà, une URL fabriquée : 40 pages suffisent à toute la clientèle (2 000 fiches, 800 documents). */
export const MAX_CUSTOMER_PAGES = 40;

const SEARCH_MAX = 120;

/** `pages` lu dans l'URL : entier de 1 à 40, 1 à défaut. */
export function parsePages(raw: string | null | undefined): number {
  const requested = /^\d{1,3}$/.test(raw ?? "") ? Number(raw) : 1;
  return Math.min(Math.max(requested, 1), MAX_CUSTOMER_PAGES);
}

export type CustomersParams = { q: string; pages: number };

/** Paramètres de E12 (`q`, `pages`) : saisie rognée et plafonnée, pages bornées. */
export function parseCustomersParams(params: { q?: string | null; pages?: string | null }): CustomersParams {
  return { q: (params.q ?? "").trim().slice(0, SEARCH_MAX), pages: parsePages(params.pages) };
}

export type CustomerListRowDTO = {
  id: string;
  fullName: string;
  /** Section A–Z : initiale sans accent (« Élise » sous « E »), « # » pour le reste. */
  letter: string;
  /** « 06 12 34 56 78 », « @fares.b », ou null. */
  contact: string | null;
  /** À encaisser de la fiche (`aEncaisserParClient`), null s'il est nul. */
  due: MoneyString | null;
};

export type CustomersListDTO = CustomersParams & {
  rows: CustomerListRowDTO[];
  /** Fiches qui correspondent à la recherche (toutes, pas la page) : « 124 clients ». */
  total: number;
  /** Fiches en base, recherche ignorée : distingue le vide de départ du vide de filtre. */
  all: number;
  hasMore: boolean;
};

/** Une ligne de l'historique de E14 : toutes les opérations du client, annulées comprises. */
export type CustomerHistoryRowDTO = {
  id: string;
  origin: DocumentOrigin;
  status: DocumentStatus;
  /** ISO 8601. */
  orderedAt: string;
  /** Σ quantités (« 2 articles »). */
  itemCount: number;
  total: MoneyString;
  /** Dû d'un document ENGAGÉ (confirmé ou livré) ; null sinon — jamais « À encaisser » sur une annulée (01 §4.10). */
  due: MoneyString | null;
};

/** « Achète souvent » : un parfum du catalogue, nombre d'achats et contenance du dernier. */
export type FrequentPerfumeDTO = {
  perfumeId: number;
  name: string;
  brandName: string;
  /** Documents non annulés qui le contiennent. */
  times: number;
  /** Contenance de son dernier achat (null : reprise sans contenance). */
  volumeMl: number | null;
};

export type CustomerSheetDTO = {
  customer: CustomerSummary;
  /** ISO 8601 : création de la fiche, ou premier document s'il est plus ancien (fiches reprises). */
  since: string;
  /** Documents non annulés (tuile « Documents »). */
  documentCount: number;
  /** Tous les documents, annulés compris (historique). */
  historyCount: number;
  /** ISO 8601 du dernier document non annulé, ou null. */
  lastPurchaseAt: string | null;
  /** Commandes en attente ou confirmées : garde de suppression (`customerDeletionBlock`). */
  openOrders: number;
  history: { rows: CustomerHistoryRowDTO[]; pages: number; hasMore: boolean };
  /** Les 3 parfums les plus achetés (« Achète souvent »). */
  frequent: FrequentPerfumeDTO[];
  /** Les 5 derniers documents non annulés : le récap partageable sans créance (S09). */
  recap: CustomerHistoryRowDTO[];
};

/** E20 : les fiches existantes, pour l'alerte d'homonyme et le numéro déjà pris AVANT d'enregistrer. */
export type CustomerDirectoryEntry = { id: string; fullName: string; phoneE164: string | null; whatsappE164: string | null };
