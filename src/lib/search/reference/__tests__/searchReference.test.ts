import { describe, expect, it } from "vitest";
import { searchReference, type ReferenceBrand } from "../searchReference";

const DATA: ReferenceBrand[] = [
  { brand: "Giorgio Armani", aliases: ["armani", "armani beauty"], perfumes: ["Acqua di Giò", "Armani Code"] },
  { brand: "Emporio Armani", aliases: ["armani emporio"], perfumes: ["Stronger With You", "Because It's You"] },
  { brand: "Armani Privé", aliases: ["armani prive"], perfumes: ["Rose d'Arabie"] },
  { brand: "Dior", perfumes: ["Sauvage", "J'adore"] },
  { brand: "Dior Collection Privée", aliases: ["dior prive", "la collection privee"], perfumes: ["Oud Ispahan", "Gris Dior"] },
  { brand: "Creed", perfumes: ["Aventus", "Silver Mountain Water"] },
];

describe("recherche dans le référentiel hors catalogue", () => {
  it("retrouve un parfum seul, accents, casse et petite faute tolérés", () => {
    expect(searchReference(DATA, "AVENTUS")).toEqual({ kind: "perfume", name: "Aventus", brand: "Creed" });
    expect(searchReference(DATA, "acqua di gio")).toEqual({ kind: "perfume", name: "Acqua di Giò", brand: "Giorgio Armani" });
    expect(searchReference(DATA, "oud ispahn")).toMatchObject({ kind: "perfume", name: "Oud Ispahan" });
  });

  it("marque + parfum : la ligne du parfum fait foi, pas celle de la marque tapée", () => {
    expect(searchReference(DATA, "emporio armani stronger with you")).toEqual({
      kind: "perfume",
      name: "Stronger With You",
      brand: "Emporio Armani",
    });
    expect(searchReference(DATA, "creed aventus")).toMatchObject({ name: "Aventus", brand: "Creed" });
  });

  it("une saisie de marque seule renvoie la marque, pas un parfum pris au hasard", () => {
    expect(searchReference(DATA, "creed")).toEqual({ kind: "brand", brand: "Creed" });
    expect(searchReference(DATA, "armani prive")).toEqual({ kind: "brand", brand: "Armani Privé" });
    expect(searchReference(DATA, "dior prive")).toEqual({ kind: "brand", brand: "Dior Collection Privée" });
  });

  it("rien d'approchant, ou saisie trop courte : null", () => {
    expect(searchReference(DATA, "zzzzqqq")).toBeNull();
    expect(searchReference(DATA, "cr")).toBeNull();
  });
});
