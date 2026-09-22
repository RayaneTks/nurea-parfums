import { describe, expect, it } from "vitest";
import type { DocumentPaymentDTO, DocumentSheetDTO } from "@/contracts/documents";
import { eurFromWire, formatEur, type MoneyString } from "@/domain/money";
import {
  allocate,
  customerLabel,
  footerPlan,
  lineCaption,
  marginLabel,
  moneyView,
  paymentRows,
  shareText,
  voidPaymentDescription,
  type CollectTarget,
} from "../document-model";

const m = (value: string) => value as MoneyString;

function doc(overrides: Partial<Omit<DocumentSheetDTO, "balance">> & { balance?: Partial<DocumentSheetDTO["balance"]> } = {}): DocumentSheetDTO {
  const { balance, ...rest } = overrides;
  return {
    id: "d1",
    origin: "ORDER",
    status: "CONFIRMED",
    customer: null,
    customerName: "Fares",
    customerContact: null,
    batch: null,
    orderedAt: "2026-09-12T10:00:00.000Z",
    expectedDeliveryAt: null,
    expectedDeliveryHasTime: false,
    confirmedAt: "2026-09-12T10:00:00.000Z",
    deliveredAt: null,
    cancelledAt: null,
    notes: null,
    lines: [],
    payments: [],
    ...rest,
    balance: {
      total: m("120.00"),
      paid: m("60.00"),
      due: m("60.00"),
      overpaid: m("0.00"),
      hasUnknownCost: false,
      marginBeforeExpenses: m("50.00"),
      marginPercent: "41,7",
      ...balance,
    },
  };
}

describe("S01 — pied de sheet (06 S01, tableau des actions)", () => {
  it("chaque état a son action d'argent, jamais un statut", () => {
    expect(footerPlan(doc({ status: "PENDING", balance: { paid: m("0.00"), due: m("120.00") } }))).toEqual({ primary: { kind: "acompte" }, share: null });
    expect(footerPlan(doc())).toEqual({ primary: { kind: "solde", amount: "60.00" }, share: "recap" });
    expect(footerPlan(doc({ balance: { paid: m("120.00"), due: m("0.00") } }))).toEqual({ primary: null, share: "recap" });
    expect(footerPlan(doc({ status: "DELIVERED", balance: { paid: m("120.00"), due: m("0.00") } }))).toEqual({ primary: null, share: "recu" });
    expect(footerPlan(doc({ status: "DELIVERED", balance: { paid: m("130.00"), due: m("0.00"), overpaid: m("10.00") } }))).toEqual({
      primary: { kind: "rembourser", amount: "10.00" },
      share: "recu",
    });
    expect(footerPlan(doc({ status: "CANCELLED", balance: { paid: m("60.00") } }))).toEqual({ primary: { kind: "rembourser", amount: "60.00" }, share: null });
    expect(footerPlan(doc({ status: "CANCELLED", balance: { paid: m("0.00") } }))).toEqual({ primary: null, share: null });
  });
});

describe("S01 — zone argent", () => {
  it("engagé : trois chiffres ; en attente : deux et la phrase ; annulé : le payé conservé ; trop-perçu", () => {
    expect(moneyView(doc()).tiles.map((tile) => tile.label)).toEqual(["Total", "Payé", "À encaisser"]);
    expect(moneyView(doc({ status: "PENDING" })).note).toBe("En attente : rien à encaisser tant qu'elle n'est pas confirmée.");
    expect(moneyView(doc({ status: "CANCELLED", balance: { paid: m("40.00") } })).note).toBe(`${formatEur(eurFromWire(m("40.00")))} encaissés conservés`);
    expect(moneyView(doc({ balance: { overpaid: m("10.00") } })).tiles[2]?.label).toBe("Trop-perçu");
  });

  it("marge avant dépenses, ou coût à compléter", () => {
    expect(marginLabel(doc()).text).toBe(`Marge avant dépenses ${formatEur(eurFromWire(m("50.00")))} · 41,7 %`);
    expect(marginLabel(doc({ balance: { marginBeforeExpenses: null, marginPercent: null } }))).toEqual({ text: "Marge avant dépenses : coût à compléter", unknown: true });
  });
});

