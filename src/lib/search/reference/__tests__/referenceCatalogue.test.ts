import { describe, expect, it } from "vitest";
import { getReferenceCatalogue } from "../referenceCatalogue";
import { searchReference } from "../searchReference";

const DATA = getReferenceCatalogue();

describe("référentiel hors catalogue", () => {
  it("est sain : marques uniques, parfums non vides et sans doublon", () => {
    const marques = new Set<string>();
    for (const b of DATA) {
      const cle = b.brand.trim().toLowerCase();
      expect(b.brand.trim(), "marque vide").not.toBe("");
      expect(marques.has(cle), `marque en double : ${b.brand}`).toBe(false);
      marques.add(cle);
      const noms = b.perfumes.map((p) => p.trim().toLowerCase());
      expect(noms.every(Boolean), `parfum vide chez ${b.brand}`).toBe(true);
      expect(new Set(noms).size, `doublon chez ${b.brand}`).toBe(noms.length);
    }
    expect(DATA.length).toBeGreaterThan(200);
  });

  it("sépare les lignes : Emporio Armani, Armani Privé, Dior Collection Privée", () => {
    const marques = DATA.map((b) => b.brand);
    expect(marques).toEqual(
      expect.arrayContaining(["Giorgio Armani", "Emporio Armani", "Armani Privé", "Dior", "Dior Collection Privée"]),
    );
    expect(searchReference(DATA, "stronger with you")).toMatchObject({ brand: "Emporio Armani" });
  });
});
