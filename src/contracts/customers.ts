/**
 * Contrat des fiches client (04 §3.4, 02 §4.10 ; écrans E14, E20, S10).
 *
 * Le téléphone et le WhatsApp se saisissent comme on les écrit en France et sont stockés en E.164
 * (`src/domain/phone.ts`) : « 06 12 34 56 78 » est accepté, « +33612345678 » n'est plus exigé.
 */
import { z } from "zod";
import "./zod-fr";
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
