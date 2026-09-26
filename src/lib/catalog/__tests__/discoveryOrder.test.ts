import { describe, expect, it } from "vitest";
import type { Perfume } from "@/lib/data";
import { discoveryOrder } from "../discoveryOrder";

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const perfume = (id: number, brand: string): Perfume => ({
  id, name: `Parfum ${id}`, brand, brandSlug: brand.toLowerCase(), category: "Sélections Individuelles", image: `/x/${id}.webp`,
});

// 30 parfums, dont 10 d'une seule marque : le cas où un mélange naïf les regroupe.
const catalogue: Perfume[] = [
  ...Array.from({ length: 10 }, (_, i) => perfume(i + 1, "Louis Vuitton")),
  ...Array.from({ length: 20 }, (_, i) => perfume(i + 11, `Marque ${i % 10}`)),
];

describe("discoveryOrder", () => {
  it("rend exactement les mêmes fiches, sans en perdre ni en doubler", () => {
    const out = discoveryOrder(catalogue, seeded(1));
    expect(out).toHaveLength(catalogue.length);
    expect(new Set(out.map((p) => p.id))).toEqual(new Set(catalogue.map((p) => p.id)));
  });

  it("ne modifie pas le catalogue reçu (il vient du cache)", () => {
    const before = catalogue.map((p) => p.id);
    discoveryOrder(catalogue, seeded(2));
    expect(catalogue.map((p) => p.id)).toEqual(before);
  });

  it("met en tête autant de marques différentes qu'il en existe", () => {
    const out = discoveryOrder(catalogue, seeded(3));
    // 11 marques au catalogue : les 11 premières fiches en ont chacune une différente.
    expect(new Set(out.slice(0, 11).map((p) => p.brand)).size).toBe(11);
  });

  it("change d'ordre d'une visite à l'autre", () => {
    const a = discoveryOrder(catalogue, seeded(4)).map((p) => p.id);
    const b = discoveryOrder(catalogue, seeded(5)).map((p) => p.id);
    expect(a).not.toEqual(b);
  });

  it("tolère un catalogue vide ou d'une seule fiche", () => {
    expect(discoveryOrder([], seeded(6))).toEqual([]);
    expect(discoveryOrder([perfume(1, "Dior")], seeded(7)).map((p) => p.id)).toEqual([1]);
  });
});