describe("S01 — articles, paiements, partage", () => {
  it("légende de ligne, volume hors règle, client de passage", () => {
    expect(lineCaption({ volumeMl: 80, quantity: 2, unitPriceEur: m("120.00"), isGift: false })).toBe(`80 ml · 2 × ${formatEur(eurFromWire(m("120.00")))}`);
    expect(lineCaption({ volumeMl: null, quantity: 1, unitPriceEur: m("0.00"), isGift: true })).toBe("1 × offert");
    expect(customerLabel({ customer: null, customerName: "  " })).toBe("Client de passage");
    expect(customerLabel({ customer: { fullName: "Lina" }, customerName: "Ancien nom" })).toBe("Lina");
  });

  const payment = (overrides: Partial<DocumentPaymentDTO>): DocumentPaymentDTO => ({
    id: "p1",
    kind: "DEPOSIT",
    amount: m("40.00"),
    occurredAt: "2026-09-12T10:00:00.000Z",
    pocketId: "po",
    pocketName: "Espèces",
    method: null,
    note: null,
    reversesPaymentId: null,
    reversedByPaymentId: null,
    ...overrides,
  });

  it("une paire paiement + contre-passation se replie sous « Paiement annulé »", () => {
    const rows = paymentRows(
      [
        payment({ id: "p1", reversedByPaymentId: "p2" }),
        payment({ id: "p2", kind: "REFUND", amount: m("-40.00"), reversesPaymentId: "p1" }),
        payment({ id: "p3", kind: "BALANCE", amount: m("80.00") }),
      ],
      "ORDER",
    );
    expect(rows.map((row) => [row.label, row.voided, row.actionable])).toEqual([
      ["Paiement annulé", true, false],
      ["Solde", false, true],
    ]);
    expect(paymentRows([payment({ kind: "BALANCE" })], "DIRECT_SALE")[0]?.label).toBe("Paiement");
  });

  it("« Annuler ce paiement » dit l'écriture inverse et ce qui restera à encaisser (06 S18)", () => {
    const text = voidPaymentDescription(doc(), payment({}));
    expect(text).toContain("Une écriture inverse est ajoutée à la même date dans Espèces.");
    expect(text).toContain(`Elle reste confirmée : ${formatEur(eurFromWire(m("100.00")))} resteront à encaisser.`);
    expect(voidPaymentDescription(doc({ status: "PENDING" }), payment({}))).not.toContain("resteront");
  });

  it("le récap porte le payé réel et le dû d'un document engagé", () => {
    const text = shareText(doc({ lines: [] }), "recap");
    expect(text).toContain(`Payé : ${formatEur(eurFromWire(m("60.00")))}`);
    expect(text).toContain(`À encaisser : ${formatEur(eurFromWire(m("60.00")))}`);
  });
});

describe("S02 — Tout encaisser : répartition du plus ancien au plus récent", () => {
  const target = (id: string, due: string): CollectTarget => ({ id, origin: "DIRECT_SALE", status: "DELIVERED", label: id, total: m(due), paid: m("0.00"), due: m(due) });

  it("chaque document reçoit au plus son dû ; un document qui ne reçoit rien n'est pas envoyé", () => {
    const parts = allocate([target("a", "80.00"), target("b", "60.00"), target("c", "10.00")], eurFromWire(m("100.00")));
    expect(parts.map((part) => [part.target.id, formatEur(part.amount)])).toEqual([
      ["a", formatEur(eurFromWire(m("80.00")))],
      ["b", formatEur(eurFromWire(m("20.00")))],
    ]);
    expect(allocate([target("a", "80.00")], null)).toEqual([]);
  });
});
