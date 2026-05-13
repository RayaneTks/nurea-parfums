import { describe, expect, it } from "vitest";
import {
  add,
  dzdToEur,
  eq,
  eur,
  dzd,
  format,
  gt,
  isPositive,
  mul,
  parse,
  serialize,
  sub,
  sum,
  zero,
} from "../money";

describe("Money", () => {
  it("constructs EUR from number / string / comma-decimal", () => {
    expect(serialize(eur(10))).toBe("10.00");
    expect(serialize(eur("10.5"))).toBe("10.50");
    expect(serialize(eur("10,50"))).toBe("10.50");
  });

  it("add / sub / mul preserve precision (no float drift)", () => {
    const a = eur("0.1");
    const b = eur("0.2");
    expect(serialize(add(a, b))).toBe("0.30");
    expect(serialize(sub(eur(1), eur("0.7")))).toBe("0.30");
    expect(serialize(mul(eur("19.99"), 3))).toBe("59.97");
  });

  it("rejects currency mismatch on add/sub/gt", () => {
    expect(() => add(eur(1), dzd(1))).toThrow();
    expect(() => sub(eur(1), dzd(1))).toThrow();
    expect(() => gt(eur(1), dzd(1))).toThrow();
  });

  it("dzdToEur uses rate as DZD-per-EUR", () => {
    const cost = dzd(36000);
    const inEur = dzdToEur(cost, 277);
    expect(Number(serialize(inEur))).toBeCloseTo(129.96, 2);
  });

  it("dzdToEur rejects zero/negative rate", () => {
    expect(() => dzdToEur(dzd(100), 0)).toThrow();
    expect(() => dzdToEur(dzd(100), -1)).toThrow();
  });

  it("sum aggregates list with currency", () => {
    expect(serialize(sum([eur(1), eur(2), eur(3)], "EUR"))).toBe("6.00");
    expect(serialize(sum([], "EUR"))).toBe("0.00");
  });

  it("parse handles null/empty as zero", () => {
    expect(eq(parse(null, "EUR"), zero("EUR"))).toBe(true);
    expect(eq(parse("", "EUR"), zero("EUR"))).toBe(true);
    expect(eq(parse(undefined, "EUR"), zero("EUR"))).toBe(true);
  });

  it("format outputs fr-FR currency string", () => {
    const s = format(eur("1234.56"));
    expect(s).toMatch(/1\s?234,56/);
    expect(s).toMatch(/€/);
  });

  it("isPositive excludes zero", () => {
    expect(isPositive(eur(1))).toBe(true);
    expect(isPositive(eur(0))).toBe(false);
    expect(isPositive(eur(-1))).toBe(false);
  });
});
