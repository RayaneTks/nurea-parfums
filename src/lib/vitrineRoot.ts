/**
 * Bloc racine de la vitrine (`app/(shop)/layout.tsx`). Il porte les variables de police
 * (`brandFontClassName`) : un élément rendu hors de lui — portail vers `document.body` — retombe sur
 * la police par défaut du navigateur (Times). Feuilles, tiroirs et fiches s'ouvrent donc ici.
 */
export const VITRINE_ROOT_ID = "vitrine";

export function vitrineRoot(): HTMLElement {
  return document.getElementById(VITRINE_ROOT_ID) ?? document.body;
}
