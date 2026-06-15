/**
 * Nuréa admin design tokens.
 *
 * Source de vérité unique pour typographie / espacement / couleurs / radius / motion.
 * Utilisé par :
 *   - composants `src/ui/primitives/*` (consomment via objet TS).
 *   - `src/design/globals.admin.css` (vars CSS dérivées).
 *   - `tailwind.config.ts` (extends).
 *
 * Mobile-first PWA iOS. Pas de breakpoints — tout est calibré pour 320–430px.
 */

// ─── Couleurs ──────────────────────────────────────────────────────────

export const colors = {
  bg: "#F2F2F7",                      // iOS gray
  surface: "#FFFFFF",
  surfaceAlt: "#F9F8F6",
  surfaceMuted: "#EFEAE4",
  border: "rgba(0, 0, 0, 0.08)",
  borderStrong: "rgba(0, 0, 0, 0.14)",
  text: "#111114",
  textMuted: "#5F5862",
  textSubtle: "#8A828E",
  accent: "#7B0B1D",
  accentHover: "#8F1428",
  accentBg: "rgba(123, 11, 29, 0.08)",
  accentRing: "rgba(123, 11, 29, 0.30)",
  success: "#1E7D45",
  successBg: "rgba(30, 125, 69, 0.10)",
  warning: "#A35B12",
  warningBg: "rgba(163, 91, 18, 0.10)",
  danger: "#B72938",
  dangerBg: "rgba(183, 41, 56, 0.10)",
  info: "#3E5A7A",
  infoBg: "rgba(62, 90, 122, 0.10)",
} as const;

export type ColorToken = keyof typeof colors;

// ─── Typographie (semantic variants) ───────────────────────────────────

type TypographyVariant = {
  size: string;        // px en string pour ne pas multiplier les unités
  weight: number;
  lineHeight: number;
  tracking: string;
};

export const typography = {
  display: { size: "32px", weight: 700, lineHeight: 1.1, tracking: "-0.02em" },
  h1: { size: "28px", weight: 700, lineHeight: 1.15, tracking: "-0.01em" },
  h2: { size: "20px", weight: 600, lineHeight: 1.25, tracking: "0" },
  h3: { size: "16px", weight: 600, lineHeight: 1.3, tracking: "0" },
  body: { size: "15px", weight: 400, lineHeight: 1.4, tracking: "0" },
  bodyEm: { size: "15px", weight: 600, lineHeight: 1.4, tracking: "0" },
  caption: { size: "13px", weight: 400, lineHeight: 1.4, tracking: "0" },
  micro: { size: "11px", weight: 500, lineHeight: 1.3, tracking: "0.04em" },
} as const satisfies Record<string, TypographyVariant>;

export type TypographyVariantName = keyof typeof typography;

/** Stack iOS-native. Pas de Playfair ni Inter custom. */
export const fontFamily = {
  sans: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", system-ui, -apple-system-body, sans-serif`,
} as const;

// ─── Espacement (grille 4px) ───────────────────────────────────────────

export const space = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
} as const;

export type SpaceToken = keyof typeof space;

// ─── Radius ────────────────────────────────────────────────────────────

export const radius = {
  xs: "6px",
  sm: "8px",
  md: "10px",
  lg: "14px",
  xl: "18px",
  "2xl": "22px",
  full: "9999px",
} as const;

export type RadiusToken = keyof typeof radius;

// ─── Touch targets ─────────────────────────────────────────────────────

export const touchTarget = {
  min: "44px",          // iOS HIG minimum
  comfortable: "48px",
  large: "52px",        // CTA primaires
} as const;

// ─── Motion ────────────────────────────────────────────────────────────

export const motion = {
  durationFast: "100ms",
  durationDefault: "200ms",
  durationSlow: "260ms",
  easingDefault: "cubic-bezier(0.16, 1, 0.3, 1)",     // ease-out-expo
  easingSheet: "cubic-bezier(0.32, 0.72, 0, 1)",       // iOS spring-like
  pressScale: "0.97",
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────

export const shadow = {
  sm: "0 1px 2px rgba(26, 18, 21, 0.04), 0 1px 3px rgba(139, 58, 58, 0.03)",
  md: "0 4px 12px rgba(26, 18, 21, 0.06), 0 2px 4px rgba(139, 58, 58, 0.04)",
  lg: "0 12px 32px rgba(26, 18, 21, 0.08), 0 4px 8px rgba(139, 58, 58, 0.05)",
  xl: "0 24px 60px rgba(26, 18, 21, 0.12), 0 8px 16px rgba(139, 58, 58, 0.06)",
} as const;

// ─── Layout ───────────────────────────────────────────────────────────

export const layout = {
  /** Largeur max app PWA iOS (iPhone 14 Pro Max width). */
  appMaxWidth: "430px",
  /** Hauteur de la tab bar (sans safe-area). */
  tabBarHeight: "64px",
  /** Padding scroll-bottom pour ne pas masquer derrière la tab bar. */
  scrollBottomPad:
    "calc(64px + max(constant(safe-area-inset-bottom), env(safe-area-inset-bottom, 0px)) + 16px)",
  /** Hauteur header sticky. */
  headerHeight: "56px",
} as const;

// ─── Z-index registry ─────────────────────────────────────────────────

export const zIndex = {
  base: 0,
  appHeader: 40,
  tabBar: 50,
  fab: 55,
  sheetBackdrop: 70,
  sheet: 71,
  modalBackdrop: 80,
  modal: 81,
  commandPalette: 90,
  toast: 95,
} as const;

// ─── Export consolidé ─────────────────────────────────────────────────

export const tokens = {
  colors,
  typography,
  fontFamily,
  space,
  radius,
  touchTarget,
  motion,
  shadow,
  layout,
  zIndex,
} as const;

export type Tokens = typeof tokens;
