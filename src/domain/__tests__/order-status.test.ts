import { describe, expect, it } from "vitest";
import {
  canTransition,
  deriveFulfillment,
  remainingToDeliver,
  type TransitionContext,
} from "../order-status";

const base: TransitionContext = {
  depositPaidTotal: 0,
  balancePaidTotal: 0,
  orderTotal: 100,
  hasSale: false,
};

describe("OrderStatus.canTransition (statuts libres, acompte indicatif)", () => {
  it("PENDING → READY autorisé sans acompte (l'admin décide)", () => {
    expect(canTransition("PENDING", "READY", base).ok).toBe(true);
    expect(canTransition("PENDING", "READY", { ...base, depositPaidTotal: 10 }).ok).toBe(true);
  });

  it("PENDING → CANCELLED autorisé", () => {
    expect(canTransition("PENDING", "CANCELLED", base).ok).toBe(true);
  });

  it("PENDING → DELIVERED autorisé en direct (avec au moins un article)", () => {
    expect(canTransition("PENDING", "DELIVERED", { ...base, itemCount: 1 }).ok).toBe(true);
  });

  it("READY → DELIVERED autorisé même avec solde dû (acompte indicatif)", () => {
    expect(
      canTransition("READY", "DELIVERED", {
        ...base,
        depositPaidTotal: 50,
        balancePaidTotal: 0,
        itemCount: 1,
      }).ok,
    ).toBe(true);
  });

  it("READY → PENDING autorisé librement (même avec acompte reçu)", () => {
    expect(canTransition("READY", "PENDING", { ...base, depositPaidTotal: 30 }).ok).toBe(true);
    expect(canTransition("READY", "PENDING", { ...base, depositPaidTotal: 0 }).ok).toBe(true);
  });

  it("DELIVERED → READY bloqué uniquement si une vente est liée", () => {
    expect(canTransition("DELIVERED", "READY", { ...base, hasSale: true }).ok).toBe(false);
    expect(canTransition("DELIVERED", "READY", { ...base, hasSale: false }).ok).toBe(true);
  });

  it("DELIVERED → PENDING autorisé sans vente liée", () => {
    expect(canTransition("DELIVERED", "PENDING", { ...base, hasSale: false }).ok).toBe(true);
    expect(canTransition("DELIVERED", "PENDING", { ...base, hasSale: true }).ok).toBe(false);
  });

  it("CANCELLED est terminal", () => {
    expect(canTransition("CANCELLED", "PENDING", base).ok).toBe(false);
    expect(canTransition("CANCELLED", "READY", base).ok).toBe(false);
    expect(canTransition("CANCELLED", "DELIVERED", base).ok).toBe(false);
  });

  it("→ DELIVERED refusé sans article (garde-fou de cohérence)", () => {
    expect(
      canTransition("READY", "DELIVERED", { ...base, itemCount: 0 }).ok,
    ).toBe(false);
    expect(
      canTransition("PENDING", "DELIVERED", { ...base, itemCount: 0 }).ok,
    ).toBe(false);
  });

  it("statut identique refusé", () => {
    expect(canTransition("PENDING", "PENDING", base).ok).toBe(false);
  });
});

describe("deriveFulfillment", () => {
  it("none when nothing delivered", () => {
    expect(deriveFulfillment([{ quantity: 2, deliveredQuantity: 0 }])).toBe("none");
  });

  it("partial when some but not all delivered", () => {
    expect(deriveFulfillment([{ quantity: 2, deliveredQuantity: 1 }])).toBe("partial");
    expect(
      deriveFulfillment([
        { quantity: 1, deliveredQuantity: 1 },
        { quantity: 1, deliveredQuantity: 0 },
      ]),
    ).toBe("partial");
  });

  it("full when every line fully delivered", () => {
    expect(
      deriveFulfillment([
        { quantity: 2, deliveredQuantity: 2 },
        { quantity: 1, deliveredQuantity: 1 },
      ]),
    ).toBe("full");
  });

  it("clamps over-delivery to full", () => {
    expect(deriveFulfillment([{ quantity: 1, deliveredQuantity: 5 }])).toBe("full");
  });

  it("empty order is none", () => {
    expect(deriveFulfillment([])).toBe("none");
  });
});

describe("remainingToDeliver", () => {
  it("counts lines not fully delivered", () => {
    expect(
      remainingToDeliver([
        { quantity: 2, deliveredQuantity: 2 },
        { quantity: 2, deliveredQuantity: 1 },
        { quantity: 1, deliveredQuantity: 0 },
      ]),
    ).toBe(2);
  });
});
