/**
 * Messages de validation zod en français, installés globalement à l'import.
 *
 * Tout contrat de `src/contracts` importe ce module : le formulaire (validation immédiate) et
 * l'action (validation d'autorité, `defineAction`) lisent donc les mêmes phrases sans avoir à
 * passer une option à chaque `safeParse`. Un message écrit dans le schéma (`.min(1, "…")`)
 * reste prioritaire : cette carte ne sert que de repli, d'où des phrases génériques mais
 * toujours actionnables — tutoiement, geste à faire, jamais de terme technique (04 §9.4).
 */
import { z } from "zod";

const plural = (n: number | bigint, one: string, many: string) => (Number(n) > 1 ? many : one);
const num = (n: number | bigint) => String(n).replace(".", ",");

export const frenchErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === "undefined" || issue.received === "null") return { message: "Remplis ce champ." };
      switch (issue.expected) {
        case "number":
        case "integer":
        case "float":
        case "bigint":
          return { message: "Saisis un nombre." };
        case "string":
          return { message: "Saisis un texte." };
        case "date":
          return { message: "Choisis une date." };
        case "boolean":
          return { message: "Coche ou décoche cette case." };
        default:
          return { message: "Cette valeur n'a pas le format attendu : recharge la page et réessaie." };
      }

    case z.ZodIssueCode.too_small: {
      const n = issue.minimum;
      switch (issue.type) {
        case "string":
          if (issue.exact) return { message: `Saisis exactement ${num(n)} ${plural(n, "caractère", "caractères")}.` };
          return Number(n) <= 1
            ? { message: "Remplis ce champ." }
            : { message: `Saisis au moins ${num(n)} caractères.` };
        case "number":
        case "bigint":
          return {
            message: issue.inclusive
              ? `Indique un nombre supérieur ou égal à ${num(n)}.`
              : `Indique un nombre supérieur à ${num(n)}.`,
          };
        case "array":
        case "set":
          return {
            message: Number(n) <= 1 ? "Ajoute au moins un élément." : `Ajoute au moins ${num(n)} éléments.`,
          };
        case "date":
          return { message: "Choisis une date plus récente." };
        default:
          return { message: ctx.defaultError };
      }
    }

    case z.ZodIssueCode.too_big: {
      const n = issue.maximum;
      switch (issue.type) {
        case "string":
          if (issue.exact) return { message: `Saisis exactement ${num(n)} ${plural(n, "caractère", "caractères")}.` };
          return { message: `Raccourcis ce texte : ${num(n)} ${plural(n, "caractère", "caractères")} au plus.` };
        case "number":
        case "bigint":
          return {
            message: issue.inclusive
              ? `Indique un nombre inférieur ou égal à ${num(n)}.`
              : `Indique un nombre inférieur à ${num(n)}.`,
          };
        case "array":
        case "set":
          return { message: `Garde au plus ${num(n)} ${plural(n, "élément", "éléments")}.` };
        case "date":
          return { message: "Choisis une date moins lointaine." };
        default:
          return { message: ctx.defaultError };
      }
    }

    case z.ZodIssueCode.invalid_string:
      if (issue.validation === "email") return { message: "Saisis une adresse e-mail complète (nom@exemple.fr)." };
      if (issue.validation === "url") return { message: "Saisis une adresse web complète (https://…)." };
      if (issue.validation === "datetime" || issue.validation === "date" || issue.validation === "time") {
        return { message: "Choisis une date valide." };
      }
      return { message: "Vérifie le format de ce champ." };

    case z.ZodIssueCode.invalid_enum_value:
    case z.ZodIssueCode.invalid_literal:
    case z.ZodIssueCode.invalid_union_discriminator:
      return { message: "Choisis une des options proposées." };

    case z.ZodIssueCode.invalid_union:
      return { message: "Vérifie ce champ : sa valeur n'est pas acceptée." };

    case z.ZodIssueCode.invalid_date:
      return { message: "Choisis une date valide." };

    case z.ZodIssueCode.not_multiple_of:
      return { message: `Indique un multiple de ${num(issue.multipleOf)}.` };

    case z.ZodIssueCode.not_finite:
      return { message: "Saisis un nombre." };

    case z.ZodIssueCode.unrecognized_keys:
    case z.ZodIssueCode.invalid_arguments:
    case z.ZodIssueCode.invalid_return_type:
    case z.ZodIssueCode.invalid_intersection_types:
      // Erreurs de programmation (écran et serveur désaccordés, souvent après un déploiement).
      return { message: "Cet écran n'est plus à jour : recharge la page et réessaie." };

    case z.ZodIssueCode.custom:
      return { message: "Vérifie ce champ." };

    default: {
      const _exhaustive: never = issue;
      void _exhaustive;
      return { message: ctx.defaultError };
    }
  }
};

z.setErrorMap(frenchErrorMap);

/**
 * Un message par champ, le premier rencontré, indexé par chemin (« lines.0.unitPriceEur ») :
 * la forme de `ActionError.fields`. Une erreur sans chemin (règle du formulaire entier) est
 * rangée sous la clé "".
 */
export function fieldMessages(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    fields[key] ??= issue.message;
  }
  return fields;
}
