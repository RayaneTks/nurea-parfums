/**
 * Nuréa Gestion — jetons de design. SOURCE UNIQUE (docs/refonte/05-DESIGN-SYSTEM.md §2).
 *
 * Toute valeur existe ici d'abord. `src/design/globals.admin.css` ne fait que
 * l'exposer en `--admin-*`, et `tests/architecture/tokens-sync.test.ts` échoue
 * dès qu'une variable diverge, manque ou n'a pas de jeton.
 *
 * Pourquoi un test et pas une égalité supposée : l'ancienne feuille avait
 * corrigé `--admin-text-subtle` pour le contraste sans que ce fichier suive.
 * Deux sources de vérité divergent toujours ; une seule, vérifiée, ne peut pas.
 *
 * Les composants ne lisent pas ces objets pour peindre : ils consomment les
 * variables CSS (`bg-[var(--admin-accent)]`, `.admin-type-caption`…). Aucune
 * couleur, aucun rayon, aucune durée, aucun z-index écrit en dur ailleurs.
 *
 * Registre `product`, light uniquement, rail 430 px, pas de breakpoints.
 */

// ─── Couleurs (05 §2.1) ────────────────────────────────────────────────────

export const colors = {
  /** Fond app — gris système iOS. */
  bg: "#F2F2F7",
  /** Cartes, sheets, champs. */
  surface: "#FFFFFF",
  /** Zones secondaires. */
  surfaceAlt: "#F9F8F6",
  /** Fonds atténués : segmented control, icône d'EmptyState, pastille d'Avatar. */
  surfaceMuted: "#EFEAE4",
  /** Survol desktop (souris uniquement). */
  surfaceHover: "#E9E2DA",
  /** Séparateurs, filets. */
  border: "rgba(0, 0, 0, 0.08)",
  /** Bordures de champs et boutons secondaires, poignée de sheet. */
  borderStrong: "rgba(0, 0, 0, 0.14)",
  /** Bordure de champ au survol desktop. */
  borderHover: "color-mix(in srgb, var(--admin-text) 16%, transparent)",
  text: "#111114",
  textMuted: "#5F5862",
  /**
   * Hints, placeholders, et SURTOUT les libellés de chiffres en capitales de
   * 11 px (« ENCAISSÉ », « À ENCAISSER »). #726B75 : 4,62:1 sur le fond de page,
   * 5,15:1 sur une carte. L'ancien #8A828E plafonnait à 3,32:1, illisible dehors.
   */
  textSubtle: "#726B75",
  /** Bordeaux — LE seul accent : actions, état actif, focus. */
  accent: "#7B0B1D",
  accentHover: "#8F1428",
  accentBg: "rgba(123, 11, 29, 0.08)",
  accentSubtle: "rgba(123, 11, 29, 0.12)",
  accentRing: "rgba(123, 11, 29, 0.30)",
  /**
   * Texte et icône posés sur un aplat plein (accent, danger, success, warning).
   * Remplace les `text-white` en dur ; contraste ≥ 5:1 sur chacun des quatre.
   */
  onAccent: "#FFFFFF",
  /** L'accompli : payé, soldé, livré. Jamais pour décorer. */
  success: "#1E7D45",
  successBg: "rgba(30, 125, 69, 0.10)",
  successSubtle: "rgba(47, 122, 80, 0.10)",
  successBorder: "rgba(47, 122, 80, 0.22)",
  /** L'attente et le retard rattrapable. SEUL ton d'un montant non reçu. */
  warning: "#A35B12",
  warningBg: "rgba(163, 91, 18, 0.10)",
  warningSubtle: "rgba(160, 102, 46, 0.10)",
  warningBorder: "rgba(160, 102, 46, 0.22)",
  /** L'anomalie et l'irréversible : erreur, suppression, créance > 30 j. */
  danger: "#B72938",
  dangerBg: "rgba(183, 41, 56, 0.10)",
  dangerSubtle: "rgba(176, 58, 62, 0.08)",
  dangerBorder: "rgba(176, 58, 62, 0.24)",
  /** Le contexte neutre, rare. */
  info: "#3E5A7A",
  infoBg: "rgba(62, 90, 122, 0.10)",
  infoSubtle: "rgba(62, 90, 122, 0.08)",
  infoBorder: "rgba(62, 90, 122, 0.22)",
  /** Backdrop des sheets et des dialogues. */
  overlay: "rgba(26, 18, 21, 0.38)",
} as const;

export type ColorToken = keyof typeof colors;

// ─── Typographie (05 §2.2) ─────────────────────────────────────────────────

type TypographyRole = {
  size: string;
  weight: number;
  lineHeight: number;
  tracking: string;
};

/**
 * Un rôle par usage — jamais de taille arbitraire dans un composant.
 * Chaque rôle a sa classe `.admin-type-<rôle>` dans la feuille admin.
 */
