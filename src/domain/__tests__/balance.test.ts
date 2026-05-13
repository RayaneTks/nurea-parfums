import { describe, expect, it } from "vitest";
import { computeBalance } from "../balance";

describe("computeBalance", () => {
  it("no items / no payments → all zero", () => {
    const r = computeBalance([], []);
    expect(r).toEqual({
      total: "0.00",
      depositPaid: "0.00",
      balancePaid: "0.00",
      refunded: "0.00",
      totalPaid: "0.00",
      due: "0.00",
    });
  });

  it("items only, no payments → full due", () => {
    const r = computeBalance(
      [
        { unitPrice: "120.00", quantity: 1 },
        { unitPrice: "50.00", quantity: 2 },
      ],
      [],
    );
    expect(r.total).toBe("220.00");
    expect(r.totalPaid).toBe("0.00");
    expect(r.due).toBe("220.00");
  });

  it("single DEPOSIT covers part of total", () => {
    const r = computeBalance(
      [{ unitPrice: "100.00", quantity: 1 }],
      [{ type: "DEPOSIT", amount: "30.00" }],
    );
    expect(r.depositPaid).toBe("30.00");
    expect(r.due).toBe("70.00");
  });

  it("DEPOSIT + BALANCE = total → due is 0", () => {
    const r = computeBalance(
      [{ unitPrice: "100.00", quantity: 1 }],
      [
        { type: "DEPOSIT", amount: "30.00" },
        { type: "BALANCE", amount: "70.00" },
      ],
    );
    expect(r.due).toBe("0.00");
    expect(r.totalPaid).toBe("100.00");
  });

  it("REFUND decreases totalPaid", () => {
    const r = computeBalance(
      [{ unitPrice: "100.00", quantity: 1 }],
      [
        { type: "DEPOSIT", amount: "50.00" },
        { type: "REFUND", amount: "50.00" },
      ],
    );
    expect(r.depositPaid).toBe("50.00");
    expect(r.refunded).toBe("50.00");
    expect(r.totalPaid).toBe("0.00");
    expect(r.due).toBe("100.00");
  });

  it("multiple deposits accumulate", () => {
    const r = computeBalance(
      [{ unitPrice: "200.00", quantity: 1 }],
      [
        { type: "DEPOSIT", amount: "50.00" },
        { type: "DEPOSIT", amount: "30.00" },
        { type: "DEPOSIT", amount: "20.00" },
      ],
    );
    expect(r.depositPaid).toBe("100.00");
    expect(r.due).toBe("100.00");
  });

  it("overpayment → negative due (trop-perçu)", () => {
    const r = computeBalance(
      [{ unitPrice: "100.00", quantity: 1 }],
      [{ type: "BALANCE", amount: "150.00" }],
    );
    expect(r.due).toBe("-50.00");
  });

  it("preserves Decimal precision (no float drift)", () => {
    const r = computeBalance(
      [{ unitPrice: "0.10", quantity: 3 }],
      [{ type: "DEPOSIT", amount: "0.20" }],
    );
    expect(r.total).toBe("0.30");
    expect(r.due).toBe("0.10");
  });

  it("number and string amounts both accepted", () => {
    const r = computeBalance(
      [{ unitPrice: 100, quantity: 2 }],
      [{ type: "DEPOSIT", amount: 50 }],
    );
    expect(r.total).toBe("200.00");
    expect(r.due).toBe("150.00");
  });
});
