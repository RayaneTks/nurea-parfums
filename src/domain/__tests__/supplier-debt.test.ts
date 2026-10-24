import { describe, expect, it } from "vitest";
import { dzdFromDb, formatDzd, toDb } from "../money";
import { supplierBalanceState, supplierRemaining, type SupplierEntryKind } from "../supplier-debt";

const entry = (kind: SupplierEntryKind, amount: string) => ({ kind, amountDzd: dzdFromDb(amount) });

describe("carnet fournisseur : reste à payer", () => {
  it("dettes moins versements, au centime, quel que soit l'ordre", () => {
    const remaining = supplierRemaining([
      entry("DEBT", "92700.00"),
      entry("PAYMENT", "60000.00"),
      entry("DEBT", "15600.50"),
      entry("PAYMENT", "0.25"),
    ]);
    expect(toDb(remaining)).toBe("48300.25");
    expect(supplierBalanceState(remaining)).toBe("due");
  });

  it("carnet vide ou soldé : rien à payer", () => {
    expect(supplierBalanceState(supplierRemaining([]))).toBe("settled");
    const settled = supplierRemaining([entry("DEBT", "1000.00"), entry("PAYMENT", "1000.00")]);
    expect(toDb(settled)).toBe("0.00");
    expect(supplierBalanceState(settled)).toBe("settled");
  });

  it("versé plus que dû : avance, négative, affichée telle quelle", () => {
    const advance = supplierRemaining([entry("DEBT", "1000.00"), entry("PAYMENT", "1500.00")]);
    expect(toDb(advance)).toBe("-500.00");
    expect(supplierBalanceState(advance)).toBe("advance");
    expect(formatDzd(advance)).toBe("−500 DA");
  });
});
