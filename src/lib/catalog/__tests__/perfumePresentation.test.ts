import { describe, expect, it } from "vitest";
import { brandLineLabel } from "../perfumePresentation";

describe("étiquette de marque d'une fiche", () => {
  it("« Marque · Gamme » quand le parfum a une gamme", () => {
    expect(brandLineLabel("Dior", "La Collection Privée")).toBe("Dior · La Collection Privée");
    expect(brandLineLabel("Tom Ford", "  Private Blend ")).toBe("Tom Ford · Private Blend");
  });

  it("la marque seule sinon, sans séparateur orphelin", () => {
    expect(brandLineLabel("Dior")).toBe("Dior");
    expect(brandLineLabel("Dior", null)).toBe("Dior");
    expect(brandLineLabel("Dior", "   ")).toBe("Dior");
  });
});
