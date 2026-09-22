import { describe, expect, it } from "vitest";
import { filterOptions, normalizeSearch } from "../select-search";

const clients = [
  { label: "Farès Benali", description: "06 12 34 56 78", keywords: ["+33612345678", "fares.b"] },
  { label: "Lina Haddad", description: "@lina_h" },
  { label: "Nadia Farès", description: "" },
  { label: "Cœur de Lune", keywords: ["Lattafa"] },
];

describe("normalizeSearch", () => {
  it("ignore accents, casse, ligatures et blancs multiples", () => {
    expect(normalizeSearch("  FARÈS   Benali ")).toBe("fares benali");
    expect(normalizeSearch("Cœur")).toBe("coeur");
    expect(normalizeSearch("Ëlïse")).toBe("elise");
  });
});

describe("filterOptions — SelectSheet", () => {
  it("insensible aux accents dans les deux sens", () => {
    expect(filterOptions(clients, "fares").map((o) => o.label)).toEqual(["Farès Benali", "Nadia Farès"]);
    expect(filterOptions(clients, "coeur").map((o) => o.label)).toEqual(["Cœur de Lune"]);
  });

  it("tous les mots, dans n'importe quel ordre", () => {
    expect(filterOptions(clients, "benali far").map((o) => o.label)).toEqual(["Farès Benali"]);
  });

  it("cherche aussi la légende et les mots-clés non affichés", () => {
    expect(filterOptions(clients, "lina_h").map((o) => o.label)).toEqual(["Lina Haddad"]);
    expect(filterOptions(clients, "+3361234").map((o) => o.label)).toEqual(["Farès Benali"]);
    expect(filterOptions(clients, "lattafa").map((o) => o.label)).toEqual(["Cœur de Lune"]);
  });

  it("un libellé qui commence par la saisie passe devant", () => {
    const options = [{ label: "Nadia Farès" }, { label: "Farès Benali" }];
    expect(filterOptions(options, "far").map((o) => o.label)).toEqual(["Farès Benali", "Nadia Farès"]);
  });

  it("saisie vide : toutes les options, dans l'ordre", () => {
    expect(filterOptions(clients, "   ")).toEqual(clients);
  });
});
