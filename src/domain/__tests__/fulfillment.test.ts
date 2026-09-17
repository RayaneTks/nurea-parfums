import { describe, expect, it } from "vitest";
import { clampDelivered, deriveFulfillment, remainingToDeliver } from "../fulfillment";

describe("deriveFulfillment", () => {
  it("none quand rien n'est livré", () => {
    expect(deriveFulfillment([{ quantity: 2, deliveredQuantity: 0 }])).toBe("none");
  });

  it("partial quand une partie seulement est livrée", () => {
    expect(deriveFulfillment([{ quantity: 2, deliveredQuantity: 1 }])).toBe("partial");
    expect(
      deriveFulfillment([
        { quantity: 1, deliveredQuantity: 1 },
        { quantity: 1, deliveredQuantity: 0 },
      ]),
    ).toBe("partial");
  });

  it("full quand chaque ligne est entièrement livrée", () => {
    expect(
      deriveFulfillment([
        { quantity: 2, deliveredQuantity: 2 },
        { quantity: 1, deliveredQuantity: 1 },
      ]),
    ).toBe("full");
  });

  it("une sur-livraison se borne à full", () => {
    expect(deriveFulfillment([{ quantity: 1, deliveredQuantity: 5 }])).toBe("full");
  });

  it("un document sans ligne est none", () => {
    expect(deriveFulfillment([])).toBe("none");
  });
});

describe("remainingToDeliver", () => {
  it("compte les lignes pas entièrement livrées", () => {
    expect(
      remainingToDeliver([
        { quantity: 2, deliveredQuantity: 2 },
        { quantity: 2, deliveredQuantity: 1 },
        { quantity: 1, deliveredQuantity: 0 },
      ]),
    ).toBe(2);
  });
});

describe("clampDelivered", () => {
  it("borne le pointage à 0..quantité", () => {
    expect(clampDelivered(-1, 3)).toBe(0);
    expect(clampDelivered(2, 3)).toBe(2);
    expect(clampDelivered(7, 3)).toBe(3);
  });
});
