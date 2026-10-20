import { describe, expect, it } from "vitest";
import { PAGE_SIZE, readFilters, writeFilters } from "../useCatalogFilters";

const read = (search: string) => readFilters(new URLSearchParams(search));

describe("pagination et densité dans l'adresse", () => {
  it("part de 24 parfums en deux colonnes, sans rien écrire dans l'adresse", () => {
    const filters = read("");
    expect(filters.n).toBe(PAGE_SIZE);
    expect(filters.density).toBe(2);
    expect(writeFilters(filters)).toBe("");
  });

  it("arrondit ?n= à la page supérieure et le borne", () => {
    expect(read("n=48").n).toBe(48);
    expect(read("n=30").n).toBe(48);
    expect(read("n=abc").n).toBe(PAGE_SIZE);
    expect(read("n=-5").n).toBe(PAGE_SIZE);
    expect(read("n=999999").n).toBe(40 * PAGE_SIZE);
  });

  it("n'accepte que les densités 1, 2 et 3", () => {
    expect(read("densite=1").density).toBe(1);
    expect(read("densite=3").density).toBe(3);
    expect(read("densite=9").density).toBe(2);
  });

  it("relit ce qu'il écrit", () => {
    const search = writeFilters({ ...read("q=dior&sort=brand"), n: 72, density: 3 });
    expect(search).toBe("q=dior&sort=brand&n=72&densite=3");
    expect(read(search)).toMatchObject({ query: "dior", sort: "brand", n: 72, density: 3 });
  });
});

describe("fiche ouverte dans l'adresse", () => {
  it("relit ?parfum=<id> et l'écrit après les filtres", () => {
    expect(read("parfum=42").parfum).toBe("42");
    expect(read("").parfum).toBe("");
    expect(writeFilters({ ...read("q=dior"), parfum: "42" })).toBe("q=dior&parfum=42");
  });
});
