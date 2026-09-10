import { describe, expect, it } from "vitest";
import { orderSearchWhere, saleSearchWhere, searchTerms } from "../search/filters";

/** Aplatit un `where` imbriqué pour y chercher un champ, quelle que soit sa profondeur. */
function fieldsOf(node: unknown, acc = new Set<string>()): Set<string> {
  if (Array.isArray(node)) {
    for (const n of node) fieldsOf(n, acc);
    return acc;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k !== "OR" && k !== "AND" && k !== "some" && k !== "contains" && k !== "mode") {
        acc.add(k);
      }
      fieldsOf(v, acc);
    }
  }
  return acc;
}

describe("searchTerms", () => {
  it("découpe sur les espaces et déduplique", () => {
    expect(searchTerms("dior  sauvage dior")).toEqual(["dior", "sauvage"]);
  });

  it("écarte les termes d'une lettre, qui matchent presque tout", () => {
    expect(searchTerms("a dior")).toEqual(["dior"]);
  });

  it("rend une liste vide pour une saisie vide ou absente", () => {
    expect(searchTerms("")).toEqual([]);
    expect(searchTerms("   ")).toEqual([]);
    expect(searchTerms(null)).toEqual([]);
    expect(searchTerms(undefined)).toEqual([]);
  });

  it("plafonne le nombre de termes", () => {
    expect(searchTerms("un deux trois quatre cinq six sept huit").length).toBe(6);
  });
});

describe("filtres de recherche", () => {
  it("rendent un filtre NEUTRE sans saisie, pas un filtre qui ne matche rien", () => {
    expect(saleSearchWhere("")).toEqual({});
    expect(orderSearchWhere(null)).toEqual({});
  });

  it("exigent que CHAQUE mot matche : « dior sauvage » n'est pas « dior OU sauvage »", () => {
    const where = saleSearchWhere("dior sauvage") as { AND: unknown[] };
    expect(where.AND).toHaveLength(2);
  });

  it("cherchent au-delà du nom du client — parfum, marque, contact, lot", () => {
    const fields = fieldsOf(saleSearchWhere("sauvage"));
    expect(fields).toContain("customerName");
    expect(fields).toContain("customerContact");
    expect(fields).toContain("perfume");
    expect(fields).toContain("brand");
    expect(fields).toContain("batch");
    expect(fields).toContain("items");
  });

  it("atteignent les parfums hors catalogue, qui ne vivent que dans l'instantané", () => {
    const fields = fieldsOf(orderSearchWhere("sauvage"));
    expect(fields).toContain("perfumeSnapshot");
  });

  it("interrogent aussi la forme sans accents du terme saisi", () => {
    const serialized = JSON.stringify(saleSearchWhere("Élysée"));
    expect(serialized).toContain("Élysée");
    expect(serialized).toContain("Elysee");
  });

  it("n'ajoutent pas de variante inutile quand le terme n'a pas d'accent", () => {
    const clauses = (saleSearchWhere("dior") as { AND: Array<{ OR: unknown[] }> }).AND[0].OR;
    const withAccent = (saleSearchWhere("dïor") as { AND: Array<{ OR: unknown[] }> }).AND[0].OR;
    expect(withAccent.length).toBe(clauses.length * 2);
  });
});
