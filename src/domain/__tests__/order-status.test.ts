import { describe, expect, it } from "vitest";
import { canTransition, type TransitionContext } from "../order-status";

const base: TransitionContext = {
  depositPaidTotal: 0,
  balancePaidTotal: 0,
  orderTotal: 100,
  hasSale: false,
};

describe("OrderStatus.canTransition", () => {
  it("PENDING → READY needs positive deposit", () => {
    expect(canTransition("PENDING", "READY", base).ok).toBe(false);
    expect(canTransition("PENDING", "READY", { ...base, depositPaidTotal: 10 }).ok).toBe(true);
  });

  it("PENDING → CANCELLED always allowed", () => {
    expect(canTransition("PENDING", "CANCELLED", base).ok).toBe(true);
  });

  it("PENDING → DELIVERED rejected (must go via READY)", () => {
    expect(canTransition("PENDING", "DELIVERED", base).ok).toBe(false);
  });

  it("READY → DELIVERED needs full balance", () => {
    expect(
      canTransition("READY", "DELIVERED", {
        ...base,
        depositPaidTotal: 50,
        balancePaidTotal: 49,
      }).ok,
    ).toBe(false);

    expect(
      canTransition("READY", "DELIVERED", {
        ...base,
        depositPaidTotal: 50,
        balancePaidTotal: 50,
      }).ok,
    ).toBe(true);
  });

  it("READY → PENDING requires deposit voided", () => {
    expect(canTransition("READY", "PENDING", { ...base, depositPaidTotal: 30 }).ok).toBe(false);
    expect(canTransition("READY", "PENDING", { ...base, depositPaidTotal: 0 }).ok).toBe(true);
  });

  it("DELIVERED → READY only without linked Sale", () => {
    expect(canTransition("DELIVERED", "READY", { ...base, hasSale: true }).ok).toBe(false);
    expect(canTransition("DELIVERED", "READY", { ...base, hasSale: false }).ok).toBe(true);
  });

  it("CANCELLED is terminal", () => {
    expect(canTransition("CANCELLED", "PENDING", base).ok).toBe(false);
    expect(canTransition("CANCELLED", "READY", base).ok).toBe(false);
    expect(canTransition("CANCELLED", "DELIVERED", base).ok).toBe(false);
  });

  it("READY → DELIVERED needs at least one item", () => {
    expect(
      canTransition("READY", "DELIVERED", {
        ...base,
        depositPaidTotal: 50,
        balancePaidTotal: 50,
        itemCount: 0,
      }).ok,
    ).toBe(false);
  });

  it("same status rejects", () => {
    expect(canTransition("PENDING", "PENDING", base).ok).toBe(false);
  });
});
