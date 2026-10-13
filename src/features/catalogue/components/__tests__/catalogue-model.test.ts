import { describe, expect, it } from "vitest";
import type { AdminBrandRow, AdminPerfumeRow } from "@/contracts/catalogue";
import { filterBrands, filterPerfumes, perfumeCounts } from "../catalogue-model";

const row = (id: number, status: "PUBLISHED" | "DRAFT") => ({ id, status, searchKey: `parfum ${id}`, stockStatus: "ok" }) as unknown as AdminPerfumeRow;
const PERFUMES = [row(1, "PUBLISHED"), row(2, "DRAFT"), row(3, "PUBLISHED")];

describe("filtre de visibilité du catalogue", () => {
  it("« Visibles » garde les publiés, « Masqués » les brouillons, sans filtre tout reste", () => {
    const ids = (visibility: "visibles" | "masques" | null) => filterPerfumes(PERFUMES, { words: [], stock: null, visibility }).map((p) => p.id);
    expect(ids("visibles")).toEqual([1, 3]);
    expect(ids("masques")).toEqual([2]);
    expect(ids(null)).toEqual([1, 2, 3]);
    expect(perfumeCounts(PERFUMES, [])).toMatchObject({ total: 3, visible: 2, hidden: 1 });
  });
});

describe("filtre Marques par visuel de collection", () => {
  const brands = [
    { id: "1", name: "Dior", image: "brands/dior.webp", status: "PUBLISHED", searchKey: "dior" },
    { id: "2", name: "Chanel", image: null, status: "PUBLISHED", searchKey: "chanel" },
  ] as unknown as AdminBrandRow[];

  it("isole les marques avec un visuel de collection, sans changer le filtre de visibilité", () => {
    expect(filterBrands(brands, { words: [], visibility: null, collectionVisual: true }).map((b) => b.name)).toEqual(["Dior"]);
    expect(filterBrands(brands, { words: [], visibility: null, collectionVisual: false }).map((b) => b.name)).toEqual(["Chanel"]);
    expect(filterBrands(brands, { words: [], visibility: null, collectionVisual: null })).toEqual(brands);
  });
});
