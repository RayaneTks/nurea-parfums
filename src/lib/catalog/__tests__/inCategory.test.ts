import { describe, expect, it } from "vitest";
import type { Perfume } from "@/lib/data";
import { inCategory } from "../perfumePresentation";

const perfume = (over: Partial<Perfume>): Perfume => ({
  id: 1, name: "Sauvage", brand: "Dior", category: "Tout voir", image: "/x.webp", ...over,
});

describe("inCategory", () => {
  it("« Tout voir » garde tout", () => {
    expect(inCategory(perfume({}), "Tout voir")).toBe(true);
  });

  it("« Nouveautés » ne retient que les parfums marqués comme derniers entrés", () => {
    expect(inCategory(perfume({ isNew: true }), "Nouveautés")).toBe(true);
    expect(inCategory(perfume({}), "Nouveautés")).toBe(false);
  });

  it("une nouveauté reste visible dans Tout voir", () => {
    const p = perfume({ isNew: true });
    expect(inCategory(p, "Tout voir")).toBe(true);
    expect(inCategory(p, "Nouveautés")).toBe(true);
  });
});
