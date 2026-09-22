import { describe, expect, it } from "vitest";
import type { MoneyString } from "@/domain/money";
import { datedLabel, documentCaption, documentTrailing, percentLabel, pointLabel, seriesHasSignal, seriesPoints } from "../compta-model";

const NOW = new Date("2026-09-17T08:00:00Z");
const m = (value: string) => value as MoneyString;

describe("chiffres datés (06 §1.7)", () => {
  it("accole la période au chiffre, pourcentage sans décimale nulle", () => {
    expect(datedLabel("Encaissé", "septembre")).toBe("Encaissé · septembre");
    expect(percentLabel("38,5")).toBe("38,5 %");
    expect(percentLabel("39,0")).toBe("39 %");
    expect(percentLabel("−12,0")).toBe("−12 %");
    expect(percentLabel(null)).toBeNull();
  });
});

describe("graphe « Encaissé par … » (06 E03 zone 3)", () => {
  it("nomme chaque pas : jour, semaine, mois (année hors de l'année en cours)", () => {
    expect(pointLabel("day", "2026-09-13T22:00:00.000Z", NOW)).toBe("lun. 14");
    expect(pointLabel("week", "2026-08-31T22:00:00.000Z", NOW)).toBe("1 sept.");
    expect(pointLabel("month", "2026-08-31T22:00:00.000Z", NOW)).toBe("sept.");
    expect(pointLabel("month", "2025-11-30T23:00:00.000Z", NOW)).toBe("déc. 2025");
  });

  it("garde tous les points, vides compris ; un graphe sans aucun encaissement ne s'affiche pas", () => {
    const serie = {
      bucket: "week" as const,
      points: [
        { from: "2026-08-31T22:00:00.000Z", to: "2026-09-06T22:00:00.000Z", encaisse: m("0.00") },
        { from: "2026-09-06T22:00:00.000Z", to: "2026-09-13T22:00:00.000Z", encaisse: m("120.00") },
      ],
    };
    expect(seriesPoints(serie, NOW)).toEqual([
      { label: "1 sept.", value: "0.00" },
      { label: "7 sept.", value: "120.00" },
    ]);
    expect(seriesHasSignal(seriesPoints(serie, NOW))).toBe(true);
    expect(seriesHasSignal([{ label: "a", value: m("0.00") }, { label: "b", value: m("0.00") }])).toBe(false);
  });
});

describe("lignes des documents de la période (06 E03 zone 5)", () => {
  const row = { origin: "DIRECT_SALE" as const, orderedAt: "2026-09-03T10:00:00.000Z", itemCount: 2, status: "DELIVERED" as const };

  it("« Vente du 3 sept. · 2 articles », état anormal ajouté", () => {
    expect(documentCaption(row, NOW)).toBe("Vente du 3 sept. · 2 articles");
    expect(documentCaption({ ...row, origin: "ORDER", itemCount: 1, status: "PENDING" }, NOW)).toBe("Commande du 3 sept. · 1 article · En attente");
    expect(documentCaption({ ...row, origin: "ORDER", status: "CANCELLED" }, NOW)).toBe("Commande du 3 sept. · 2 articles · Annulée");
  });

  it("à droite : À encaisser d'un document engagé à dû, sinon le Total (jamais le dû d'une annulée)", () => {
    expect(documentTrailing({ status: "DELIVERED", due: m("30.00"), total: m("120.00") })).toEqual({ kind: "due", value: "30.00" });
    expect(documentTrailing({ status: "DELIVERED", due: m("0.00"), total: m("120.00") })).toEqual({ kind: "total", value: "120.00" });
    expect(documentTrailing({ status: "CANCELLED", due: m("90.00"), total: m("90.00") })).toEqual({ kind: "total", value: "90.00" });
    expect(documentTrailing({ status: "PENDING", due: m("95.00"), total: m("95.00") })).toEqual({ kind: "total", value: "95.00" });
  });
});
