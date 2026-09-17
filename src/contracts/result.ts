/**
 * Le format unique de réponse d'une action et d'une route GET de la gestion (04 §9.1).
 * `useAction` en déduit le comportement de l'écran (04 §3.7, §9.2) ; aucun appelant ne
 * relit un message d'erreur pour décider quoi faire : il lit `code`.
 */

export type ActionErrorCode =
  | "VALIDATION" // saisie invalide (zod ou règle de champ)
  | "NEEDS_CONFIRMATION" // réserve du domaine non confirmée
  | "NOT_FOUND" // l'entité n'existe plus
  | "CONFLICT" // une règle métier refuse, ou l'état a changé entre-temps
  | "SESSION_EXPIRED"
  | "OFFLINE" // produit côté client seulement : l'appel n'a pas atteint le serveur
  | "UNAVAILABLE" // base injoignable, délai dépassé, verrou non obtenu
  | "UNEXPECTED"; // erreur de programmation

export type ActionError = {
  code: ActionErrorCode;
  /** Phrase française complète : ce qui se passe + ce qu'on peut faire. */
  message: string;
  /** VALIDATION : message par chemin de champ ("lines.0.unitPriceEur"). */
  fields?: Record<string, string>;
  /** NEEDS_CONFIRMATION : ce que ConfirmDialog affiche. */
  confirm?: { title: string; reserves: string[]; confirmLabel: string };
  /** UNEXPECTED : référence courte, retrouvable dans les journaux. */
  reference?: string;
  retryable: boolean;
};

export type ActionResult<T> =
  | { ok: true; data: T; notice?: string }
  | { ok: false; error: ActionError };
