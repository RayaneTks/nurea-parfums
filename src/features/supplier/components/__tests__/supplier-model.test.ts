import { describe, expect, it } from "vitest";
import { dzdFromDb, rateFromDb } from "@/domain/money";
import {
  balanceHeadline,
  dzdInputText,
  entryAmountText,
  entryTitle,
  eurReading,
  groupByMonth,
  rateLabel,
  remainingWithout,
  splitLedger,
} from "../supplier-model";

const entries = [
  { id: "a", kind: "DEBT" as const, amountDzd: "92700.00" },
  { id: "b", kind: "PAYMENT" as const, amountDzd: "40000.00" },
];

describe("supplier-model", () => {
  it("lit les dinars en euros au taux de l'écran", () => {
    expect(eurReading(dzdFromDb("92700.00"), rateFromDb("277"))).toBe("≈ 334,66 €");
  });

  it("dit le taux en toutes lettres", () => {
    expect(rateLabel(rateFromDb("277.5000"))).toBe("277,5 DA pour 1 €");
  });

  it("masque une dette en cours de suppression : le reste baisse", () => {
    expect(remainingWithout("52700.00", entries, new Set(["a"])).toString()).toBe("-40000");
  });

  it("masque un versement en cours de suppression : le reste remonte", () => {
    expect(remainingWithout("52700.00", entries, new Set(["b"])).toString()).toBe("92700");
  });

  it("n'affiche jamais un reste négatif brut", () => {
    expect(balanceHeadline(dzdFromDb("0")).amount).toBe("Rien à payer");
    expect(balanceHeadline(dzdFromDb("-500")).amount).toBe("Avance de 500 DA");
    expect(balanceHeadline(dzdFromDb("48300")).amount).toBe("48 300 DA");
  });

  it("dit le sens dans le texte, pas seulement dans la couleur", () => {
    expect(entryAmountText("DEBT", "92700.00")).toBe("+ 92 700 DA");
    expect(entryAmountText("PAYMENT", "40000.00")).toBe("− 40 000 DA");
  });

  it("nomme une ligne sans nom par son sens", () => {
    expect(entryTitle({ kind: "DEBT", label: null })).toBe("Dette");
    expect(entryTitle({ kind: "PAYMENT", label: "  " })).toBe("Versement");
    expect(entryTitle({ kind: "DEBT", label: "Lot d'octobre" })).toBe("Lot d'octobre");
  });

  it("rend un montant de base en texte de champ", () => {
    expect(dzdInputText("92700.00")).toBe("92700");
    expect(dzdInputText("92700.50")).toBe("92700,50");
  });

  it("range les dettes remboursées à part et tait leur remboursement", () => {
    const rows = [
      { id: "r", settlesEntryId: "d1", settledBy: null, occurredAt: "2026-10-25T10:00:00Z" },
      { id: "v", settlesEntryId: null, settledBy: null, occurredAt: "2026-10-20T10:00:00Z" },
      { id: "d1", settlesEntryId: null, settledBy: { id: "r", occurredAt: "2026-10-25T10:00:00Z" }, occurredAt: "2026-10-10T10:00:00Z" },
      { id: "d2", settlesEntryId: null, settledBy: null, occurredAt: "2026-09-30T10:00:00Z" },
    ];
    const { open, settled } = splitLedger(rows);
    expect(open.map((row) => row.id)).toEqual(["v", "d2"]);
    expect(settled.map((row) => row.id)).toEqual(["d1"]);
  });

  it("groupe les lignes par mois, à l'heure de Paris", () => {
    const groups = groupByMonth([
      { id: "a", occurredAt: "2026-11-01T08:00:00Z" },
      { id: "b", occurredAt: "2026-10-31T23:30:00Z" },
      { id: "c", occurredAt: "2026-10-02T10:00:00Z" },
    ]);
    expect(groups.map((group) => [group.month, group.rows.map((row) => row.id)])).toEqual([
      ["Novembre 2026", ["a", "b"]],
      ["Octobre 2026", ["c"]],
    ]);
  });
});
