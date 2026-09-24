import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/catalogue-service", () => ({ getUnlistedPerfumes: async () => [] }));
vi.mock("../../catalogue-service", () => ({ getUnlistedPerfumes: async () => [] }));

const { searchUnlisted } = await import("../searchPerfumeWithFallback");

const UNLISTED = [
  { name: "Naxos", brand: "Xerjoff" },
  { name: "Oud Wood", brand: "Tom Ford" },
];

describe("recherche publique des parfums hors vitrine", () => {
  it("retrouve le parfum masqué, accents, casse et petite faute tolérés", () => {
    expect(searchUnlisted(UNLISTED, "naxos")).toEqual({ name: "Naxos", brand: "Xerjoff", on: "perfume" });
    expect(searchUnlisted(UNLISTED, "OUD WOD")).toEqual({ name: "Oud Wood", brand: "Tom Ford", on: "perfume" });
  });

  it("saisie de la marque seule : on parle de la marque, pas d'un parfum pris au hasard", () => {
    expect(searchUnlisted(UNLISTED, "xerjoff")).toMatchObject({ brand: "Xerjoff", on: "brand" });
  });

  it("rien d'approchant : null", () => {
    expect(searchUnlisted(UNLISTED, "baccarat rouge")).toBeNull();
  });
});
