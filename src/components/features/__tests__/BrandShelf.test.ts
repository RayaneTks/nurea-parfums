import { describe, expect, it } from "vitest";
import { topBrands } from "../BrandShelf";

const p = (brand: string, brandSlug?: string) => ({ brand, brandSlug });

describe("rayon des marques de l'accueil", () => {
  it("range par nombre de parfums publiés, puis par nom", () => {
    const perfumes = [p("Dior", "dior"), p("Chanel", "chanel"), p("Dior", "dior"), p("Amouage", "amouage"), p("Chanel", "chanel")];
    expect(topBrands(perfumes).map(({ name, slug, count }) => ({ name, slug, count }))).toEqual([
      { name: "Chanel", slug: "chanel", count: 2 },
      { name: "Dior", slug: "dior", count: 2 },
      { name: "Amouage", slug: "amouage", count: 1 },
    ]);
  });

  it("s'arrête à la taille demandée et ignore un parfum sans marque adressable", () => {
    const perfumes = [p("A", "a"), p("B", "b"), p("C", "c"), p("Sans page")];
    expect(topBrands(perfumes, 2).map((b) => b.slug)).toEqual(["a", "b"]);
  });

  it("garde les trois premiers parfums de chaque marque, dans l'ordre reçu", () => {
    const perfumes = ["a", "b", "c", "d"].map((id) => ({ id, brand: "Dior", brandSlug: "dior" }));
    expect(topBrands(perfumes)[0]?.lineup.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});
