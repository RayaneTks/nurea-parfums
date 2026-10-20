import { describe, expect, it } from "vitest";
import { ambientStyle, deriveAmbient } from "../ambient";

type Derived = { oklch: string } | null;
// Spécificateur élargi en `string` : TypeScript n'a pas de déclaration pour un `.mjs`, Vitest le charge.
const script = (await import("../../../../scripts/refonte-vitrine/ambiance.mjs" as string)) as {
  derive: (theme: "dark" | "light", hue: number, chroma: number) => Derived;
};

describe("deriveAmbient", () => {
  it("donne au centième près le fond du script, dans les deux thèmes (parité § B.3)", () => {
    let compared = 0;
    let fallbacks = 0;
    for (let hue = 0; hue < 360; hue += 5) {
      for (const chroma of [0, 0.02, 0.05, 0.08, 0.12, 0.2, 0.4]) {
        for (const theme of ["dark", "light"] as const) {
          const expected = script.derive(theme, hue, chroma)?.oklch ?? null;
          expect(deriveAmbient(theme, hue, chroma), `${theme} ${hue} ${chroma}`).toBe(expected);
          compared++;
          if (expected === null) fallbacks++;
        }
      }
    }
    expect(compared).toBe(1008);
    // La règle doit réellement s'exercer : des fonds dérivés, et pas un repli partout.
    expect(fallbacks).toBeLessThan(compared / 2);
  });

  it("borne la chroma (sombre 0,03–0,08, clair 0,02–0,05)", () => {
    expect(deriveAmbient("dark", 250, 0)).toMatch(/^oklch\(0\.\d\d 0\.030 250\)$/);
    expect(deriveAmbient("dark", 250, 1)).toMatch(/ 0\.080 250\)$/);
    expect(deriveAmbient("light", 250, 1)).toMatch(/ 0\.050 250\)$/);
  });
});

describe("ambientStyle", () => {
  it("pose les deux jetons quand la fiche a une ambiance", () => {
    expect(ambientStyle({ ambientHue: 30, ambientChroma: 0.1 })).toEqual({
      "--amb": deriveAmbient("dark", 30, 0.1),
      "--amb-light": deriveAmbient("light", 30, 0.1),
    });
  });

  it("ne pose rien sans ambiance : la surface neutre prend le relais", () => {
    expect(ambientStyle({})).toBeUndefined();
    expect(ambientStyle({ ambientHue: 30, ambientChroma: null })).toBeUndefined();
  });
});
