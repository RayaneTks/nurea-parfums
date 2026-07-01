import { describe, expect, it } from "vitest";
import { resolveUnitCostEur } from "../../lib/gestion/orderLineValidation";

/**
 * Régression : le formulaire mobile (vente + commande) envoie le coût en DZD + taux,
 * jamais un `unitCost` euro. L'ancienne API faisait `Number(undefined)` = NaN et
 * rejetait toute vente (« Prix d'achat invalide »). resolveUnitCostEur doit dériver.
 */
describe("resolveUnitCostEur", () => {
  it("dérive l'euro depuis DZD / taux quand aucun unitCost n'est fourni", () => {
    const eur = resolveUnitCostEur({ unitCostDzd: "5540", exchangeRate: "277" });
    expect(eur).toBeCloseTo(20, 5);
  });

  it("ne rejette pas quand unitCost est absent (bug ventes)", () => {
    expect(resolveUnitCostEur({ unitCostDzd: "2770", exchangeRate: "277" })).not.toBeNull();
  });

  it("retourne 0 quand aucune info de coût (don / coût inconnu)", () => {
    expect(resolveUnitCostEur({})).toBe(0);
    expect(resolveUnitCostEur({ unitCostDzd: "0", exchangeRate: "277" })).toBe(0);
    expect(resolveUnitCostEur({ unitCostDzd: "5540", exchangeRate: "0" })).toBe(0);
  });

  it("privilégie un unitCost euro explicite strictement positif", () => {
    expect(resolveUnitCostEur({ unitCost: "18.5", unitCostDzd: "5540", exchangeRate: "277" })).toBe(18.5);
  });

  it("accepte la virgule décimale (saisie FR)", () => {
    expect(resolveUnitCostEur({ unitCost: "18,5" })).toBe(18.5);
  });

  it("rejette (null) un unitCost euro explicite négatif ou non numérique", () => {
    expect(resolveUnitCostEur({ unitCost: "-3" })).toBeNull();
    expect(resolveUnitCostEur({ unitCost: "abc" })).toBeNull();
  });
});
