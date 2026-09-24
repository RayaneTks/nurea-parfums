import { describe, expect, it } from "vitest";
import type { AdminPerfumeRow } from "@/contracts/catalogue";
import { filterPerfumes, perfumeCounts } from "../catalogue-model";

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
