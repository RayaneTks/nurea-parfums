import { describe, expect, it } from "vitest";
import { dzdFromDb, rateFromDb } from "@/domain/money";
import {
  balanceHeadline,
  dzdInputText,
  entryAmountText,
  entryTitle,
  eurReading,
  rateLabel,
  remainingWithout,
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
});
