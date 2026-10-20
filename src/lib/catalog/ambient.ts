import type { CSSProperties } from "react";

/**
 * Couleur d'ambiance d'un parfum, côté vitrine — 04-PLAN-EXECUTION.md § B.3, étapes 5 et 6.
 *
 * La base garde la teinte et la chroma source (`ambientHue`, `ambientChroma`, calculées hors ligne
 * par `scripts/refonte-vitrine/ambiance.mjs`). On en dérive ici les deux fonds, avec la même règle
 * que le script : L 0,27 (sombre) / 0,93 (clair), chroma bornée, contraste du texte vérifié, L
 * reculé de 0,01 vers le fond (5 pas au plus), sinon repli. Parité tenue par
 * `src/lib/catalog/__tests__/ambient.test.ts`. Module pur : aucune lecture de CSS, aucun navigateur.
 */

type Theme = "dark" | "light";
type Rgb = readonly [number, number, number];

const toLin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const fromLin = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function oklchToRgb(L: number, C: number, h: number): Rgb {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const [r, g, bl] = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.round(Math.min(1, Math.max(0, fromLin(c))) * 255));
  return [r!, g!, bl!];
}

const luminance = (rgb: Rgb) => {
  const [r, g, b] = rgb.map(toLin) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (x: Rgb, y: Rgb) => {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

/** Jetons de texte (§ B.2) et bornes de l'ambiance (§ B.3), recopiés du script. */
const THEMES: Record<Theme, { L: number; k: number; cMin: number; cMax: number; step: number; text1: Rgb; text3: Rgb }> = {
  dark: { L: 0.27, k: 0.6, cMin: 0.03, cMax: 0.08, step: -0.01, text1: oklchToRgb(0.95, 0.008, 60), text3: oklchToRgb(0.66, 0.014, 40) },
  light: { L: 0.93, k: 0.35, cMin: 0.02, cMax: 0.05, step: +0.01, text1: oklchToRgb(0.22, 0.012, 20), text3: oklchToRgb(0.48, 0.014, 20) },
};

/** Fond d'ambiance d'un thème en `oklch()`, ou `null` si aucun pas ne tient le contraste (repli). */
export function deriveAmbient(theme: Theme, hue: number, chroma: number): string | null {
  const t = THEMES[theme];
  const C = Math.min(t.cMax, Math.max(t.cMin, chroma * t.k));
  for (let i = 0, L = t.L; i <= 5; i++, L += t.step) {
    const rgb = oklchToRgb(L, C, hue);
    if (contrast(t.text1, rgb) >= 7 && contrast(t.text3, rgb) >= 4.5) {
      return `oklch(${L.toFixed(2)} ${C.toFixed(3)} ${Math.round(hue)})`;
    }
  }
  return null;
}

/**
 * Variables `--amb` / `--amb-light` à poser en style en ligne. Valeur absente = repli : la CSS
 * retombe alors sur la surface neutre (`app/globals.css`, `.amb` et `.card`).
 */
export function ambientStyle(perfume: { ambientHue?: number | null; ambientChroma?: number | null }): CSSProperties | undefined {
  const { ambientHue: hue, ambientChroma: chroma } = perfume;
  if (hue == null || chroma == null) return undefined;
  const dark = deriveAmbient("dark", hue, chroma);
  const light = deriveAmbient("light", hue, chroma);
  if (!dark && !light) return undefined;
  return { ...(dark && { "--amb": dark }), ...(light && { "--amb-light": light }) } as CSSProperties;
}
