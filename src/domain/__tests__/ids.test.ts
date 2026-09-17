import { describe, expect, it } from "vitest";
import { CustomerId, DocumentId, PerfumeId, isTextId, newId } from "../ids";

const CUID = "c" + "x1".repeat(12);

describe("newId", () => {
  it("rend un UUID v4 en minuscules, accepté comme identifiant de document", () => {
    const id = newId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(DocumentId.parse(id)).toBe(id);
  });

  it("ne se répète pas", () => {
    expect(new Set(Array.from({ length: 100 }, newId)).size).toBe(100);
  });
});

describe("identifiants texte", () => {
  it("acceptent un cuid (créations serveur, reprise) et un UUID (créations client)", () => {
    expect(() => DocumentId.parse(CUID)).not.toThrow();
    expect(() => CustomerId.parse("0b8f3c9e-2d4a-4f6b-9c1d-7e5a3b2c1d0e")).not.toThrow();
  });

  it("refusent une forme inconnue, une chaîne vide et un UUID en majuscules", () => {
    expect(() => DocumentId.parse("not-a-cuid")).toThrow();
    expect(() => DocumentId.parse("")).toThrow();
    expect(isTextId("0B8F3C9E-2D4A-4F6B-9C1D-7E5A3B2C1D0E")).toBe(false);
  });

  it("safeParse rend null au lieu de lever (paramètre d'URL fabriqué)", () => {
    expect(DocumentId.safeParse("abc")).toBeNull();
    expect(DocumentId.safeParse(undefined)).toBeNull();
    expect(DocumentId.safeParse(CUID)).toBe(CUID);
  });

  it("parseUnsafe ne contrôle rien (valeur relue en base)", () => {
    expect(() => DocumentId.parseUnsafe("anything")).not.toThrow();
  });
});

describe("PerfumeId", () => {
  it("accepte un entier positif, en nombre ou en chaîne", () => {
    expect(PerfumeId.parse(42)).toBe(42);
    expect(PerfumeId.parse("42")).toBe(42);
  });

  it("refuse zéro, négatif, décimal, texte et dépassement d'int4", () => {
    expect(() => PerfumeId.parse(0)).toThrow();
    expect(() => PerfumeId.parse(-1)).toThrow();
    expect(() => PerfumeId.parse(1.5)).toThrow();
    expect(() => PerfumeId.parse("abc")).toThrow();
    expect(() => PerfumeId.parse("1e3")).toThrow();
    expect(() => PerfumeId.parse(" 42")).toThrow();
    expect(() => PerfumeId.parse(2_147_483_648)).toThrow();
    expect(PerfumeId.safeParse("12abc")).toBeNull();
  });

  it("parseUnsafe ne contrôle rien", () => {
    expect(() => PerfumeId.parseUnsafe(42)).not.toThrow();
  });
});
