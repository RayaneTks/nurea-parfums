import { describe, expect, it } from "vitest";
import type { JournalEntry, PocketSummary } from "@/contracts/treasury";
import { parseEurInput, type Eur, type MoneyString } from "@/domain/money";
import {
  archiveBlockedReason,
  canReverse,
  groupByDay,
  journalItems,
  movedOrder,
  movementCaption,
  movementDoneMessage,
  movementEffect,
  movementLabel,
  ofPocket,
  outgoingMax,
  reverseConfirmation,
  suggestedPocket,
} from "../treasury-model";

const NOW = new Date("2026-09-17T08:00:00Z");
const e = (text: string) => parseEurInput(text) as Eur;
const m = (value: string) => value as MoneyString;

function entry(overrides: Partial<JournalEntry>): JournalEntry {
  return {
    id: "m1",
    pocketId: "p1",
    pocketName: "Espèces",
    kind: "ADJUSTMENT",
    amount: m("-20.00"),
    occurredAt: "2026-09-17T12:32:00.000Z",
    label: null,
    reversesId: null,
    reversedById: null,
    transferGroupId: null,
    counterpartPocketName: null,
    payment: null,
    expense: null,
    ...overrides,
  };
}

const pocket = (overrides: Partial<PocketSummary>): PocketSummary => ({
  id: "p1",
  name: "Espèces",
  kind: "CASH",
  isSystem: false,
  archived: false,
  sortOrder: 0,
  openingBalance: m("0.00"),
  balance: m("0.00"),
  isDefault: false,
  ...overrides,
});

describe("libellés du journal (06 §1.7)", () => {
  it("nomme chaque nature de mouvement", () => {
    expect(movementLabel(entry({ kind: "PAYMENT", amount: m("80.00"), payment: { id: "pay", kind: "BALANCE", documentId: "d", documentOrigin: "ORDER", customerName: "Fares" } }))).toBe(
      "Paiement · Fares",
    );
    expect(movementLabel(entry({ kind: "PAYMENT", payment: { id: "pay", kind: "BALANCE", documentId: "d", documentOrigin: "ORDER", customerName: null } }))).toBe(
      "Paiement · Client de passage",
    );
    expect(movementLabel(entry({ kind: "EXPENSE", expense: { id: "x", label: "Transport", batchId: "b", batchName: "Lot" } }))).toBe("Dépense · Transport");
    expect(movementLabel(entry({ kind: "SUPPLIER" }))).toBe("Paiement fournisseur");
    expect(movementLabel(entry({ kind: "TRANSFER", amount: m("-300.00"), counterpartPocketName: "Banque" }))).toBe("Transfert vers Banque");
    expect(movementLabel(entry({ kind: "TRANSFER", amount: m("300.00"), counterpartPocketName: "Espèces" }))).toBe("Transfert depuis Espèces");
    expect(movementLabel(entry({ kind: "ADJUSTMENT" }))).toBe("Ajustement");
  });

  it("légende : poche, heure (ou date et heure à plat), raison d'un ajustement", () => {
    const adjustment = entry({ label: "Recomptage" });
    expect(movementCaption(adjustment, { withDate: false }, NOW)).toBe("Espèces · 14 h 32 · Recomptage");
    expect(movementCaption(adjustment, { withDate: true, showPocket: false }, NOW)).toBe("17 sept. · 14 h 32 · Recomptage");
  });
});

