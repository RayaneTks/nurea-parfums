import { describe, expect, it } from "vitest";
import { colors, type ColorToken } from "@/design/tokens";

/**
 * Contraste des couples de jetons (docs/refonte/05-DESIGN-SYSTEM.md §6, critère de 07 J16).
 *
 * « Texte courant ≥ 4,5:1, texte large et composants UI ≥ 3:1 — tout nouveau couple couleur/fond se
 * vérifie AVANT d'entrer dans `tokens.ts`. » Le voici vérifié par une machine : une couleur ajoutée
 * sans son couple, ou éclaircie « pour faire joli », échoue ici et pas six mois plus tard, dehors.
 *
 * Les tons translucides (`*-bg`) sont composités sur LEUR fond réel — et un badge peut être posé sur
 * une carte blanche comme sur le gris de la page : les deux sont éprouvés. C'est ce cas-là qui a fait
 * assombrir `success` et `warning` à J16.
 */

type Rgba = { r: number; g: number; b: number; a: number };

function parseColor(value: string): Rgba {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const digits = (hex[1] as string).length === 3 ? [...(hex[1] as string)].map((c) => c + c).join("") : (hex[1] as string);
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgba = value.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (rgba) {
    const parts = (rgba[1] as string).split(",").map((part) => Number(part.trim()));
    return { r: parts[0] as number, g: parts[1] as number, b: parts[2] as number, a: parts.length > 3 ? (parts[3] as number) : 1 };
  }
  throw new Error(`Couleur non analysable : « ${value} » (ni hex, ni rgb/rgba)`);
}

/** Aplatit une couleur translucide sur son fond — c'est ce que l'œil voit. */
function flatten(color: Rgba, background: Rgba): Rgba {
  return {
    r: color.r * color.a + background.r * (1 - color.a),
    g: color.g * color.a + background.g * (1 - color.a),
    b: color.b * color.a + background.b * (1 - color.a),
    a: 1,
  };
}

