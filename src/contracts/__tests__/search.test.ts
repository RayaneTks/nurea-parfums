import { describe, expect, it } from "vitest";
import { parseOrdersParams } from "../documents";
import { foldText, parseSearchParams, phoneDigitVariants, searchTerms } from "../search";

describe("recherche — règles de saisie (06 E10 zone 3, §4.4)", () => {
  it("plie casse, accents et ligatures", () => {
    expect(foldText("Élysée CŒUR Æther")).toBe("elysee coeur aether");
  });

  it("mots d'au moins 2 caractères, distincts, 6 au plus", () => {
    expect(searchTerms("  Dior  x Sauvage dior ")).toEqual(["dior", "sauvage"]);
    expect(searchTerms("aa bb cc dd ee ff gg hh")).toHaveLength(6);
    expect(searchTerms("")).toEqual([]);
    expect(searchTerms(null)).toEqual([]);
  });

  it("un numéro se cherche sous ses formes nationale et internationale", () => {
    expect(phoneDigitVariants("06 12")).toEqual(["0612", "33612"]);
    expect(phoneDigitVariants("+33 6 12")).toEqual(["33612", "0612"]);
    expect(phoneDigitVariants("0033 6 12")).toEqual(["0033612", "33612"]);
    expect(phoneDigitVariants("fares 06")).toBeNull();
    expect(phoneDigitVariants("6")).toBeNull();
  });

  it("paramètres de la route : portée inconnue = « all », saisie rognée", () => {
    expect(parseSearchParams(new URLSearchParams("q=%20fa%20&scope=customers"))).toEqual({ q: "fa", scope: "customers" });
    expect(parseSearchParams(new URLSearchParams("scope=admin"))).toEqual({ q: "", scope: "all" });
  });
});

describe("liste Commandes — paramètres d'URL (06 §1.2 E10)", () => {
  it("défauts, filtre ignoré hors « À livrer », pages bornées", () => {
    expect(parseOrdersParams({})).toEqual({ vue: "a-livrer", filtre: null, q: "", pages: 1 });
    expect(parseOrdersParams({ vue: "livrees", filtre: "retard", q: " fa ", pages: "3" })).toEqual({ vue: "livrees", filtre: null, q: "fa", pages: 3 });
    expect(parseOrdersParams({ vue: "x", filtre: "en-attente", pages: "999" })).toEqual({ vue: "a-livrer", filtre: "en-attente", q: "", pages: 40 });
    expect(parseOrdersParams({ pages: "-2" }).pages).toBe(1);
  });
});
