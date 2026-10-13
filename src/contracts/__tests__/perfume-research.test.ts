import { describe, expect, it } from "vitest";
import { reviewPerfumeResearchInput, stagePerfumeResearchInput } from "../perfume-research";

const record = {
  brandName: "Maison de test",
  perfumeName: "Parfum test",
  sourceType: "BRAND_OFFICIAL",
  sourceUrl: "https://brand.example/perfume",
  rightsEvidence: "Fiche officielle, réutilisation des notes autorisée.",
  retrievedAt: "2026-10-13T10:00:00.000Z",
  topNotes: ["Bergamote"],
  heartNotes: ["Jasmin"],
  baseNotes: ["Cèdre"],
};

describe("import interne des données parfumées", () => {
  it("accepte une fiche avec source, preuve des droits et date", () => {
    expect(stagePerfumeResearchInput.safeParse({ records: [record] }).success).toBe(true);
  });

  it("refuse Fragrantica, même avec sourceType déclaré comme maison officielle", () => {
    for (const sourceUrl of [
      "https://www.fragrantica.com/perfume/test",
      "https://www.fragrantica.fr/parfum/test",
      "https://beta.fragrantica.com/perfume/test",
      "https://cdn.fimgs.net/perfume/test.jpg",
      "https://fraguru.com/perfume/test.jpg",
    ]) {
      expect(stagePerfumeResearchInput.safeParse({ records: [{ ...record, sourceUrl }] }).success).toBe(false);
    }
  });

  it("refuse une preuve d'autorisation vide et les statuts fournis par l'importateur", () => {
    expect(stagePerfumeResearchInput.safeParse({ records: [{ ...record, rightsEvidence: " " }] }).success).toBe(false);
    expect(stagePerfumeResearchInput.safeParse({ records: [{ ...record, status: "VERIFIED" }] }).success).toBe(false);
  });

  it("refuse les doublons dans un même lot", () => {
    expect(stagePerfumeResearchInput.safeParse({ records: [record, record] }).success).toBe(false);
  });

  it("exige une confirmation distincte des droits pour valider", () => {
    expect(reviewPerfumeResearchInput.safeParse({ id: "cm123456789012345678901234", status: "VERIFIED", rightsConfirmed: false }).success).toBe(false);
    expect(reviewPerfumeResearchInput.safeParse({ id: "cm123456789012345678901234", status: "VERIFIED", rightsConfirmed: true }).success).toBe(true);
  });
});
