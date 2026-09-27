import { describe, expect, it } from "vitest";
import type { Perfume } from "@/lib/data";
import { inCategory } from "../perfumePresentation";

const perfume = (over: Partial<Perfume>): Perfume => ({
  id: 1, name: "Sauvage", brand: "Dior", category: "Sélections Individuelles", image: "/x.webp", ...over,
});

describe("inCategory", () => {
  it("« Tout voir » garde tout", () => {
    expect(inCategory(perfume({}), "Tout voir")).toBe(true);
  });

  it("« Nouveautés » ne retient que les parfums marqués comme derniers entrés", () => {
    expect(inCategory(perfume({ isNew: true }), "Nouveautés")).toBe(true);
    expect(inCategory(perfume({}), "Nouveautés")).toBe(false);
  });

  it("une nouveauté reste dans sa catégorie d'origine", () => {
    const p = perfume({ isNew: true });
    expect(inCategory(p, "Sélections Individuelles")).toBe(true);
    expect(inCategory(p, "Gammes Complètes")).toBe(false);
  });
});
