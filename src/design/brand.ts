/**
 * Charte graphique Nuréa Parfums — v3.
 *
 * Source unique des valeurs de marque pour la **vitrine**. Les composants ne
 * lisent jamais ce module : ils passent par les variables CSS `--nurea-*`
 * déclarées dans `app/globals.css`.
 *
 * Ce module existe pour les contextes qui ne peuvent pas lire de CSS :
 * `next/og` (image OpenGraph), le manifeste PWA, `viewport.themeColor`.
 * Toute modification ici doit être reportée dans `app/globals.css`.
 *
 * Le registre gestion a sa propre source : `src/design/tokens.ts`.
 */

/** Les quatre couleurs de la marque. Répartition visée : 74/18/6/2. */
export const BRAND_COLORS = {
  /** Fond de tout. Encre packaging. */
  noir: "#0A0508",
  /** Texte sur noir. Papier des cartes. */
  ivoire: "#FDF8F4",
  /** Accent, filets, gaufrage. Au plus 8 % d'un visuel. */
  cuivre: "#C4956A",
  /** Sceau, cachet. Un seul aplat par support. */
  bordeaux: "#7B0B1D",
} as const;

/**
 * Teintes de support — écran uniquement, hors marque.
 * `alerte` ne sert qu'aux erreurs : ce n'est pas une couleur d'accent.
 */
export const SCREEN_TINTS = {
  dark: {
    surface: "#140E12",
    surfaceHover: "#1C1418",
    /** Texte secondaire — 14,0:1 sur noir. */
    texte2: "#E4D2DA",
    /** Texte tertiaire, légendes — 8,2:1 sur noir. */
    texte3: "#B49FAB",
    /** Épuisé, désactivé. */
    inactif: "#6E5A64",
    /** Alerte — 7,1:1 sur noir. */
    alerte: "#D88080",
  },
  /**
   * Mode clair — hors charte, dérivé.
   *
   * La charte ne décrit qu'une palette sombre ; ces valeurs prolongent ses deux
   * seuls usages sur ivoire (le bordeaux et le gris de la carte de main), en
   * conservant ses paliers de contraste (≥ 7:1 pour tout texte courant).
   * Le cuivre y tombe à 2,5:1 : il n'y porte jamais de texte, seulement des
   * filets et des aplats.
   */
  light: {
    surface: "#F6EEE8",
    surfaceHover: "#EDE2D9",
    /** 11,4:1 sur ivoire. */
    texte2: "#3D343A",
    /** 7,7:1 sur ivoire, 7,1:1 sur surface. */
    texte3: "#544D58",
    inactif: "#8C8391",
    /** 8,0:1 sur ivoire. */
    alerte: "#9B1020",
  },
} as const;

/**
 * Deux familles à faible contraste, chargées depuis Google Fonts dans
 * `app/(shop)/layout.tsx`. Aucun délié fin : elles restent nettes à 12 px.
 */
export const BRAND_FONTS = {
  /** Titres et noms de parfum. Graisses 400 et 500, jamais plus. */
  serif: "Newsreader",
  /** Texte et interface. Graisses 400, 500, 600, jamais sous 400. */
  sans: "Instrument Sans",
} as const;

/** Échelle d'espacement, base 4 px. Aucune valeur hors échelle. */
export const SPACING = {
  /** Dans un composant. */
  1: 8,
  /** Entre éléments liés. */
  2: 16,
  /** Padding de carte. */
  3: 24,
  /** Entre blocs. */
  4: 40,
  /** Marge de page, entre sections. */
  5: 72,
} as const;

/** Règles de mise en page non négociables. */
export const LAYOUT = {
  /** Marge de page : 72 px, 24 px sur mobile. */
  pageMargin: { mobile: 24, desktop: 72 },
  /** Largeur de texte maximale. */
  proseWidth: 640,
  /** Grille : 12 colonnes, gouttière 24 px. */
  gutter: 24,
  /** Angles : jamais d'arrondi. */
  radius: 0,
  /** Ombres : aucune. La séparation se fait au filet 1 px. */
  shadow: "none",
  /** Sur la couleur uniquement. Jamais de déplacement au survol. */
  transition: "160ms ease-out",
} as const;

/** Couleur peinte par le système derrière la barre d'état (PWA, onglet). */
export const THEME_COLOR = BRAND_COLORS.noir;
