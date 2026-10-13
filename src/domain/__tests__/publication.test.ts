import { describe, expect, it } from "vitest";
import {
  FEATURED_LIMIT,
  brandHidesPerfumes,
  canFeaturePerfume,
  canPublishBrand,
  canPublishPerfume,
  hasVisual,
  isPerfumeVisible,
  settlePerfumePublication,
  type BrandPublicationState,
} from "../publication";

const dior: BrandPublicationState = {
  name: "Dior",
  status: "PUBLISHED",
  catalogMode: "CURATED",
  image: "brands/dior.webp",
};
const withVisual = { image: "perfumes/sauvage.webp" };

describe("hasVisual — même prédicat que les CHECK (btrim(image) <> '')", () => {
  it("chaîne vide, blancs et null = sans visuel", () => {
    expect(hasVisual("")).toBe(false);
    expect(hasVisual("   ")).toBe(false);
    expect(hasVisual(null)).toBe(false);
    expect(hasVisual("perfumes/x.webp")).toBe(true);
  });
});

describe("canPublishPerfume", () => {
  it("visuel + marque visible en Sélection : publiable", () => {
    expect(canPublishPerfume(withVisual, dior)).toEqual({ ok: true });
  });

  it("sans visuel : refus actionnable", () => {
    expect(canPublishPerfume({ image: "" }, dior)).toEqual({
      ok: false,
      message: "Ajoute un visuel pour publier ce parfum.",
    });
  });

  it("marque masquée : « Rends d'abord la marque Dior visible »", () => {
    expect(canPublishPerfume(withVisual, { ...dior, status: "DRAFT" })).toEqual({
      ok: false,
      message: "Rends d'abord la marque Dior visible.",
    });
  });

  it("le mode historique ne bloque plus la publication des parfums", () => {
    expect(canPublishPerfume(withVisual, { ...dior, catalogMode: "COMPLETE" })).toEqual({ ok: true });
  });
});

describe("canPublishBrand", () => {
  it("le visuel de collection reste facultatif, quel que soit le mode historique", () => {
    expect(canPublishBrand({ catalogMode: "COMPLETE", image: null })).toEqual({ ok: true });
    expect(canPublishBrand({ catalogMode: "COMPLETE", image: "brands/dior.webp" })).toEqual({ ok: true });
  });

  it("une marque en Sélection se publie sans logo (règle de l'existant, 04 §12)", () => {
    expect(canPublishBrand({ catalogMode: "CURATED", image: null })).toEqual({ ok: true });
  });
});

describe("canFeaturePerfume", () => {
  it("réservé à un parfum visible", () => {
    const r = canFeaturePerfume({ status: "DRAFT" }, 0);
    expect(r.ok).toBe(false);
  });

  it("deux emplacements au plus", () => {
    expect(FEATURED_LIMIT).toBe(2);
    expect(canFeaturePerfume({ status: "PUBLISHED" }, 1)).toEqual({ ok: true });
    expect(canFeaturePerfume({ status: "PUBLISHED" }, 2)).toEqual({
      ok: false,
      message: "Les 2 emplacements sont pris : retire d'abord un parfum.",
    });
  });
});

describe("isPerfumeVisible — ce que lit la vitrine", () => {
  const sauvage = { name: "Sauvage", image: "perfumes/sauvage.webp", status: "PUBLISHED" as const };

  it("parfum publié, nommé, avec visuel, d'une marque visible en Sélection", () => {
    expect(isPerfumeVisible(sauvage, dior)).toBe(true);
  });

  it("jamais plus visible que sa marque", () => {
    expect(isPerfumeVisible(sauvage, { ...dior, status: "DRAFT" })).toBe(false);
    expect(isPerfumeVisible(sauvage, { ...dior, catalogMode: "COMPLETE" })).toBe(true);
  });

  it("ni masqué, ni sans visuel, ni sans nom", () => {
    expect(isPerfumeVisible({ ...sauvage, status: "DRAFT" }, dior)).toBe(false);
    expect(isPerfumeVisible({ ...sauvage, image: " " }, dior)).toBe(false);
    expect(isPerfumeVisible({ ...sauvage, name: "" }, dior)).toBe(false);
  });
});

describe("cascade et enregistrement", () => {
  it("seul le statut masqué de la marque masque ses parfums (T14)", () => {
    expect(brandHidesPerfumes({ status: "DRAFT", catalogMode: "CURATED" })).toBe(true);
    expect(brandHidesPerfumes({ status: "PUBLISHED", catalogMode: "COMPLETE" })).toBe(false);
    expect(brandHidesPerfumes({ status: "PUBLISHED", catalogMode: "CURATED" })).toBe(false);
  });

  it("un parfum qui ne peut pas être visible est enregistré masqué, avec la raison", () => {
    expect(
      settlePerfumePublication({ status: "PUBLISHED", isFeatured: false }, withVisual, { ...dior, status: "DRAFT" }),
    ).toEqual({ status: "DRAFT", isFeatured: false, hiddenBecause: "Rends d'abord la marque Dior visible." });
  });

  it("masqué, un parfum perd sa mise en avant : aucun emplacement occupé par un invisible", () => {
    expect(settlePerfumePublication({ status: "PUBLISHED", isFeatured: true }, { image: "" }, dior)).toMatchObject({
      status: "DRAFT",
      isFeatured: false,
    });
    expect(settlePerfumePublication({ status: "DRAFT", isFeatured: true }, withVisual, dior)).toEqual({
      status: "DRAFT",
      isFeatured: false,
      hiddenBecause: null,
    });
  });

  it("publiable : la demande passe telle quelle", () => {
    expect(settlePerfumePublication({ status: "PUBLISHED", isFeatured: true }, withVisual, dior)).toEqual({
      status: "PUBLISHED",
      isFeatured: true,
      hiddenBecause: null,
    });
  });
});
