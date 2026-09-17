/**
 * Contrat entre le banc des couches (`couches.tsx`, exécuté dans la page) et sa spec
 * (`e2e/parcours/couches.spec.ts`, exécutée par Playwright) : noms de scènes, variable globale et
 * textes attendus. Module pur, importé des deux côtés.
 */

/** Variable globale posée par le banc : `window[BANC_GLOBAL].mount(scène)`. */
export const BANC_GLOBAL = "__nureaBancCouches";

export const SCENES = ["toast-sous-sheet", "confirmation-en-echec"] as const;
export type Scene = (typeof SCENES)[number];

/** Filet « Annuler » déclenché depuis la sheet ouverte. */
export const TOAST_MESSAGE = "Ligne supprimée";

/** Refus de la première tentative d'écriture confirmée (message français, comme `useAction`). */
export const ECHEC_CONFIRMATION = "Pas de réseau. Ta saisie est gardée — réessaie quand ça capte.";

/** Durée simulée de l'écriture : le bouton en attente doit se voir. */
export const ECRITURE_MS = 400;
