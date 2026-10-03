import { describe, expect, it, vi } from "vitest";
import type { Perfume } from "../../data";
import { searchLocalCatalog } from "../searchLocalCatalog";

vi.mock("@/lib/catalogue-service", () => ({ getUnlistedPerfumes: async () => [] }));
vi.mock("../../catalogue-service", () => ({ getUnlistedPerfumes: async () => [] }));

const { searchUnlisted } = await import("../searchPerfumeWithFallback");

const perfume = (id: number, brand: string, name: string, line?: string): Perfume => ({
  id,
  brand,
  name,
  line,
  category: "Sélections Individuelles",
  image: "https://cdn.example/p.webp",
});

const CATALOGUE: Perfume[] = [
  perfume(1, "Dior", "Gris Dior", "La Collection Privée"),
  perfume(2, "Dior", "Sauvage"),
  perfume(3, "Tom Ford", "Oud Wood", "Private Blend"),
  perfume(4, "Tom Ford", "Ombré Leather"),
  perfume(5, "Giorgio Armani", "Stronger With You", "Emporio Armani"),
  perfume(6, "Giorgio Armani", "Rose d'Arabie", "Armani Privé"),
  perfume(7, "Yves Saint Laurent", "Libre"),
];

const ids = (query: string) => searchLocalCatalog(CATALOGUE, query).map((p) => p.id);

describe("recherche vitrine par gamme", () => {
  it("la gamme tapée trouve ses parfums, et seulement eux", () => {
    expect(ids("collection privée")).toEqual([1]);
    expect(ids("private blend")).toEqual([3]);
    expect(ids("emporio")).toEqual([5]);
    expect(ids("Armani Privé")).toEqual([6]);
  });

  it("accents, casse et petite faute tolérés", () => {
    expect(ids("COLLECTION PRIVEE")).toEqual([1]);
    expect(ids("private blnd")).toEqual([3]);
  });

  it("la marque seule trouve toujours tous ses parfums, gamme ou non", () => {
    expect(ids("tom ford").sort()).toEqual([3, 4]);
  });

  it("un parfum hors vitrine se retrouve aussi par sa gamme", () => {
    expect(searchUnlisted([{ name: "Oud Wood", brand: "Tom Ford", line: "Private Blend" }], "private blend")).toEqual({
      name: "Oud Wood",
      brand: "Tom Ford",
      on: "perfume",
    });
  });
});
