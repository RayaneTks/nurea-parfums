import { describe, expect, it } from "vitest";
import { brandLineLabel, orderMessage } from "../perfumePresentation";

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

describe("message de commande copié pour Snapchat", () => {
  it("« Nom (Marque) » pour un parfum", () => {
    expect(orderMessage([{ name: "Sauvage", brand: "Dior" }])).toBe("Sauvage (Dior)");
  });

  it("une ligne par parfum, sans parenthèses vides", () => {
    expect(
      orderMessage([
        { name: "Sauvage", brand: "Dior" },
        { name: " Oud Wood ", brand: "Tom Ford " },
        { name: "Sans marque", brand: "" },
      ])
    ).toBe("Sauvage (Dior)\nOud Wood (Tom Ford)\nSans marque");
  });
});
