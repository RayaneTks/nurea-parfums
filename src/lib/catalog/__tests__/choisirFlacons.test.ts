import { describe, expect, it } from "vitest";
import type { Perfume } from "@/lib/data";
import { choisirFlacons, trouverParfum } from "../choisirFlacons";

let id = 0;
function parfum(name: string, brand: string, extra: Partial<Perfume> = {}): Perfume {
  id += 1;
  return { id, name, brand, category: "Sélections Individuelles", image: `/p/${id}.webp`, ...extra };
}

describe("choisirFlacons", () => {
  it("prend d'abord les parfums mis en avant par l'opérateur", () => {
    const a = parfum("A", "Dior");
    const b = parfum("B", "Chanel", { isFeatured: true });
    expect(choisirFlacons([a, b], 2).map((p) => p.name)).toEqual(["B", "A"]);
  });

  it("ne montre jamais deux flacons de la même marque", () => {
    const choisis = choisirFlacons(
      [parfum("Sauvage", "Dior"), parfum("Miss Dior", "dior "), parfum("Bleu", "Chanel")],
      3,
    );
    expect(choisis.map((p) => p.brand.trim().toLowerCase())).toEqual(["dior", "chanel"]);
  });

  it("écarte les gammes complètes et les parfums sans image", () => {
    const choisis = choisirFlacons(
      [
        parfum("Gamme", "Lattafa", { category: "Gammes Complètes" }),
        parfum("Sans photo", "Azzaro", { image: " " }),
        parfum("Oud", "Crivelli"),
      ],
      3,
    );
    expect(choisis.map((p) => p.name)).toEqual(["Oud"]);
  });

  it("est déterministe : même catalogue, mêmes flacons", () => {
    const catalogue = [parfum("A", "X"), parfum("B", "Y"), parfum("C", "Z")];
    expect(choisirFlacons(catalogue, 2)).toEqual(choisirFlacons(catalogue, 2));
  });
});

describe("trouverParfum", () => {
  const catalogue = [parfum("Oud Maracujá", "Maison Crivelli"), parfum("Sauvage", "Dior")];

  it("retrouve un parfum sans tenir compte de la casse ni des espaces", () => {
    expect(trouverParfum(catalogue, "  oud maracujá ", "MAISON CRIVELLI")?.brand).toBe("Maison Crivelli");
  });

  it("accepte une URL sans marque", () => {
    expect(trouverParfum(catalogue, "Sauvage", "")?.brand).toBe("Dior");
  });

  it("ne confond pas deux marques", () => {
    expect(trouverParfum(catalogue, "Sauvage", "Chanel")).toBeUndefined();
  });

  it("sans nom, ne trouve rien", () => {
    expect(trouverParfum(catalogue, "", "Dior")).toBeUndefined();
  });
});
