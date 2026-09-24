import { describe, expect, it } from "vitest";
import type { BatchLineDTO } from "@/contracts/batches";
import type { MoneyString } from "@/domain/money";
import { formatDzd, formatEur } from "@/domain/money";
import {
  initialSelection,
  purchaseDetail,
  purchaseLineCaption,
  rateLine,
  selectionKey,
  supplierGroups,
  supplierMessage,
} from "../supplier-model";

let seq = 0;
const line = (overrides: Partial<BatchLineDTO>): BatchLineDTO => ({
  id: `l${++seq}`,
  documentId: "d1",
  status: "CONFIRMED",
  customerName: "Fares Benali",
  perfumeName: "Sauvage",
  brandName: "Dior",
  volumeMl: 80,
  quantity: 1,
  deliveredQuantity: 0,
  isGift: false,
  unitCostDzd: "22000.00",
  exchangeRate: "277.0000",
  unitCostEur: "79.42" as MoneyString,
  ...overrides,
});

describe("liste du fournisseur (E06)", () => {
  const lines = [
    line({ documentId: "d1" }),
    line({ documentId: "d1", perfumeName: "Libre", brandName: "Yves Saint Laurent", volumeMl: 50, quantity: 2 }),
    line({ documentId: "d2", customerName: "Lina", perfumeName: "J'adore", volumeMl: 50 }),
    // Même client sur un second document : il rejoint son groupe, le même parfum fusionne.
    line({ documentId: "d3", customerName: "fares benali " }),
    // Deux clients de passage restent deux blocs.
    line({ documentId: "d4", customerName: null, perfumeName: "Khamrah", brandName: "Lattafa" }),
    line({ documentId: "d5", customerName: null, perfumeName: "Asad", brandName: "Lattafa", volumeMl: null }),
    // Déjà remis : listé mais décoché d'office.
    line({ documentId: "d2", customerName: "Lina", perfumeName: "Y", brandName: "Yves Saint Laurent", deliveredQuantity: 1 }),
  ];

  it("groupe par client dans l'ordre des demandes, fusionne les parfums identiques, sépare les clients de passage", () => {
    const groups = supplierGroups(lines);
    expect(groups.map((g) => g.customer)).toEqual(["Fares Benali", "Lina", "Client de passage", "Client de passage"]);
    expect(groups[0]?.items.map((i) => [i.perfumeName, i.quantity])).toEqual([
      ["Sauvage", 2],
      ["Libre", 2],
    ]);
  });

  it("message sans aucun prix, déjà remis exclu par défaut, contenance omise si inconnue", () => {
    const groups = supplierGroups(lines);
    const selected = initialSelection(groups);
    const lina = groups[1];
    const y = lina?.items.find((i) => i.perfumeName === "Y");
    expect(lina && y && selected.has(selectionKey(lina, y))).toBe(false);
    expect(supplierMessage("Commande de mars", groups, selected)).toBe(
      [
        "Lot « Commande de mars » — 7 flacons · 4 clients",
        "Fares Benali\n- Sauvage · Dior · 80 ml ×2\n- Libre · Yves Saint Laurent · 50 ml ×2",
        "Lina\n- J'adore · Dior · 50 ml",
        "Client de passage\n- Khamrah · Lattafa · 80 ml",
        "Client de passage\n- Asad · Lattafa",
      ].join("\n\n"),
    );
    expect(supplierMessage("X", groups, selected)).not.toMatch(/€|DA/);
  });
});

describe("achat en dinars (E06)", () => {
  it("documents engagés seulement, somme en euros = la tuile, un groupe par taux, inconnus comptés à part", () => {
    const detail = purchaseDetail([
      line({ quantity: 2 }),
      line({ perfumeName: "Libre", unitCostDzd: "15000.00", exchangeRate: "250.0000", unitCostEur: "60.00" as MoneyString }),
      line({ status: "PENDING" }),
      line({ unitCostDzd: null, exchangeRate: null, unitCostEur: null }),
    ]);
    expect(formatDzd(detail.totalDzd)).toBe("59 000 DA");
    expect(detail.rates.map(rateLine)).toEqual([
      "44 000 DA au taux 277 = 158,84 €",
      "15 000 DA au taux 250 = 60,00 €",
    ]);
    expect(formatEur(detail.totalEur)).toBe("218,84 €");
    expect(detail.unknown).toBe(1);
    expect(purchaseLineCaption(detail.lines[0]!)).toBe("2 × 22 000 DA · taux 277 · Fares Benali");
  });
});
