import { describe, expect, it } from "vitest";
import { formatReferences } from "../export-references";

const REFS = [
  { brand: "Tom Ford Private Blend", name: "Tobacco Vanille", online: true },
  { brand: "Emporio Armani", name: "Stronger With You", online: false },
  { brand: "Tom Ford Private Blend", name: "Bitter Peach", online: true },
  { brand: "Émilie", name: "Été", online: true },
];
const date = new Date("2026-10-03T10:00:00Z");

describe("liste des références à envoyer", () => {
  it("range par marque puis par nom, accents compris, avec les comptes", () => {
    expect(formatReferences(REFS, { statut: false, date })).toBe(
      [
        "NURÉA PARFUMS — Références au catalogue (03/10/2026)",
        "3 marques, 4 parfums",
        "",
        "ÉMILIE (1)",
        "- Été",
        "",
        "EMPORIO ARMANI (1)",
        "- Stronger With You",
        "",
        "TOM FORD PRIVATE BLEND (2)",
        "- Bitter Peach",
        "- Tobacco Vanille",
        "",
      ].join("\n"),
    );
  });

  it("le statut n'apparaît qu'à la demande", () => {
    expect(formatReferences(REFS, { statut: false, date })).not.toContain("pas en ligne");
    expect(formatReferences(REFS, { statut: true, date })).toContain("- Stronger With You (pas en ligne)");
  });
});
