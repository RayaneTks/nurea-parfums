import { DRAFT_KEYS, readDraft, type StorageLike } from "../hooks/draft-store";

/**
 * « Jamais pendant une saisie » (04 §14.3, 07 J16).
 *
 * Une nouvelle version du service worker attend ; le toast « Recharger » ne s'affiche que quand le
 * gérant n'est pas en train d'écrire. Recharger en pleine vente perdrait le geste en cours — et un
 * toast qui recouvre le CTA au moment d'encaisser est déjà une gêne, même sans toucher « Recharger ».
 *
 * Trois signes, dans l'ordre du coût de l'interruption :
 *  1. un **brouillon** du composeur en cours (une vente commencée, 04 §3.7) ;
 *  2. un **champ focalisé** (input, textarea, select, `contenteditable`) ;
 *  3. une **sheet ouverte** (vaul, dialogue Radix, palette de commandes).
 *
 * Fonction pure, éprouvée par `__tests__/quiet.test.ts` : le registrar ne fait que l'appeler.
 */

const FIELD_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** Sélecteurs des couches qui portent une saisie ou un choix en cours. */
const OPEN_LAYERS = [
  '[data-vaul-drawer][data-state="open"]',
  '[role="dialog"][data-state="open"]',
  "[data-command-palette]",
  "[data-media-viewer]",
].join(", ");

export function fieldIsFocused(doc: Pick<Document, "activeElement">): boolean {
  const active = doc.activeElement;
  if (!active) return false;
  const element = active as HTMLElement;
  if (FIELD_TAGS.has(element.tagName)) return true;
  return element.isContentEditable === true;
}

export function layerIsOpen(doc: Pick<Document, "querySelector">): boolean {
  return doc.querySelector(OPEN_LAYERS) !== null;
}

export function draftInProgress(storage: StorageLike | null, now: number = Date.now()): boolean {
  if (!storage) return false;
  return readDraft(storage, DRAFT_KEYS.vendre, now) !== null;
}

/** Vrai quand l'écran est calme : aucun brouillon, aucun champ focalisé, aucune couche ouverte. */
export function screenIsQuiet(
  doc: Pick<Document, "activeElement" | "querySelector">,
  storage: StorageLike | null,
  now: number = Date.now(),
): boolean {
  return !draftInProgress(storage, now) && !fieldIsFocused(doc) && !layerIsOpen(doc);
}