describe("annuler un mouvement manuel (T12, 06 S18)", () => {
  it("seulement un transfert, un ajustement ou un paiement fournisseur actif", () => {
    expect(canReverse(entry({ kind: "TRANSFER" }))).toBe(true);
    expect(canReverse(entry({ kind: "SUPPLIER" }))).toBe(true);
    expect(canReverse(entry({ kind: "PAYMENT" }))).toBe(false);
    expect(canReverse(entry({ kind: "EXPENSE" }))).toBe(false);
    expect(canReverse(entry({ kind: "ADJUSTMENT", reversedById: "r" }))).toBe(false);
    expect(canReverse(entry({ kind: "ADJUSTMENT", reversesId: "o" }))).toBe(false);
  });

  it("la confirmation dit l'effet", () => {
    expect(reverseConfirmation({ kind: "TRANSFER", pocketName: "Espèces" })).toEqual({
      title: "Annuler ce transfert ?",
      description: "Une écriture inverse est ajoutée à la même date sur les deux poches.",
      confirmLabel: "Annuler le transfert",
    });
    expect(reverseConfirmation({ kind: "ADJUSTMENT", pocketName: "Banque" }).description).toBe("Une écriture inverse est ajoutée à la même date dans Banque.");
  });

  it("replie chaque paire contre-passée à la place du premier des deux ; une contre-passation seule reste seule", () => {
    const reversal = entry({ id: "r1", reversesId: "o1", amount: m("20.00") });
    const original = entry({ id: "o1", reversedById: "r1" });
    const other = entry({ id: "x1" });
    const lonely = entry({ id: "r2", reversesId: "absent" });
    const items = journalItems([reversal, other, original, lonely]);
    expect(items.map((item) => (item.type === "pair" ? `pair:${item.original.id}/${item.reversal.id}` : item.entry.id))).toEqual(["pair:o1/r1", "x1", "r2"]);
  });

  it("groupe par jour de Paris dans l'ordre reçu", () => {
    const late = entry({ id: "a", occurredAt: "2026-09-16T22:30:00.000Z" }); // 17 sept., 0 h 30 à Paris
    const early = entry({ id: "b", occurredAt: "2026-09-16T21:30:00.000Z" }); // 16 sept., 23 h 30 à Paris
    expect(groupByDay(journalItems([late, early])).map((group) => group.day)).toEqual(["2026-09-17", "2026-09-16"]);
  });
});

describe("gestes de Trésorerie (06 S14, S15, S16, S21)", () => {
  it("le CTA dit l'effet complet, avec l'élision", () => {
    expect(ofPocket("Espèces")).toBe("d'Espèces");
    expect(ofPocket("Banque")).toBe("de Banque");
    expect(movementEffect("repartir", e("120"), { to: "Espèces" })).toBe("Ranger 120,00 € dans Espèces");
    expect(movementEffect("transfert", e("300"), { to: "Banque" })).toBe("Transférer 300,00 € vers Banque");
    expect(movementEffect("ajustement", e("20"), { pocket: "Espèces", direction: "out" })).toBe("Retirer 20,00 € d'Espèces");
    expect(movementEffect("ajustement", e("20"), { pocket: "Banque", direction: "in" })).toBe("Ajouter 20,00 € à Banque");
    expect(movementEffect("fournisseur", e("500"), { pocket: "Banque" })).toBe("Payer 500,00 € depuis Banque");
    expect(movementDoneMessage("transfert", e("300"), { to: "Banque" })).toBe("300,00 € transférés vers Banque");
  });

  it("« Non attribué » ne passe jamais sous zéro : sa sortie est plafonnée à son solde", () => {
    expect(outgoingMax(pocket({ isSystem: true, balance: m("60.00") }))).toEqual(e("60"));
    expect(outgoingMax(pocket({ isSystem: true, balance: m("-5.00") }))).toEqual(e("0"));
    expect(outgoingMax(pocket({ balance: m("10.00") }))).toBeUndefined();
    expect(outgoingMax(null)).toBeUndefined();
  });

  it("archiver : seulement à solde nul, hors « Non attribué » ; sinon la raison", () => {
    expect(archiveBlockedReason(pocket({ balance: m("0.00") }))).toBeNull();
    expect(archiveBlockedReason(pocket({ balance: m("120.00") }))).toBe("Solde non nul : transfère d'abord 120,00 €");
    expect(archiveBlockedReason(pocket({ isSystem: true }))).toMatch(/ne s'archive pas/);
  });

  it("monter et descendre restent dans la liste", () => {
    expect(movedOrder(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(movedOrder(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
    expect(movedOrder(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
  });

  it("propose « Espèces », puis « Banque », puis un nom libre", () => {
    expect(suggestedPocket([])).toEqual({ name: "Espèces", kind: "CASH" });
    expect(suggestedPocket([{ name: "Espèces" }])).toEqual({ name: "Banque", kind: "BANK" });
    expect(suggestedPocket([{ name: "espèces" }, { name: "Banque" }])).toEqual({ name: "", kind: "OTHER" });
  });
});
