import type { ActionError } from "@/contracts/result";

/**
 * Erreurs produites côté client, quand l'appel d'action n'a pas abouti au serveur (04 §9.2).
 * Même forme que celles du serveur : l'écran lit `code`, jamais le texte.
 */

export const OFFLINE_MESSAGE = "Pas de réseau. Ta saisie est gardée — réessaie quand ça capte.";
export const OUTDATED_MESSAGE = "L'app a été mise à jour : recharge la page, ta saisie est gardée.";
export const UNEXPECTED_CLIENT_MESSAGE = "Une erreur imprévue a bloqué l'enregistrement. Rien n'a été modifié.";

/**
 * Une exception levée par l'appel lui-même (et non un `ActionResult`) : réseau coupé, déploiement
 * plus récent que l'écran, ou défaut imprévu.
 */
export function clientActionError(cause: unknown, options: { online: boolean; outdated: boolean }): ActionError {
  if (options.outdated) return { code: "UNAVAILABLE", message: OUTDATED_MESSAGE, retryable: false };
  const isFetchFailure = cause instanceof TypeError || !options.online;
  if (isFetchFailure) return { code: "OFFLINE", message: OFFLINE_MESSAGE, retryable: true };
  return { code: "UNEXPECTED", message: UNEXPECTED_CLIENT_MESSAGE, retryable: false };
}

/** Texte d'un dialogue de réserves (`NEEDS_CONFIRMATION`) : les réserves du domaine, jamais recopiées. */
export function reservesText(error: ActionError): string {
  return (error.confirm?.reserves ?? []).join(" ");
}
