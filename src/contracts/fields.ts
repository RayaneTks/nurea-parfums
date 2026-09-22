/**
 * Champs partagés par les contrats de la gestion : identifiants, textes libres, dates.
 * Mêmes règles pour le formulaire (validation immédiate) et l'action (validation d'autorité).
 */
import { z } from "zod";
import "./zod-fr";
import { isTextId } from "@/domain/ids";

/** Un identifiant qui n'a pas la forme attendue vient d'un écran périmé ou d'une URL fabriquée. */
export const STALE_ID_MESSAGE = "Cet élément n'est plus reconnu : recharge la page et réessaie.";

/** cuid (créations serveur, reprise) ou UUID v4 en minuscules (créations idempotentes, 04 §3.6). */
export const entityId = z.string().refine(isTextId, STALE_ID_MESSAGE);

/**
 * Texte libre facultatif : rogné, vide → `null`. `undefined` reste `undefined` : dans une
 * modification, un champ absent n'est pas touché, un champ vidé est effacé.
 */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Raccourcis ce texte : ${max} caractères au plus.`)
    .nullable()
    .optional()
    .transform((value) => (value === "" ? null : value));
}

/**
 * Date facultative, en `Date` ou en chaîne ISO (« 2026-09-18 », « 2026-09-18T14:30:00+02:00 ») ;
 * chaîne vide → `null`, `undefined` conservé comme pour `optionalText`.
 */
export const optionalDate = z
  .union([z.string(), z.date()])
  .nullable()
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value === null) return value;
    if (typeof value === "string" && value.trim() === "") return null;
    const date = typeof value === "string" ? new Date(value.trim()) : value;
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choisis une date valide." });
      return z.NEVER;
    }
    return date;
  });

/** Réserve confirmée : l'écran rappelle l'action avec `confirm: true` et le même identifiant (04 §3.7). */
export const confirmFlag = z.boolean().optional().default(false);
