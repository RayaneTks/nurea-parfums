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

  it("reconnaît les saisies courantes, marque avant ou après, d'un bloc ou non", () => {
    const cas: [string, string, string][] = [
      ["j'adore", "J'adore", "Dior"],
      ["jadore dior", "J'adore", "Dior"],
      ["chanel n5", "N°5", "Chanel"],
      ["ysl libre", "Libre", "Yves Saint Laurent"],
      ["mugler angel", "Angel", "Mugler"],
      ["givenchy gentleman", "Gentleman", "Givenchy"],
      ["oud wood", "Oud Wood", "Tom Ford Private Blend"],
      ["code", "Armani Code", "Giorgio Armani"],
    ];
    for (const [saisie, name, brand] of cas) {
      expect(searchReference(DATA, saisie), saisie).toEqual({ kind: "perfume", name, brand });
    }
  });

  it("ne reconnaît pas à tort : mieux vaut rien qu'un mauvais parfum", () => {
    // Relevés sur l'ancien score, emprunté à l'API externe.
    expect(searchReference(DATA, "j'adore")).not.toMatchObject({ brand: "Bvlgari" });
    expect(searchReference(DATA, "maison margiela replica")).toEqual({ kind: "brand", brand: "Maison Margiela" });
    expect(searchReference(DATA, "bmw perfume")).toBeNull();
    expect(searchReference(DATA, "nurea-inconnu-xyz")).toBeNull();
  });
});
