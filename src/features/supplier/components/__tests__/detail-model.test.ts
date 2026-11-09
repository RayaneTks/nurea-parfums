import { describe, expect, it } from "vitest";
import type { SupplierDetailDebtDTO, SupplierDetailLineDTO } from "@/contracts/supplier";
import { detailLineLabel, detailMessage, openDebtIds, sumText, supplierDetail } from "../detail-model";
import { ledgerAllocation } from "../supplier-model";
import { dzdFromDb } from "@/domain/money";

const line = (over: Partial<SupplierDetailLineDTO>): SupplierDetailLineDTO => ({
  documentId: "d1",
  customerName: "Kais",
  cancelled: false,
  perfumeName: "L'Heure Bleue",
  brandName: "Guerlain",
  volumeMl: 80,
  quantity: 1,
  unitCostDzd: "2500.00",
  ...over,
});

const debt = (over: Partial<SupplierDetailDebtDTO>): SupplierDetailDebtDTO => ({
  id: "x",
  label: null,
  amountDzd: "0.00",
  occurredAt: "2026-11-01T10:00:00.000Z",
  hasItems: true,
  lines: [],
  ...over,
});

const row = (id: string, kind: "DEBT" | "PAYMENT", amountDzd: string, occurredAt: string) => ({
  id,
  kind,
  amountDzd,
  occurredAt,
  settlesEntryId: null,
  settledBy: null,
});

describe("détail du reste à payer", () => {
  it("écrit le parfum comme dans les notes du gérant", () => {
    expect(detailLineLabel(line({}))).toBe("L'Heure Bleue GUERLAIN 80ML");
    expect(detailLineLabel(line({ brandName: null, volumeMl: null }))).toBe("L'Heure Bleue");
  });

  it("garde le signe d'un écart négatif dans l'addition", () => {
    expect(sumText(["2500", "1400", "-300"].map(dzdFromDb))).toBe("2500+1400-300");
  });

  it("range par client, additionne et rend le texte à copier", () => {
    const debts = [
      debt({
        id: "a",
        amountDzd: "6700.00",
        lines: [
          line({}),
          line({ documentId: "d2", customerName: "Badis", perfumeName: "The One", brandName: "D&G", quantity: 3, unitCostDzd: "1400.00" }),
        ],
      }),
    ];
    const allocation = ledgerAllocation([row("a", "DEBT", "6700.00", "2026-11-01T10:00:00.000Z")]);
    const detail = supplierDetail(debts, allocation);
    expect(detailMessage(detail)).toBe(
      ["Kais\n- L'Heure Bleue GUERLAIN 80ML 2500DA", "Badis\n- The One D&G 80ML x3 4200DA", "2500+4200 = 6700 DA"].join("\n\n"),
    );
  });

  it("regroupe un même client sur deux dettes, pas deux clients de passage", () => {
    const debts = [
      debt({ id: "a", amountDzd: "2500.00", lines: [line({})] }),
      debt({ id: "b", amountDzd: "5000.00", lines: [line({ documentId: "p1", customerName: null }), line({ documentId: "d9", customerName: " kais " })] }),
      debt({ id: "c", amountDzd: "2500.00", lines: [line({ documentId: "p2", customerName: null })] }),
    ];
    const detail = supplierDetail(debts, ledgerAllocation([]));
    expect(detail.groups.map((group) => [group.customer, group.lines.length])).toEqual([
      ["Kais", 2],
      ["Client de passage", 1],
      ["Client de passage", 1],
    ]);
  });

  it("dette entamée : listée en entier, puis déjà versé et reste", () => {
    const ledger = [
      row("p", "PAYMENT", "1000.00", "2026-11-05T10:00:00.000Z"),
      row("a", "DEBT", "2500.00", "2026-11-01T10:00:00.000Z"),
    ];
    const allocation = ledgerAllocation(ledger);
    expect(openDebtIds(allocation)).toEqual(["a"]);
    const detail = supplierDetail([debt({ id: "a", amountDzd: "2500.00", lines: [line({})] })], allocation);
    expect(detailMessage(detail).split("\n\n").at(-1)).toBe("2500 = 2500 DA\nDéjà versé : 1000 DA\nReste à payer : 1500 DA");
  });

  it("une dette payée en entier sort du détail", () => {
    const allocation = ledgerAllocation([
      row("b", "DEBT", "800.00", "2026-11-03T10:00:00.000Z"),
      row("p", "PAYMENT", "2500.00", "2026-11-02T10:00:00.000Z"),
      row("a", "DEBT", "2500.00", "2026-11-01T10:00:00.000Z"),
    ]);
    expect(openDebtIds(allocation)).toEqual(["b"]);
  });

  it("dette à la main sous « Autres », coût manquant compté 0, écart montré : le total reste celui du carnet", () => {
    const debts = [
      debt({ id: "m", label: "Transport", amountDzd: "3000.00", hasItems: false }),
      debt({ id: "a", label: "Lot d'octobre", amountDzd: "2800.00", lines: [line({}), line({ perfumeName: "Shalimar", unitCostDzd: null })] }),
    ];
    const detail = supplierDetail(debts, ledgerAllocation([]));
    expect(detail.missingCosts).toBe(1);
    expect(detail.total.toString()).toBe("5800");
    expect(detailMessage(detail)).toBe(
      [
        "Kais\n- L'Heure Bleue GUERLAIN 80ML 2500DA\n- Shalimar GUERLAIN 80ML (coût manquant)",
        "Autres\n- Transport 3000DA\n- Écart sur Lot d'octobre 300DA",
        "2500+3000+300 = 5800 DA",
      ].join("\n\n"),
    );
  });

  it("signale une commande annulée après avoir été notée", () => {
    const detail = supplierDetail([debt({ id: "a", amountDzd: "2500.00", lines: [line({ cancelled: true })] })], ledgerAllocation([]));
    expect(detailMessage(detail)).toContain("- L'Heure Bleue GUERLAIN 80ML 2500DA (commande annulée)");
  });
});