export const typography = {
  /** Montant dominant d'un écran (Encaissé du dashboard) — un par écran au plus. */
  display: { size: "32px", weight: 700, lineHeight: 1.1, tracking: "-0.02em" },
  /** Titre de page. */
  h1: { size: "28px", weight: 700, lineHeight: 1.15, tracking: "-0.01em" },
  /** Titre de section, montant d'une tuile KPI. */
  h2: { size: "20px", weight: 600, lineHeight: 1.25, tracking: "0" },
  /** Sous-section, titre de sheet et de dialogue, libellé de CTA `lg`. */
  h3: { size: "16px", weight: 600, lineHeight: 1.3, tracking: "0" },
  /** Texte courant, primary des lignes de liste (500 en liste). */
  body: { size: "15px", weight: 400, lineHeight: 1.4, tracking: "0" },
  /** Emphase inline, montants de ligne. */
  bodyEm: { size: "15px", weight: 600, lineHeight: 1.4, tracking: "0" },
  /** Saisie (input, textarea, select) : 16 px, sous quoi iOS Safari zoome au focus. */
  field: { size: "16px", weight: 400, lineHeight: 1.3, tracking: "0" },
  /** Métadonnées, secondary des lignes, messages sous un champ. */
  caption: { size: "13px", weight: 400, lineHeight: 1.4, tracking: "0" },
  /** Libellés de chiffres en capitales (`text-subtle`), badges. */
  micro: { size: "11px", weight: 500, lineHeight: 1.3, tracking: "0.04em" },
} as const satisfies Record<string, TypographyRole>;

export type TypographyRoleName = keyof typeof typography;

/** Stack SF system. Jamais de Google Fonts côté admin. */
export const fontFamily = {
  sans: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", system-ui, -apple-system-body, sans-serif`,
} as const;

export const fontFeatures = `"ss01", "cv11"` as const;

// ─── Espacement (05 §2.3) — grille 4 px ────────────────────────────────────

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

// ─── Rayons (05 §2.4) ──────────────────────────────────────────────────────

export const radius = {
  /** Micro-éléments rectangulaires (vignette 24 px, case à cocher). */
  xs: "6px",
  /** Champs internes, petites vignettes, segment actif. */
  sm: "8px",
  /** Défaut des contrôles : boutons, chips, steppers, segmented, champs, focus des lignes. */
  md: "12px",
  /** Cartes, CTA `lg`. */
  lg: "14px",
  /** Sheets, dialogues. */
  xl: "18px",
  /** Palette de commandes. */
  "2xl": "22px",
  /** Pills, badges, poignées, avatars, interrupteurs. */
  full: "9999px",
} as const;

export type RadiusToken = keyof typeof radius;

// ─── Ombres (05 §2.5) ──────────────────────────────────────────────────────

export const shadow = {
  /** Cartes, CTA primaire — le défaut, quasi invisible. */
  sm: "0 1px 2px rgba(26, 18, 21, 0.04), 0 1px 3px rgba(139, 58, 58, 0.03)",
  /** Survol desktop, menus, toasts. */
  md: "0 4px 12px rgba(26, 18, 21, 0.06), 0 2px 4px rgba(139, 58, 58, 0.04)",
  /** Sheets. */
  lg: "0 12px 32px rgba(26, 18, 21, 0.08), 0 4px 8px rgba(139, 58, 58, 0.05)",
  /** Palette de commandes, dialogues. */
  xl: "0 24px 60px rgba(26, 18, 21, 0.12), 0 8px 16px rgba(139, 58, 58, 0.06)",
} as const;

// ─── Motion (05 §2.6, règles §4.4) ─────────────────────────────────────────

export const motion = {
  /** Press scale, feedback tactile. */
  durationFast: "100ms",
  /** Transitions de contrôle (couleur, opacité). */
  durationDefault: "200ms",
  /** Entrées / sorties (sheets, menus, dialogues, toasts). */
  durationSlow: "260ms",
  /** Pulse de confirmation après une écriture réussie (haptique visuelle). */
  durationPulse: "450ms",
  /** Cycle du squelette de chargement — seule animation autorisée au-delà de 400 ms. */
  durationSkeleton: "1600ms",
  /** ease-out-expo — tout, par défaut. */
  easingDefault: "cubic-bezier(0.16, 1, 0.3, 1)",
  /** Sheets (ressort iOS). */
  easingSheet: "cubic-bezier(0.32, 0.72, 0, 1)",
  /** Échelle d'appui. */
  pressScale: "0.97",
} as const;

// ─── Cibles tactiles (05 §4.1) ─────────────────────────────────────────────

export const touchTarget = {
  /** HIG iOS — plancher de toute cible. */
  min: "44px",
  comfortable: "48px",
  /** CTA `lg`. */
  large: "52px",
} as const;

// ─── Layout, safe areas, clavier (05 §2.8) ─────────────────────────────────

