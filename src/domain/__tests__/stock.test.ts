import { describe, expect, it } from "vitest";
import { stockStatus, stockLabel, LOW_STOCK_THRESHOLD } from "@/domain/stock";

describe("stockStatus", () => {
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
  it("labels", () => {
    expect(stockLabel("out")).toBe("Rupture");
    expect(stockLabel("low")).toBe("Stock bas");
    expect(stockLabel("ok")).toBe("En stock");
  });
});
