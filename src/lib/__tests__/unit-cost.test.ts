import { describe, expect, it } from "vitest";
import { resolveUnitCostEur } from "@/lib/gestion/orderLineValidation";

describe("resolveUnitCostEur", () => {
  it("convertit le coût saisi en dinars avec le taux", () => {
    // Cas réel du terrain : 4400 DZD au taux 274 ≈ 16,06 €.
    const eur = resolveUnitCostEur({ unitCostDzd: "4400", exchangeRate: "274" });
    expect(eur).toBeCloseTo(16.0584, 4);
  });

  it("accepte un payload sans unitCost — l'écran Vendre n'en envoie pas", () => {
    // Régression : `Number(undefined)` valait NaN et faisait échouer toute
    // vente portant un coût, avec « Prix d'achat (ton coût) invalide ».
    expect(resolveUnitCostEur({ unitCostDzd: "4400", exchangeRate: "274" })).not.toBeNull();
  });

  it("accepte un coût déjà exprimé en euros", () => {
    expect(resolveUnitCostEur({ unitCost: "16.06" })).toBe(16.06);
    expect(resolveUnitCostEur({ unitCost: 12 })).toBe(12);
  });

  it("préfère l'euro explicite au couple dinars/taux", () => {
    expect(
      resolveUnitCostEur({ unitCost: "20", unitCostDzd: "4400", exchangeRate: "274" }),
    ).toBe(20);
  });

  it("vaut 0 quand rien n'est saisi", () => {
    expect(resolveUnitCostEur({})).toBe(0);
    expect(resolveUnitCostEur({ unitCostDzd: "", exchangeRate: "" })).toBe(0);
    expect(resolveUnitCostEur({ unitCostDzd: "0", exchangeRate: "274" })).toBe(0);
  });

  it("vaut 0 sans taux exploitable plutôt que de diviser par zéro", () => {
    expect(resolveUnitCostEur({ unitCostDzd: "4400", exchangeRate: "0" })).toBe(0);
    expect(resolveUnitCostEur({ unitCostDzd: "4400" })).toBe(0);
  });

  it("rejette une saisie inexploitable au lieu d'enregistrer un coût faux", () => {
    expect(resolveUnitCostEur({ unitCostDzd: "abc", exchangeRate: "274" })).toBeNull();
    expect(resolveUnitCostEur({ unitCostDzd: "-10", exchangeRate: "274" })).toBeNull();
    expect(resolveUnitCostEur({ unitCost: "-1" })).toBeNull();
  });

  it("accepte la virgule décimale des claviers français", () => {
    expect(resolveUnitCostEur({ unitCost: "16,06" })).toBe(16.06);
  });
});
