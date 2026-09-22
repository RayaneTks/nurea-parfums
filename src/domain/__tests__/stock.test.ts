import { describe, expect, it } from "vitest";
import { NeedsConfirmation } from "@/domain/errors";
import {
  LOW_STOCK_THRESHOLD,
  applyDeliveredDelta,
  insufficientStock,
  stockLabel,
  stockStatus,
} from "@/domain/stock";

describe("stockStatus", () => {
  it("null → non suivi : ni rupture, ni alerte", () => {
    expect(stockStatus(null)).toBe("untracked");
  });
  it("0 ou moins → rupture", () => {
    expect(stockStatus(0)).toBe("out");
    expect(stockStatus(-2)).toBe("out");
  });
  it("≤ seuil → bas", () => {
    expect(stockStatus(1)).toBe("low");
    expect(stockStatus(LOW_STOCK_THRESHOLD)).toBe("low");
  });
  it("> seuil → ok", () => {
    expect(stockStatus(LOW_STOCK_THRESHOLD + 1)).toBe("ok");
    expect(stockStatus(50)).toBe("ok");
  });
  it("libellés du lexique", () => {
    expect(stockLabel("untracked")).toBe("Non suivi");
    expect(stockLabel("out")).toBe("Rupture");
    expect(stockLabel("low")).toBe("Stock bas");
    expect(stockLabel("ok")).toBe("En stock");
  });
});

describe("applyDeliveredDelta — réserve de plancher", () => {
  it("non suivi : rien ne bouge, aucune réserve", () => {
    expect(applyDeliveredDelta({ stock: null, deliveredDelta: 3, perfumeName: "Sauvage" })).toEqual({
      next: null,
      reserve: null,
    });
  });

  it("des unités livrées sortent, des unités rendues reviennent", () => {
    expect(applyDeliveredDelta({ stock: 5, deliveredDelta: 2, perfumeName: "Sauvage" })).toEqual({
      next: 3,
      reserve: null,
    });
    expect(applyDeliveredDelta({ stock: 0, deliveredDelta: -2, perfumeName: "Sauvage" })).toEqual({
      next: 2,
      reserve: null,
    });
  });

  it("descendre exactement à 0 ne demande rien", () => {
    expect(applyDeliveredDelta({ stock: 2, deliveredDelta: 2, perfumeName: "Sauvage" }).reserve).toBeNull();
  });

  it("au-delà du stock : réserve, et la valeur confirmée est 0", () => {
    expect(applyDeliveredDelta({ stock: 1, deliveredDelta: 3, perfumeName: "Sauvage" })).toEqual({
      next: 0,
      reserve: "Stock de Sauvage à 1 : la fiche passera à 0.",
    });
  });

  it("déjà en rupture : la réserve le dit sans « passer de 0 à 0 »", () => {
    expect(applyDeliveredDelta({ stock: 0, deliveredDelta: 1, perfumeName: "Sauvage" }).reserve).toBe(
      "Sauvage est en rupture : la fiche restera à 0.",
    );
  });

  it("dialogue « Stock insuffisant » · « Continuer » (06 S18)", () => {
    const n = insufficientStock(["Stock de Sauvage à 1 : la fiche passera à 0."]);
    expect(n).toBeInstanceOf(NeedsConfirmation);
    expect([n.title, n.confirmLabel]).toEqual(["Stock insuffisant", "Continuer"]);
  });
});
