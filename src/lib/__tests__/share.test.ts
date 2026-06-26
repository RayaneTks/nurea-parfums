import { describe, expect, it } from "vitest";
import { buildOrderShareText, buildSaleShareText } from "@/lib/share";

const item = (over: Partial<Parameters<typeof buildOrderShareText>[0]["items"][number]> = {}) => ({
  name: "Baccarat Rouge 540",
  brandName: "MFK",
  quantity: 2,
  volumeMl: 100,
  unitPrice: "90",
  ...over,
});

describe("buildOrderShareText", () => {
  it("inclut articles, total, acompte, reste, livraison", () => {
    const t = buildOrderShareText({
      customerName: "Fares",
      items: [item()],
      total: "180",
      depositPaid: "50",
      due: "130",
      deliveryAt: "2026-05-12T10:00:00.000Z",
    });
    expect(t).toContain("Client : Fares");
    expect(t).toContain("2× Baccarat Rouge 540 MFK (100 ml) — 180 €");
    expect(t).toContain("Total : 180 €");
    expect(t).toContain("Acompte reçu : 50 €");
    expect(t).toContain("Reste à régler : 130 €");
    expect(t).toContain("Livraison : 12/05/2026");
  });

  it("ligne don affichée « offert »", () => {
    const t = buildOrderShareText({
      customerName: "Anonyme",
      items: [item({ isGift: true })],
      total: "0",
      depositPaid: "0",
      due: "0",
      deliveryAt: null,
    });
    expect(t).toContain("offert");
    expect(t).not.toContain("Client : Anonyme");
    expect(t).not.toContain("Reste à régler");
  });
});

describe("buildSaleShareText", () => {
  it("reçu avec total et remerciement", () => {
    const t = buildSaleShareText({
      customerName: "Sarah",
      items: [item({ quantity: 1, unitPrice: "120" })],
      total: "120",
      soldAt: "2026-05-12T10:00:00.000Z",
    });
    expect(t).toContain("Reçu");
    expect(t).toContain("Total : 120 €");
    expect(t).toContain("Merci");
  });
});
