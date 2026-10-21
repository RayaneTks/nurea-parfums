/**
 * Vitrine Nuréa Parfums — DA « Nuancier nocturne » (20/10/2026).
 *
 * Les composants ne lisent jamais ce module : ils passent par les jetons CSS de
 * `app/globals.css` (écrits en `oklch()`). Ce module en garde les hex, calculés
 * (OKLCH → sRGB, D65), pour les contextes qui ne lisent pas de CSS : `next/og`,
 * le manifeste PWA, `viewport.themeColor`. Toute modification ici est reportée
 * dans `app/globals.css`, et inversement. Référence : `DESIGN.md`.
 *
 * Le registre gestion a sa propre source : `src/design/tokens.ts`.
 */

type ThemeTokens = {
  readonly bg: string;
  readonly surface1: string;
  readonly surface2: string;
  readonly line: string;
  readonly text1: string;
  readonly text2: string;
  readonly text3: string;
  readonly error: string;
  /** Couleur de marque (monogramme) : doré en sombre, bordeaux en clair. */
  readonly accent: string;
};

/**
 * Les jetons sémantiques des deux thèmes. Aucune autre couleur n'existe dans la vitrine, hormis l'ambiance
 * de chaque parfum (calculée). `accent` : la couleur de marque Nuréa — doré en sombre, bordeaux en clair.
 */
export const VITRINE_THEMES: { readonly dark: ThemeTokens; readonly light: ThemeTokens } = {
  dark: {
    bg: "#150A0A",
    surface1: "#201515",
    surface2: "#2C2120",
    line: "#403534",
    text1: "#F5EDE3",
    text2: "#C1B5A9",
    text3: "#9D9083",
    error: "#F28788",
    accent: "#C4956A",
  },
  light: {
    bg: "#FCF6EE",
    surface1: "#F3ECE3",
    surface2: "#E9E0D6",
    line: "#D3C8BF",
    text1: "#251616",
    text2: "#5D4746",
    text3: "#6E5757",
    error: "#AC2F3B",
    accent: "#8B3A3A",
  },
};

/** Couleur peinte par le système derrière la barre d'état, selon le thème. */
export const THEME_COLOR = {
  dark: VITRINE_THEMES.dark.bg,
  light: VITRINE_THEMES.light.bg,
} as const;
