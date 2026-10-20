import { describe, expect, it } from "vitest";
import { parseSelection, toggleId } from "../selection";

describe("parseSelection", () => {
  it("garde les identifiants entiers, sans doublon", () => {
    expect(parseSelection("[3, 7, 3, \"x\", 1.5, null]")).toEqual([3, 7]);
  });

  it("vaut liste vide pour une valeur absente, cassée ou d'une autre forme", () => {
    expect(parseSelection(null)).toEqual([]);
    expect(parseSelection("{pas du json")).toEqual([]);
    expect(parseSelection("{\"ids\":[1]}")).toEqual([]);
  });
});

describe("toggleId", () => {
  it("ajoute puis retire", () => {
    expect(toggleId([1], 2)).toEqual([1, 2]);
    expect(toggleId([1, 2], 1)).toEqual([2]);
  });
});