export const layout = {
  /** Rail : iPhone Pro Max, centré même sur desktop. */
  appMaxWidth: "430px",
  /** Header sticky du shell. */
  headerHeight: "56px",
  /** Tab bar, safe area INCLUSE (border-box) — pas en plus. */
  tabBarHeight: "88px",
  safeAreaBottom: "env(safe-area-inset-bottom, 0px)",
  /**
   * Réserve basse des listes : tab bar + la hauteur d'un CTA collant, pour que
   * le dernier élément ne passe jamais sous l'une ou l'autre.
   */
  scrollBottomPad: "calc(var(--admin-tab-bar-height) + 5rem)",
  /** Padding des barres d'action fixes : clavier compris. */
  stickyCtaPad: "calc(0.75rem + var(--admin-safe-area-bottom) + var(--admin-keyboard-inset, 0px))",
  /**
   * Pied de sheet. L'inset clavier n'y figure PAS : le pied est déjà remonté
   * par une marge basse égale à l'inset — le compter deux fois gonflait le pied
   * de 340 px et écrasait la liste au-dessus. La safe area en est retranchée :
   * clavier ouvert, le home indicator est recouvert.
   */
  sheetFooterPad: "calc(0.75rem + max(0px, var(--admin-safe-area-bottom) - var(--admin-keyboard-inset, 0px)))",
} as const;

/**
 * Variables RUNTIME : un seul écrivain, le service viewport du shell, qui les
 * pose sur `<html>` depuis `visualViewport`. Elles ne sont JAMAIS déclarées
 * dans la feuille : même à `0px`, la déclaration sur `.admin-theme` masquerait
 * la valeur du service pour tous les descendants, et CTA et sheets passeraient
 * sous le clavier iOS. Les lecteurs donnent leur repli : `var(--admin-keyboard-inset, 0px)`.
 */
export const runtimeVariables = ["--admin-vh", "--admin-keyboard-inset", "--admin-vv-offset"] as const;

// ─── Z-index (05 §2.7) ─────────────────────────────────────────────────────

/** Registre unique. Aucun composant n'écrit un z-index littéral. */
export const zIndex = {
  base: 0,
  /** `StickyAction` : au-dessus du contenu qu'il survole dans la zone de scroll. */
  stickyAction: 20,
  /** En-tête collant d'une page (`PageScaffold header`), sous le header du shell. */
  pageHeader: 30,
  appHeader: 40,
  tabBar: 50,
  /** Menu contextuel ancré à la tab bar. */
  tabBarMenu: 52,
  sheetBackdrop: 70,
  sheet: 71,
  /** Dialogues, ConfirmDialog, sheets imbriquées. */
  modalBackdrop: 80,
  modal: 81,
  commandPalette: 90,
  /** Au-dessus de tout, y compris de la tab bar. */
  toast: 95,
} as const;

export type ZIndexToken = keyof typeof zIndex;

// ─── Export consolidé ─────────────────────────────────────────────────────

export const tokens = {
  colors,
  typography,
  fontFamily,
  fontFeatures,
  space,
  radius,
  shadow,
  motion,
  touchTarget,
  layout,
  zIndex,
} as const;

export type Tokens = typeof tokens;

// ─── Exposition CSS ───────────────────────────────────────────────────────

const kebab = (key: string): string => key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/**
 * Nom et valeur de chaque variable `--admin-*` que la feuille DOIT déclarer.
 *
 * C'est la convention de nommage, écrite une fois : `colors.textSubtle` →
 * `--admin-text-subtle`, `radius.md` → `--admin-radius-md`, `zIndex.tabBarMenu`
 * → `--admin-z-tab-bar-menu`, `typography.bodyEm` → `--admin-type-body-em-size`…
 * Le test de synchronisation compare la feuille à ce dictionnaire, dans les
 * deux sens.
 */
export function cssVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  const put = (name: string, value: string | number) => {
    vars[`--admin-${name}`] = String(value);
  };

  for (const [key, value] of Object.entries(colors)) put(kebab(key), value);

  for (const [role, t] of Object.entries(typography)) {
    const r = kebab(role);
    put(`type-${r}-size`, t.size);
    put(`type-${r}-weight`, t.weight);
    put(`type-${r}-line-height`, t.lineHeight);
    put(`type-${r}-tracking`, t.tracking);
  }
  put("font-sans", fontFamily.sans);
  put("font-features", fontFeatures);

  for (const [key, value] of Object.entries(space)) put(`space-${key}`, value);
  for (const [key, value] of Object.entries(radius)) put(`radius-${key}`, value);
  for (const [key, value] of Object.entries(shadow)) put(`shadow-${key}`, value);
  // durationFast → duration-fast, easingSheet → easing-sheet, pressScale → press-scale
  for (const [key, value] of Object.entries(motion)) put(kebab(key), value);
  for (const [key, value] of Object.entries(touchTarget)) put(`touch-${key}`, value);
  for (const [key, value] of Object.entries(layout)) put(kebab(key), value);
  for (const [key, value] of Object.entries(zIndex)) put(`z-${kebab(key)}`, value);

  return vars;
}
