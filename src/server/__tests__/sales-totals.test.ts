import { describe, expect, it } from "vitest";
import { _computeSaleTotals } from "../sales/actions";
import type { SaleItemInput } from "@/schemas/sale";

function item(overrides: Partial<SaleItemInput> = {}): SaleItemInput {
  return {
    perfumeId: 1,
    perfumeSnapshot: undefined,
    quantity: 1,
    volumeMl: 100,
    unitPrice: "100",
    unitCostDzd: "0",
    exchangeRate: "0",
    ...overrides,
  };
}

describe("_computeSaleTotals", () => {
  it("single line no cost → margin = revenue", () => {
    const r = _computeSaleTotals([item({ unitPrice: "120", quantity: 1 })]);
    expect(r.totalRevenue).toBe("120.00");
    expect(r.totalCost).toBe("0.00");
    expect(r.totalMargin).toBe("120.00");
  });

  it("dzd cost / exchange rate → margin = revenue - dzd/rate*qty", () => {
    const r = _computeSaleTotals([
      item({ unitPrice: "120", quantity: 2, unitCostDzd: "30000", exchangeRate: "277" }),
    ]);
    // 30000/277 = 108.30..., × 2 = 216.61
    expect(r.totalRevenue).toBe("240.00");
    // due au toFixed(2) Decimal.js light : approximation
    expect(Number(r.totalCost)).toBeCloseTo(216.61, 1);
    expect(Number(r.totalMargin)).toBeCloseTo(23.39, 1);
  });

  it("multiple lines sum correctly", () => {
    const r = _computeSaleTotals([
      item({ unitPrice: "100", quantity: 2 }),
      item({ unitPrice: "50", quantity: 1 }),
    ]);
    expect(r.totalRevenue).toBe("250.00");
  });

  it("exchange rate zero → unitCost = 0 (no division by zero)", () => {
    const r = _computeSaleTotals([
      item({ unitPrice: "100", unitCostDzd: "30000", exchangeRate: "0" }),
    ]);
    expect(r.totalCost).toBe("0.00");
  });

  it("Decimal precision: no float drift on cost calc", () => {
    const r = _computeSaleTotals([
      item({ unitPrice: "0.10", quantity: 3 }),
      item({ unitPrice: "0.20", quantity: 1 }),
    ]);
    expect(r.totalRevenue).toBe("0.50");
  });
});
