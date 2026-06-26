import { describe, expect, it } from "vitest";
import { orderComptaMath } from "@/server/orders/financials";

const item = (unitPrice: string, quantity: number, unitCost: string) => ({
  unitPrice,
  quantity,
  unitCost,
});
const pay = (type: string, amount: string) => ({ type, amount });

describe("orderComptaMath", () => {
  it("encaissé = paiements, marge = encaissé − coût", () => {
    const m = orderComptaMath(
      [item("50", 2, "20")], // total 100, coût 40
      [pay("DEPOSIT", "30"), pay("BALANCE", "20")], // payé 50
    );
    expect(m.total).toBe("100.00");
    expect(m.cost).toBe("40.00");
    expect(m.cashed).toBe("50.00");
    expect(m.due).toBe("50.00");
    expect(m.net).toBe("10.00"); // 50 − 40
  });

  it("rembourse­ment réduit l'encaissé", () => {
    const m = orderComptaMath(
      [item("100", 1, "30")],
      [pay("DEPOSIT", "100"), pay("REFUND", "40")],
    );
    expect(m.cashed).toBe("60.00");
    expect(m.due).toBe("40.00");
    expect(m.net).toBe("30.00");
  });

  it("encaissé plafonné au total (pas de sur-encaissement)", () => {
    const m = orderComptaMath([item("50", 1, "10")], [pay("DEPOSIT", "80")]);
    expect(m.cashed).toBe("50.00");
    expect(m.due).toBe("0.00");
  });

  it("rien payé → encaissé 0, dû = total", () => {
    const m = orderComptaMath([item("40", 1, "15")], []);
    expect(m.cashed).toBe("0.00");
    expect(m.due).toBe("40.00");
    expect(m.net).toBe("-15.00"); // coût compté même sans encaissement
  });
});
