import { describe, expect, it } from "vitest";
import { eurFromDb, toWire, type Eur } from "../money";
import {
  documentBalance,
  isOldReceivable,
  receivableAgeDays,
  type BalanceLine,
} from "../document-balance";

const E = (text: string): Eur => eurFromDb(text);
const line = (quantity: number, price: string, cost: string | null): BalanceLine => ({
  quantity,
  unitPriceEur: E(price),
  unitCostEur: cost === null ? null : E(cost),
});
const pay = (amount: string) => ({ amount: E(amount) });

/** Lecture en MoneyString, `null` conservé : comparable à une ligne de la vue. */
function wire(b: ReturnType<typeof documentBalance>) {
  return {
    total: toWire(b.total),
    cost: b.cost === null ? null : toWire(b.cost),
    knownCost: toWire(b.knownCost),
    hasUnknownCost: b.hasUnknownCost,
    paid: toWire(b.paid),
    due: toWire(b.due),
    overpaid: toWire(b.overpaid),
    marginBeforeExpenses: b.marginBeforeExpenses === null ? null : toWire(b.marginBeforeExpenses),
  };
}

describe("documentBalance — jumeau de la vue DocumentBalance", () => {
  it("total, coût, payé net et dû d'un document courant", () => {
    const b = documentBalance(
      [line(2, "120.00", "32.49"), line(1, "0.00", "20.00")], // la seconde est offerte : coût compté
      [pay("100.00"), pay("50.00"), pay("-30.00")], // acompte, solde, remboursement
    );
    expect(wire(b)).toEqual({
      total: "240.00",
      cost: "84.98",
      knownCost: "84.98",
      hasUnknownCost: false,
      paid: "120.00",
      due: "120.00",
      overpaid: "0.00",
      marginBeforeExpenses: "155.02",
    });
  });

  it("un trop-perçu ne fait pas descendre le dû sous 0", () => {
    const b = documentBalance([line(1, "100.00", "30.00")], [pay("130.00")]);
    expect(toWire(b.due)).toBe("0.00");
    expect(toWire(b.overpaid)).toBe("30.00");
    expect(toWire(b.paid)).toBe("130.00");
  });

  it("coût inconnu : cost et marge à null, knownCost compte l'inconnu 0 comme la vue", () => {
    const b = documentBalance([line(1, "120.00", null), line(2, "50.00", "10.00")], []);
    expect(b.cost).toBeNull();
    expect(b.marginBeforeExpenses).toBeNull();
    expect(b.hasUnknownCost).toBe(true);
    expect(toWire(b.knownCost)).toBe("20.00");
    expect(toWire(b.due)).toBe("220.00");
  });

  it("document sans ligne ni paiement : tout à 0, aucun coût inconnu (COALESCE de la vue)", () => {
    expect(wire(documentBalance([], []))).toEqual({
      total: "0.00",
      cost: "0.00",
      knownCost: "0.00",
      hasUnknownCost: false,
      paid: "0.00",
      due: "0.00",
      overpaid: "0.00",
      marginBeforeExpenses: "0.00",
    });
  });

  it("une quantité non entière est une erreur de programmation", () => {
    expect(() => documentBalance([line(1.5, "10.00", null)], [])).toThrow();
  });
});

describe("créance ancienne (03 §5.8)", () => {
  // Jeudi 17 septembre 2026, 10:00 à Paris.
  const now = new Date("2026-09-17T08:00:00Z");
  const due = E("40.00");

  it("compte les jours calendaires de Paris depuis l'engagement", () => {
    expect(receivableAgeDays(new Date("2026-09-16T21:59:00Z"), now)).toBe(1); // 23:59 la veille
    expect(receivableAgeDays(new Date("2026-09-16T22:00:00Z"), now)).toBe(0); // 00:00 le jour même
  });

  it("ancienne au-delà de 30 jours, pas à 30", () => {
    const at30 = new Date("2026-08-17T22:30:00Z"); // 18 août, 00:30 Paris → 30 j
    const at31 = new Date("2026-08-17T21:30:00Z"); // 17 août, 23:30 Paris → 31 j
    expect(receivableAgeDays(at30, now)).toBe(30);
    expect(isOldReceivable({ status: "DELIVERED", confirmedAt: at30, due }, now)).toBe(false);
    expect(isOldReceivable({ status: "DELIVERED", confirmedAt: at31, due }, now)).toBe(true);
  });

  it("jamais pour un document soldé, en attente ou annulé", () => {
    const old = new Date("2026-01-01T00:00:00Z");
    expect(isOldReceivable({ status: "CONFIRMED", confirmedAt: old, due: E("0.00") }, now)).toBe(false);
    expect(isOldReceivable({ status: "PENDING", confirmedAt: null, due }, now)).toBe(false);
    expect(isOldReceivable({ status: "CANCELLED", confirmedAt: null, due }, now)).toBe(false);
  });
});
