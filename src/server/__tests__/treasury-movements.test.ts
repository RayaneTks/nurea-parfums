import { describe, expect, it } from "vitest";
import { signedAmount } from "@/server/treasury/movements";

describe("signedAmount", () => {
  it("entrées → positif (magnitude absolue)", () => {
    for (const k of ["OPENING", "SALE_IN", "DEPOSIT_IN", "BALANCE_IN"] as const) {
      expect(signedAmount(k, 30).toString()).toBe("30");
      expect(signedAmount(k, -30).toString()).toBe("30");
    }
  });

  it("sorties → négatif", () => {
    for (const k of ["REFUND_OUT", "EXPENSE_OUT", "SUPPLIER_OUT"] as const) {
      expect(signedAmount(k, 30).toString()).toBe("-30");
      expect(signedAmount(k, -30).toString()).toBe("-30");
    }
  });

  it("TRANSFER / ADJUSTMENT → montant signé tel quel", () => {
    expect(signedAmount("TRANSFER", -50).toString()).toBe("-50");
    expect(signedAmount("TRANSFER", 50).toString()).toBe("50");
    expect(signedAmount("ADJUSTMENT", -12.5).toString()).toBe("-12.5");
    expect(signedAmount("ADJUSTMENT", 12.5).toString()).toBe("12.5");
  });
});
