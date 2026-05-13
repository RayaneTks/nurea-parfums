import { describe, expect, it } from "vitest";
import { customerCreateSchema, customerSearchSchema, customerUpdateSchema } from "../customer";

describe("customerCreateSchema", () => {
  const minimal = { fullName: "Alice Dupont" };

  it("accepts minimal valid customer (name only)", () => {
    const r = customerCreateSchema.safeParse(minimal);
    expect(r.success).toBe(true);
  });

  it("rejects too-short name", () => {
    expect(customerCreateSchema.safeParse({ fullName: "A" }).success).toBe(false);
  });

  it("trims fullName", () => {
    const r = customerCreateSchema.safeParse({ fullName: "  Alice  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.fullName).toBe("Alice");
  });

  it("accepts valid E.164 phone", () => {
    expect(
      customerCreateSchema.safeParse({ ...minimal, phoneE164: "+33612345678" }).success,
    ).toBe(true);
  });

  it("rejects phone without + prefix", () => {
    expect(customerCreateSchema.safeParse({ ...minimal, phoneE164: "0612345678" }).success).toBe(
      false,
    );
  });

  it("normalizes empty optional fields to null", () => {
    const r = customerCreateSchema.safeParse({
      ...minimal,
      phoneE164: "",
      snapchat: "",
      address: "",
      notes: "",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.phoneE164).toBeNull();
      expect(r.data.snapchat).toBeNull();
      expect(r.data.address).toBeNull();
      expect(r.data.notes).toBeNull();
    }
  });
});

describe("customerUpdateSchema", () => {
  it("accepts empty partial update", () => {
    expect(customerUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("accepts single-field update", () => {
    expect(customerUpdateSchema.safeParse({ fullName: "Bob Marley" }).success).toBe(true);
  });

  it("validates each provided field", () => {
    expect(customerUpdateSchema.safeParse({ fullName: "B" }).success).toBe(false);
  });
});

describe("customerSearchSchema", () => {
  it("rejects empty query", () => {
    expect(customerSearchSchema.safeParse({ q: "" }).success).toBe(false);
  });

  it("defaults limit to 10", () => {
    const r = customerSearchSchema.safeParse({ q: "alice" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(10);
  });

  it("clamps limit to 50 max", () => {
    expect(customerSearchSchema.safeParse({ q: "alice", limit: 99 }).success).toBe(false);
  });
});
