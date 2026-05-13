import { describe, expect, it } from "vitest";
import {
  createOrderInputSchema,
  orderItemInputSchema,
  orderListFilterSchema,
  updateOrderInputSchema,
} from "../order";

const validItem = {
  perfumeId: 1,
  perfumeSnapshot: undefined,
  quantity: 1,
  volumeMl: 100,
  unitPrice: "100.00",
  unitCostDzd: "0",
  exchangeRate: "0",
  note: null,
};

describe("orderItemInputSchema", () => {
  it("accepts valid item with perfumeId", () => {
    const r = orderItemInputSchema.safeParse(validItem);
    expect(r.success).toBe(true);
  });

  it("accepts off-catalog item with snapshot", () => {
    const r = orderItemInputSchema.safeParse({
      ...validItem,
      perfumeId: null,
      perfumeSnapshot: { name: "Custom", brandName: "Indie" },
    });
    expect(r.success).toBe(true);
  });

  it("rejects perfumeId null without snapshot", () => {
    const r = orderItemInputSchema.safeParse({
      ...validItem,
      perfumeId: null,
      perfumeSnapshot: null,
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid volumeMl", () => {
    const r = orderItemInputSchema.safeParse({ ...validItem, volumeMl: 75 });
    expect(r.success).toBe(false);
  });

  it("normalizes comma decimal in unitPrice", () => {
    const r = orderItemInputSchema.safeParse({ ...validItem, unitPrice: "120,50" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.unitPrice).toBe("120.50");
  });
});

describe("createOrderInputSchema", () => {
  const base = {
    customerName: "Alice Dupont",
    items: [validItem],
  };

  it("accepts minimal valid order", () => {
    const r = createOrderInputSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it("rejects short customerName", () => {
    const r = createOrderInputSchema.safeParse({ ...base, customerName: "X" });
    expect(r.success).toBe(false);
  });

  it("rejects empty items", () => {
    const r = createOrderInputSchema.safeParse({ ...base, items: [] });
    expect(r.success).toBe(false);
  });

  it("accepts initialDeposit > 0", () => {
    const r = createOrderInputSchema.safeParse({
      ...base,
      initialDeposit: { amount: "30", method: "cash" },
    });
    expect(r.success).toBe(true);
  });

  it("rejects initialDeposit with zero amount", () => {
    const r = createOrderInputSchema.safeParse({
      ...base,
      initialDeposit: { amount: "0", method: null },
    });
    expect(r.success).toBe(false);
  });
});

describe("updateOrderInputSchema", () => {
  it("accepts partial update (status only)", () => {
    const r = updateOrderInputSchema.safeParse({ status: "READY" });
    expect(r.success).toBe(true);
  });

  it("rejects unknown status", () => {
    const r = updateOrderInputSchema.safeParse({ status: "FOO" });
    expect(r.success).toBe(false);
  });
});

describe("orderListFilterSchema", () => {
  it("defaults limit + includeDelivered", () => {
    const r = orderListFilterSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.limit).toBe(50);
      expect(r.data.includeDelivered).toBe(false);
    }
  });

  it("clamps limit upper bound", () => {
    const r = orderListFilterSchema.safeParse({ limit: 999 });
    expect(r.success).toBe(false);
  });

  it("coerces string boolean to bool", () => {
    const r = orderListFilterSchema.safeParse({ includeDelivered: "true" });
    expect(r.success).toBe(true);
  });
});
