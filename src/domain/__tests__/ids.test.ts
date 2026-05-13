import { describe, expect, it } from "vitest";
import { CustomerId, OrderId, PerfumeId } from "../ids";

describe("Branded IDs", () => {
  it("OrderId.parse accepts valid cuid", () => {
    const cuid = "c" + "x".repeat(24);
    expect(() => OrderId.parse(cuid)).not.toThrow();
  });

  it("OrderId.parse rejects bad format", () => {
    expect(() => OrderId.parse("not-a-cuid")).toThrow();
    expect(() => OrderId.parse("")).toThrow();
  });

  it("CustomerId.parse rejects empty string", () => {
    expect(() => CustomerId.parse("")).toThrow();
  });

  it("PerfumeId.parse accepts positive integer", () => {
    expect(() => PerfumeId.parse(42)).not.toThrow();
    expect(() => PerfumeId.parse("42")).not.toThrow();
  });

  it("PerfumeId.parse rejects zero / negative / non-integer", () => {
    expect(() => PerfumeId.parse(0)).toThrow();
    expect(() => PerfumeId.parse(-1)).toThrow();
    expect(() => PerfumeId.parse(1.5)).toThrow();
    expect(() => PerfumeId.parse("abc")).toThrow();
  });

  it("parseUnsafe bypasses runtime check (use only at trusted boundary)", () => {
    expect(() => OrderId.parseUnsafe("anything")).not.toThrow();
    expect(() => PerfumeId.parseUnsafe(42)).not.toThrow();
  });
});
