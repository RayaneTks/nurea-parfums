import { describe, expect, it } from "vitest";
import type { OrderRowDTO } from "@/contracts/documents";
import type { MoneyString } from "@/domain/money";
import { rowCaption, rowName, rowTrailing, sectionTitle } from "../orders-model";

const m = (value: string) => value as MoneyString;

const row = (overrides: Partial<OrderRowDTO> = {}): OrderRowDTO => ({
  id: "o1",
  status: "CONFIRMED",
  customerId: null,
  customerName: "Fares",
  orderedAt: "2026-09-10T10:00:00.000Z",
  expectedDeliveryAt: null,
  expectedDeliveryHasTime: false,
  deliveredAt: null,
  cancelledAt: null,
  itemCount: 3,
  deliveredCount: 0,
  total: m("120.00"),
  paid: m("0.00"),
  due: m("120.00"),
  ...overrides,
});

describe("E10 — libellés de la liste", () => {
  it("titres de section : urgences, à encaisser, mois", () => {
    expect(sectionTitle({ key: "retard", kind: "urgency" })).toBe("En retard");
    expect(sectionTitle({ key: "plus-tard", kind: "urgency" })).toBe("Plus tard");
    expect(sectionTitle({ key: "a-encaisser", kind: "receivable" })).toBe("À encaisser");
    expect(sectionTitle({ key: "2026-09", kind: "month" })).toBe("Septembre 2026");
  });

  it("un seul élément à droite, par priorité : en attente, sinon à encaisser, sinon rien", () => {
    expect(rowTrailing(row({ status: "PENDING" }), "a-livrer")).toBe("pending");
    expect(rowTrailing(row(), "a-livrer")).toBe("due");
    expect(rowTrailing(row({ due: m("0.00") }), "a-livrer")).toBeNull();
    expect(rowTrailing(row({ due: m("0.00") }), "livrees")).toBe("total");
  });

  it("légende : articles, date prévue, heure si fixée, pointage partiel ; client de passage", () => {
    const now = new Date("2026-09-17T08:00:00.000Z");
    const caption = rowCaption(row({ expectedDeliveryAt: "2026-09-19T12:30:00.000Z", expectedDeliveryHasTime: true, deliveredCount: 1 }), "a-livrer", now);
    expect(caption).toBe("3 articles · sam. 19 sept. · 14 h 30 · Livré 1/3");
    expect(rowCaption(row({ itemCount: 1 }), "a-livrer", now)).toBe("1 article");
    expect(rowCaption(row({ status: "CANCELLED", paid: m("40.00") }), "annulees", now)).toBe("40,00 € encaissés conservés");
    expect(rowName(row({ customerName: null }))).toBe("Client de passage");
  });
});