function relativeLuminance({ r, g, b }: Rgba): number {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Rapport WCAG 2.1 entre deux couleurs déjà opaques. */
export function contrastRatio(foreground: Rgba, background: Rgba): number {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

const token = (name: ColorToken) => parseColor(colors[name]);

/** Les deux fonds sur lesquels TOUT se pose dans le registre `product` : la page, et une carte. */
const FONDS: { nom: string; couleur: Rgba }[] = [
  { nom: "le fond de page", couleur: token("bg") },
  { nom: "une carte", couleur: token("surface") },
];

/** Texte courant : 4,5:1. Le seuil de 3:1 ne vaut que pour le gros texte et les composants. */
const TEXTE = 4.5;
const COMPOSANT = 3;

type Couple = { fg: ColorToken; bg: ColorToken; min: number; quoi: string };

/** Texte posé directement sur un fond. */
const SUR_FOND: Couple[] = [
  { fg: "text", bg: "bg", min: TEXTE, quoi: "texte courant" },
  { fg: "text", bg: "surface", min: TEXTE, quoi: "texte courant sur carte" },
  { fg: "text", bg: "surfaceAlt", min: TEXTE, quoi: "texte sur zone secondaire" },
  { fg: "text", bg: "surfaceMuted", min: TEXTE, quoi: "texte sur fond atténué" },
  { fg: "textMuted", bg: "bg", min: TEXTE, quoi: "légende" },
  { fg: "textMuted", bg: "surface", min: TEXTE, quoi: "légende sur carte" },
  { fg: "textSubtle", bg: "bg", min: TEXTE, quoi: "libellé de chiffre (11 px, lu dehors)" },
  { fg: "textSubtle", bg: "surface", min: TEXTE, quoi: "libellé de chiffre sur carte" },
  { fg: "accent", bg: "bg", min: TEXTE, quoi: "onglet actif, bouton `text`" },
  { fg: "accent", bg: "surface", min: TEXTE, quoi: "accent sur carte" },
  { fg: "accent", bg: "surfaceMuted", min: COMPOSANT, quoi: "segment actif" },
  { fg: "accentHover", bg: "surface", min: TEXTE, quoi: "accent au survol" },
  { fg: "success", bg: "bg", min: TEXTE, quoi: "ton « payé »" },
  { fg: "success", bg: "surface", min: TEXTE, quoi: "ton « payé » sur carte" },
  { fg: "warning", bg: "bg", min: TEXTE, quoi: "montant « À encaisser »" },
  { fg: "warning", bg: "surface", min: TEXTE, quoi: "montant « À encaisser » sur carte" },
  { fg: "danger", bg: "bg", min: TEXTE, quoi: "créance de plus de 30 j" },
  { fg: "danger", bg: "surface", min: TEXTE, quoi: "créance de plus de 30 j sur carte" },
  { fg: "info", bg: "bg", min: TEXTE, quoi: "contexte neutre" },
  { fg: "info", bg: "surface", min: TEXTE, quoi: "contexte neutre sur carte" },
];

/** Texte blanc posé sur un aplat plein : bouton primaire, badge plein, toast. */
const SUR_APLAT: Couple[] = (["accent", "accentHover", "danger", "success", "warning", "info"] as const).map((bg) => ({
  fg: "onAccent" as ColorToken,
  bg,
  min: TEXTE,
  quoi: `texte posé sur l'aplat ${bg}`,
}));

/** Ton sur SON fond teinté (`Badge`, `ErrorBanner`, alerte d'homonyme) : le cas le plus serré. */
const SUR_TEINTE: { fg: ColorToken; teinte: ColorToken }[] = [
  { fg: "accent", teinte: "accentBg" },
  { fg: "success", teinte: "successBg" },
  { fg: "warning", teinte: "warningBg" },
  { fg: "danger", teinte: "dangerBg" },
  { fg: "info", teinte: "infoBg" },
];

describe("contraste des couples de jetons (05 §6)", () => {
  it("le calcul est celui de WCAG : blanc sur noir = 21, une couleur sur elle-même = 1", () => {
    expect(contrastRatio(parseColor("#FFFFFF"), parseColor("#000000"))).toBeCloseTo(21, 2);
    expect(contrastRatio(parseColor("#7B0B1D"), parseColor("#7B0B1D"))).toBeCloseTo(1, 5);
    // Translucide : aplati sur son fond avant la mesure.
    expect(contrastRatio(flatten(parseColor("rgba(0, 0, 0, 0.5)"), parseColor("#FFFFFF")), parseColor("#FFFFFF"))).toBeGreaterThan(3);
  });

  it.each([...SUR_FOND, ...SUR_APLAT])("$fg sur $bg ($quoi) ≥ $min:1", ({ fg, bg, min }) => {
    const fond = flatten(token(bg), token("surface"));
    const ratio = contrastRatio(flatten(token(fg), fond), fond);
    expect(Number(ratio.toFixed(2))).toBeGreaterThanOrEqual(min);
  });

  it.each(SUR_TEINTE)("$fg sur $teinte tient sur la page ET sur une carte", ({ fg, teinte }) => {
    for (const fond of FONDS) {
      const surface = flatten(token(teinte), fond.couleur);
      const ratio = contrastRatio(flatten(token(fg), surface), surface);
      expect(Number(ratio.toFixed(2)), `${fg} sur ${teinte}, au-dessus de ${fond.nom}`).toBeGreaterThanOrEqual(TEXTE);
    }
  });

  it("l'anneau de focus et le texte de la visionneuse se voient", () => {
    // `outline: 2px solid var(--admin-accent)` : un composant d'interface, seuil 3:1 (05 §6).
    for (const fond of FONDS) {
      expect(contrastRatio(token("accent"), fond.couleur)).toBeGreaterThanOrEqual(COMPOSANT);
    }
    const backdrop = flatten(token("viewerBackdrop"), { r: 0, g: 0, b: 0, a: 1 });
    expect(contrastRatio(token("onAccent"), backdrop)).toBeGreaterThanOrEqual(TEXTE);
  });

  it("chaque couleur de `tokens.ts` s'analyse (aucune valeur exotique n'entre sans couple)", () => {
    const nonAnalysables = Object.entries(colors)
      .filter(([, value]) => {
        try {
          parseColor(value);
          return false;
        } catch {
          // `borderHover` est un `color-mix` : il ne porte aucun texte, il n'a pas de couple à tenir.
          return true;
        }
      })
      .map(([name]) => name);
    expect(nonAnalysables).toEqual(["borderHover"]);
  });
});
