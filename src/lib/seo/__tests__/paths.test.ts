import { describe, expect, it } from "vitest";
import { brandPath, fullPerfumeName, perfumeIdFromSegment, perfumePath, perfumeSegment, slugify } from "../paths";

describe("slugify", () => {
  it("retire accents, casse et ponctuation", () => {
    expect(slugify("Oud Maracujá")).toBe("oud-maracuja");
    expect(slugify("Sì Passione")).toBe("si-passione");
    expect(slugify("L'Homme Idéal")).toBe("l-homme-ideal");
    expect(slugify("  Club de Nuit — Intense  ")).toBe("club-de-nuit-intense");
  });

  it("écrit l'esperluette en toutes lettres plutôt que de la perdre", () => {
    expect(slugify("Dolce & Gabbana")).toBe("dolce-et-gabbana");
  });

  it("rend une chaîne vide pour un nom sans lettre ni chiffre", () => {
    expect(slugify("—")).toBe("");
  });
});

describe("adresses", () => {
  it("fiche marque et fiche parfum", () => {
    expect(brandPath("dior")).toBe("/parfums/dior");
    expect(perfumePath("dior", "Sauvage", 12)).toBe("/parfums/dior/sauvage-12");
  });

  it("un nom illisible garde une adresse valide", () => {
    expect(perfumeSegment("—", 7)).toBe("7");
  });
});

describe("perfumeIdFromSegment", () => {
  it("ne lit que l'identifiant final : le nom peut avoir changé", () => {
    expect(perfumeIdFromSegment("sauvage-12")).toBe(12);
    expect(perfumeIdFromSegment("ancien-nom-12")).toBe(12);
    expect(perfumeIdFromSegment("12")).toBe(12);
    // Un chiffre DANS le nom ne trompe pas la lecture : seul le dernier bloc compte.
    expect(perfumeIdFromSegment("212-vip-men-40")).toBe(40);
  });

  it("refuse ce qui n'est pas un identifiant", () => {
    expect(perfumeIdFromSegment("sauvage")).toBeNull();
    expect(perfumeIdFromSegment("sauvage-0")).toBeNull();
    expect(perfumeIdFromSegment("sauvage-12x")).toBeNull();
    expect(perfumeIdFromSegment("sauvage-12345678901")).toBeNull();
  });
});

describe("fullPerfumeName", () => {
  it("préfixe la marque, sauf si le nom la porte déjà", () => {
    expect(fullPerfumeName("Dior", "Sauvage")).toBe("Dior Sauvage");
    expect(fullPerfumeName("Dior", "Gris Dior")).toBe("Gris Dior");
    expect(fullPerfumeName("Lancôme", "La vie est belle Lancome")).toBe("La vie est belle Lancome");
  });
});
