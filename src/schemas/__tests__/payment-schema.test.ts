import { describe, expect, it } from "vitest";
import { paymentCreateSchema, paymentTypeSchema, paymentVoidSchema } from "../payment";

describe("paymentTypeSchema", () => {
  it("accepts known types", () => {
    expect(paymentTypeSchema.safeParse("DEPOSIT").success).toBe(true);
    expect(paymentTypeSchema.safeParse("BALANCE").success).toBe(true);
    expect(paymentTypeSchema.safeParse("REFUND").success).toBe(true);
  });

  it("rejects unknown type", () => {
    expect(paymentTypeSchema.safeParse("OTHER").success).toBe(false);
  });
});

describe("paymentCreateSchema", () => {
  const base = { orderId: "order123", type: "DEPOSIT" as const, amount: "50" };

  it("accepts minimal valid payment", () => {
    expect(paymentCreateSchema.safeParse(base).success).toBe(true);
  });

  it("normalizes comma decimal", () => {
    const r = paymentCreateSchema.safeParse({ ...base, amount: "50,25" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.amount).toBe("50.25");
  });

  it("rejects non-numeric amount", () => {
    expect(paymentCreateSchema.safeParse({ ...base, amount: "abc" }).success).toBe(false);
  });

  it("rejects three-decimal amount", () => {
    expect(paymentCreateSchema.safeParse({ ...base, amount: "10.123" }).success).toBe(false);
  });

  it("accepts paidAt date", () => {
    const r = paymentCreateSchema.safeParse({ ...base, paidAt: "2026-05-13T14:00:00Z" });
    expect(r.success).toBe(true);
  });
});

describe("paymentVoidSchema", () => {
  it("accepts paymentId only", () => {
    expect(paymentVoidSchema.safeParse({ paymentId: "pay1" }).success).toBe(true);
  });

  it("accepts reason", () => {
    expect(
      paymentVoidSchema.safeParse({ paymentId: "pay1", reason: "client renvoie" }).success,
    ).toBe(true);
  });

  it("rejects empty paymentId", () => {
    expect(paymentVoidSchema.safeParse({ paymentId: "" }).success).toBe(false);
  });
});
