import { describe, expect, it } from "vitest";
import { topBrands } from "../BrandShelf";

const p = (brand: string, brandSlug?: string, extra: { isFeatured?: boolean; imageLight?: string; name?: string } = {}) => ({
  brand,
  brandSlug,
  name: extra.name ?? brand,
  ...extra,
});

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

  it("représente la marque par son parfum mis en avant, sinon par un parfum qui a sa variante claire", () => {
    const perfumes = [
      p("Dior", "dior", { name: "Sombre seul" }),
      p("Dior", "dior", { name: "Avec clair", imageLight: "light.webp" }),
      p("Dior", "dior", { name: "Mis en avant", isFeatured: true }),
      p("Chanel", "chanel", { name: "Premier" }),
      p("Chanel", "chanel", { name: "Second" }),
    ];
    const [dior, chanel] = topBrands(perfumes);
    expect(dior?.perfume.name).toBe("Mis en avant");
    expect(chanel?.perfume.name).toBe("Premier");
  });
});
