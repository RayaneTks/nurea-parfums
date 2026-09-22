/**
 * Contrat des réglages (04 §3.4 ; 02 §5 N2, N3 ; écran E08). Une seule ligne `Setting` : préférences de
 * saisie, jamais source d'un chiffre (03 §4.6).
 */
import { z } from "zod";
import "./zod-fr";
import { parseRateInput, toDb } from "@/domain/money";
import { recordId } from "./treasury";

export const RATE_MESSAGE = "Saisis un taux supérieur à 0 (ex. 277).";

/**
 * Taux DZD pour 1 € proposé sur une ligne sans mémoire de prix (N3), poche proposée partout (N2).
 * Un champ absent n'est pas touché ; `defaultPocketId: null` (ou la poche « Non attribué ») : plus de poche
 * par défaut, « Non attribué » est proposée.
 */
export const updateSettingsInput = z
  .object({
    defaultExchangeRate: z
      .string()
      .optional()
      .transform((text, ctx) => {
        if (text === undefined) return undefined;
        const rate = parseRateInput(text);
        if (rate === null) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: RATE_MESSAGE });
          return z.NEVER;
        }
        return toDb(rate);
      }),
    defaultPocketId: recordId.nullable().optional(),
  })
  .refine((input) => input.defaultExchangeRate !== undefined || input.defaultPocketId !== undefined, {
    message: "Aucune modification à enregistrer.",
  });

export type UpdateSettingsInput = z.input<typeof updateSettingsInput>;
export type UpdateSettingsData = z.output<typeof updateSettingsInput>;

export type SettingsSummary = {
  /** Chaîne décimale exacte (« 277.00 », « 245.5 »), jamais un nombre flottant. */
  defaultExchangeRate: string;
  /** `null` : « Non attribué » est proposée. */
  defaultPocketId: string | null;
};
