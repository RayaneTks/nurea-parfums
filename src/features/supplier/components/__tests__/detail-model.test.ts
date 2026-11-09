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

  it("dette entamée : les parfums payés disparaissent, celui payé en partie montre son reste ; l'addition vaut le Reste à payer", async () => {
    const ledger = [
      row("p", "PAYMENT", "4500.00", "2026-11-05T10:00:00.000Z"),
      row("b", "DEBT", "1400.00", "2026-11-02T10:00:00.000Z"),
      row("a", "DEBT", "8500.00", "2026-11-01T10:00:00.000Z"),
    ];
    const allocation = ledgerAllocation(ledger);
    expect(openDebtIds(allocation).sort()).toEqual(["a", "b"]);
    const debts = [
      debt({
        id: "a",
        amountDzd: "8500.00",
        lines: [
          line({}),
          line({ documentId: "d3", customerName: "Lina", perfumeName: "Rouge Trafalgar", brandName: null, unitCostDzd: "4000.00" }),
          line({ documentId: "d4", customerName: "Lina", perfumeName: "Libre", brandName: "YSL", unitCostDzd: "2000.00" }),
        ],
      }),
      debt({ id: "b", amountDzd: "1400.00", lines: [line({ documentId: "d2", customerName: "Badis", perfumeName: "The One", brandName: "D&G", unitCostDzd: "1400.00" })] }),
    ];
    const detail = supplierDetail(debts, allocation);
    // 4500 payés sur la dette a : L'Heure Bleue (2500) puis 2000 sur le Rouge Trafalgar.
    expect(detailMessage(detail)).toBe(
      [
        "Lina\n- Rouge Trafalgar 80ML reste 2000DA (sur 4000DA)\n- Libre YSL 80ML 2000DA",
        "Badis\n- The One D&G 80ML 1400DA",
        "2000+2000+1400 = 5400 DA",
      ].join("\n\n"),
    );
    expect(detail.total.toString()).toBe("5400");
  });

  it("dette à la main entamée : son reste sous « Autres »", () => {
    const allocation = ledgerAllocation([
      row("p", "PAYMENT", "1000.00", "2026-11-05T10:00:00.000Z"),
      row("m", "DEBT", "3000.00", "2026-11-01T10:00:00.000Z"),
    ]);
    const detail = supplierDetail([debt({ id: "m", label: "Transport", amountDzd: "3000.00", hasItems: false })], allocation);
    expect(detailMessage(detail)).toBe("Autres\n- Transport reste 2000DA (sur 3000DA)\n\n2000 = 2000 DA");
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
