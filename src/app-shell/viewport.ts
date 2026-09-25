/**
 * Calcul du service viewport (05 §2.8), sans DOM : testé seul.
 *
 * iOS ne rétrécit pas le viewport de mise en page quand le clavier monte : seul `visualViewport`
 * le voit. On en tire la hauteur réellement visible (`--admin-vh`), la part masquée par le clavier
 * (`--admin-keyboard-inset`) et le décalage vertical du viewport visuel (`--admin-vv-offset`).
 */

export type ViewportSample = {
  /** `window.innerHeight` : viewport de mise en page. */
  innerHeight: number;
  /** `visualViewport.height`, `null` si l'API manque. */
  visualHeight: number | null;
  /** `visualViewport.offsetTop`. */
  offsetTop: number;
  /** `visualViewport.scale` : au-delà de 1, l'utilisateur zoome. */
  scale: number;
  /**
   * Un champ de saisie a le focus. Sans lui, pas de clavier : iOS (PWA surtout) rapporte parfois un
   * viewport visuel plus court que la fenêtre sans aucun clavier à l'écran — après une fermeture de
   * clavier, au retour d'arrière-plan. Pris pour un clavier, cet écart remontait le pied des sheets
   * d'environ 300 px et écrasait leur contenu dans une bande qu'il fallait faire défiler.
   */
  editing: boolean;
};

export type ViewportVars = { vh: number; keyboardInset: number; offsetTop: number };

/** Nom des variables : ceux de `runtimeVariables` (`src/design/tokens.ts`). */
export const VIEWPORT_VARIABLES = {
  vh: "--admin-vh",
  keyboardInset: "--admin-keyboard-inset",
  offsetTop: "--admin-vv-offset",
} as const;

/**
 * Un zoom au pincement rétrécit aussi le viewport visuel : ce n'est pas un clavier. Pendant le
 * zoom, les dernières valeurs sont gardées — sinon CTA et sheets bondiraient au-dessus d'un
 * clavier imaginaire.
 */
export function computeViewport(sample: ViewportSample, previous: ViewportVars | null): ViewportVars {
  if (sample.visualHeight === null) {
    return { vh: Math.round(sample.innerHeight), keyboardInset: 0, offsetTop: 0 };
  }
  if (sample.scale > 1.01 && previous) return previous;
  if (!sample.editing) return { vh: Math.round(sample.visualHeight), keyboardInset: 0, offsetTop: 0 };
  const inset = sample.innerHeight - sample.visualHeight - sample.offsetTop;
  return {
    vh: Math.round(sample.visualHeight),
    keyboardInset: Math.max(0, Math.round(inset)),
    offsetTop: Math.max(0, Math.round(sample.offsetTop)),
  };
}

/** Élément qui fait monter le clavier virtuel : champ texte, zone de texte, contenu éditable. */
export function isEditable(element: Element | null): boolean {
  if (!element) return false;
  if (element instanceof HTMLTextAreaElement) return !element.readOnly;
  if (element instanceof HTMLInputElement) {
    const noKeyboard = ["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"];
    return !element.readOnly && !noKeyboard.includes(element.type);
  }
  return element instanceof HTMLElement && element.isContentEditable;
}

export function sameViewport(a: ViewportVars | null, b: ViewportVars): boolean {
  return a !== null && a.vh === b.vh && a.keyboardInset === b.keyboardInset && a.offsetTop === b.offsetTop;
}
