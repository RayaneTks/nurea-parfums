import { describe, expect, it } from "vitest";
import type { SupplierPickerBatchDTO, SupplierPickerDocumentDTO } from "@/contracts/supplier";
import { dzdFromDb, formatDzd, toDb } from "@/domain/money";
import {
  batchState,
  defaultDebtLabel,
  matchDocuments,
  missingLabel,
  notedName,
  pickedItems,
  pickedSummary,
  summaryLine,
  toggleBatch,
  toggleDocument,
} from "../picker-model";

const doc = (id: string, over: Partial<SupplierPickerDocumentDTO> = {}): SupplierPickerDocumentDTO => ({
  id,
  origin: "ORDER",
  status: "CONFIRMED",
  orderedAt: "2026-10-12T10:00:00.000Z",
  customerName: "Farès",
  batchId: null,
  costDzd: "0.00",
  lineCount: 1,
  missingLines: 0,
  items: ["Sauvage"],
  noted: null,
  ...over,
});

const lot: SupplierPickerBatchDTO = { id: "lot", name: "Lot de mars", status: "OPEN", documentCount: 2, costDzd: "50000.10", missingLines: 1, noted: null };
const documents = [
  doc("a", { batchId: "lot", costDzd: "27700.05" }),
  doc("b", { batchId: "lot", costDzd: "22300.05", missingLines: 1, customerName: "Lina" }),
  doc("c", { costDzd: "9000.00", customerName: "Nora", items: ["Libre"] }),
];

describe("S25 — cocher", () => {
  it("cocher un lot coche ses documents ; recocher le décoche en entier ; un lot en partie se complète", () => {
    const all = toggleBatch(documents, "lot", new Set());
    expect([...all].sort()).toEqual(["a", "b"]);
    expect(batchState(documents, "lot", all)).toBe("all");
    expect(toggleBatch(documents, "lot", all).size).toBe(0);
    const some = toggleDocument("a", new Set());
    expect(batchState(documents, "lot", some)).toBe("some");
    expect([...toggleBatch(documents, "lot", some)].sort()).toEqual(["a", "b"]);
  });

  it("un lot entier part comme UN lot, le reste document par document", () => {
    const picked = new Set(["a", "b", "c"]);
    expect(pickedItems(documents, [lot], picked)).toEqual([
      { kind: "batch", batchId: "lot" },
      { kind: "document", documentId: "c" },
    ]);
    expect(pickedItems(documents, [lot], new Set(["a", "c"]))).toEqual([
      { kind: "document", documentId: "a" },
      { kind: "document", documentId: "c" },
    ]);
  });

  it("un lot dont la liste tronquée ne porte pas tous les documents ne part jamais comme lot", () => {
    expect(pickedItems(documents, [{ ...lot, documentCount: 3 }], new Set(["a", "b"]))).toEqual([
      { kind: "document", documentId: "a" },
      { kind: "document", documentId: "b" },
    ]);
  });
});

describe("S25 — le bandeau", () => {
  it("Σ des coûts au centime, éléments envoyés, lignes sans coût à part", () => {
    const summary = pickedSummary(documents, [lot], new Set(["a", "b", "c"]));
    expect(toDb(summary.totalDzd)).toBe("59000.10");
    expect(summary).toMatchObject({ count: 2, missingLines: 1 });
    expect(summaryLine(summary)).toBe(`2 éléments · ${formatDzd(dzdFromDb("59000.10"))}`);
    expect(missingLabel(2)).toBe("dont 2 lignes sans coût");
    expect(missingLabel(1)).toBe("dont 1 ligne sans coût");
    expect(missingLabel(0)).toBeNull();
  });

  it("rien de coché : 0 élément, 0 DA", () => {
    const summary = pickedSummary(documents, [lot], new Set());
    expect(summaryLine(summary)).toBe(`0 élément · ${formatDzd(dzdFromDb("0"))}`);
  });
});

describe("S25 — noms et recherche", () => {
  const now = new Date("2026-10-24T12:00:00.000Z");
  it("« Dette du 24 oct. » ; une dette déjà notée sans nom se dit par sa date", () => {
    expect(defaultDebtLabel(now, now)).toBe("Dette du 24 oct.");
    expect(notedName({ entryId: "e", label: null, occurredAt: "2026-10-04T12:00:00.000Z" }, now)).toBe("Dette du 4 oct.");
    expect(notedName({ entryId: "e", label: "Lot de mars", occurredAt: "2026-10-04T12:00:00.000Z" }, now)).toBe("Lot de mars");
  });

  it("la recherche trouve un client, un parfum, ou le nom du lot", () => {
    const names = new Map([["lot", "Lot de mars"]]);
    expect(matchDocuments(documents, names, "lina").map((d) => d.id)).toEqual(["b"]);
    expect(matchDocuments(documents, names, "libre").map((d) => d.id)).toEqual(["c"]);
    expect(matchDocuments(documents, names, "mars").map((d) => d.id)).toEqual(["a", "b"]);
  });
});
