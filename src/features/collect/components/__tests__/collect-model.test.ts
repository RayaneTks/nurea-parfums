import { describe, expect, it } from "vitest";
import type { ReceivableDTO } from "@/contracts/chiffres";
import type { MoneyString } from "@/domain/money";
import { ageLabel, countsLabel, filterGroups, groupReceivables, receivableCaption, receivableTitle, relanceText } from "../collect-model";

const m = (value: string) => value as MoneyString;

const receivable = (overrides: Partial<ReceivableDTO>): ReceivableDTO => ({
  documentId: "d",
  origin: "DIRECT_SALE",
  status: "DELIVERED",
  customerId: null,
  customerName: "Fares",
  customerKey: "nom:fares",
  batchId: null,
  total: m("100.00"),
  paid: m("20.00"),
  due: m("80.00"),
  orderedAt: "2026-08-03T10:00:00.000Z",
  confirmedAt: "2026-08-03T10:00:00.000Z",
  deliveredAt: "2026-08-03T10:00:00.000Z",
  ageDays: 45,
  isOld: true,
  ...overrides,
});

describe("E13 — groupes par client", () => {
  it("un groupe par clé, dans l'ordre des créances ; total, âge le plus ancien", () => {
    const groups = groupReceivables([
      receivable({ documentId: "a", customerKey: "nom:fares", ageDays: 45 }),
      receivable({ documentId: "b", customerKey: "fiche:lina", customerId: "lina", customerName: "Élise", due: m("60.00"), ageDays: 12, isOld: false }),
      receivable({ documentId: "c", customerKey: "nom:fares", due: m("60.00"), ageDays: 3, isOld: false }),
    ]);
    expect(groups.map((group) => [group.key, group.total, group.ageDays, group.isOld, group.items.length])).toEqual([
      ["nom:fares", "140.00", 45, true, 2],
      ["fiche:lina", "60.00", 12, false, 1],
    ]);
    expect(filterGroups(groups, "elise").map((group) => group.key)).toEqual(["fiche:lina"]);
    expect(filterGroups(groups, "").length).toBe(2);
  });

  it("libellés de document, légende, âge, compteurs", () => {
    const now = new Date("2026-09-17T08:00:00.000Z");
    expect(receivableTitle(receivable({}), now)).toBe("Vente du 3 août");
    expect(receivableTitle(receivable({ origin: "ORDER", deliveredAt: "2026-09-02T10:00:00.000Z" }), now)).toBe("Commande livrée le 2 sept.");
    expect(receivableTitle(receivable({ origin: "ORDER", deliveredAt: null, status: "CONFIRMED", orderedAt: "2026-09-12T10:00:00.000Z" }), now)).toBe("Commande du 12 sept.");
    expect(receivableCaption(receivable({}))).toBe("payé 20,00 € sur 100,00 €");
    expect(ageLabel(42)).toBe("depuis 42 j");
    expect(countsLabel(5, 3)).toBe("5 documents · 3 clients");
    expect(countsLabel(1, 1)).toBe("1 document · 1 client");
  });

  it("S09 : le nom tel qu'enregistré, une ligne par document, le total", () => {
    const [group] = groupReceivables([receivable({ documentId: "a" }), receivable({ documentId: "b", due: m("60.00") })]);
    const text = relanceText(group as NonNullable<typeof group>);
    expect(text.startsWith("Bonjour Fares,")).toBe(true);
    expect(text).toContain("Total à régler : 140,00 €");
    expect(text.match(/restants/g)).toHaveLength(2);
  });
});
