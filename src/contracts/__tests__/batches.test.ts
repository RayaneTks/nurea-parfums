import { describe, expect, it } from "vitest";
import type { ZodError } from "zod";
import { fieldMessages } from "../zod-fr";
import {
  MAX_UNBATCHED_PAGES,
  addBatchExpenseInput,
  createBatchInput,
  deleteBatchExpenseInput,
  parseBatchesParams,
  setBatchStatusInput,
  updateBatchExpenseInput,
  updateBatchInput,
} from "../batches";

const ID = "5b0f3a1e-2c4d-4e6f-8a9b-0c1d2e3f4a5b";

const errors = (result: { success: boolean; error?: ZodError }) =>
  result.success ? {} : fieldMessages(result.error as ZodError);

describe("contrats des lots", () => {
  it("création : nom rogné, date ISO, notes vides effacées", () => {
    expect(createBatchInput.parse({ name: " Commande de mars ", expectedAt: "2026-10-03", notes: "" })).toEqual({
      name: "Commande de mars",
      expectedAt: new Date("2026-10-03"),
      notes: null,
    });
  });

  it("création : nom de 2 caractères au moins, date lisible", () => {
    expect(errors(createBatchInput.safeParse({ name: "M", expectedAt: "bientôt" }))).toEqual({
      name: "Donne un nom au lot (2 caractères au moins).",
      expectedAt: "Choisis une date valide.",
    });
  });

  it("modification : date vidée = effacée, absente = inchangée", () => {
    expect(updateBatchInput.parse({ id: ID, expectedAt: "" })).toEqual({ id: ID, expectedAt: null });
    expect(updateBatchInput.parse({ id: ID })).toEqual({ id: ID });
  });

  it("statut : OPEN ou CLOSED", () => {
    expect(setBatchStatusInput.safeParse({ id: ID, status: "CLOSED" }).success).toBe(true);
    expect(setBatchStatusInput.safeParse({ id: ID, status: "ARCHIVED" }).success).toBe(false);
  });
});

describe("contrats des dépenses de lot", () => {
  const EXPENSE_ID = "7c1e2d3f-4a5b-4c6d-9e8f-1a2b3c4d5e6f";

  it("ajout : libellé rogné, montant normalisé, poche absente = « Non attribué », date ISO, notes vides effacées", () => {
    expect(
      addBatchExpenseInput.parse({ id: EXPENSE_ID, batchId: ID, label: " Transport ", amount: "45,5", occurredAt: "2026-09-16", notes: "" }),
    ).toEqual({
      id: EXPENSE_ID,
      batchId: ID,
      label: "Transport",
      amount: "45.50",
      pocketId: null,
      occurredAt: new Date("2026-09-16"),
      notes: null,
    });
  });

  it("ajout : identifiant du formulaire, libellé et montant positif exigés", () => {
    expect(errors(addBatchExpenseInput.safeParse({ id: "x", batchId: ID, label: "T", amount: "-1" }))).toEqual({
      id: "Cet élément n'est plus reconnu : recharge la page et réessaie.",
      label: "Indique le libellé de la dépense (Transport, Douane…).",
      amount: "Saisis un montant en euros (ex. 60 ou 59,90).",
    });
  });

  it("suppression : une dépense reprise (`mig-dep-…`) reste désignable", () => {
    expect(deleteBatchExpenseInput.safeParse({ id: "mig-dep-cm0abc123def456ghi789jkl0" }).success).toBe(true);
    expect(deleteBatchExpenseInput.safeParse({ id: "../dépense" }).success).toBe(false);
  });

  it("modification : libellé et notes SEULS ; montant, date et poche sont en écriture seule", () => {
    expect(updateBatchExpenseInput.parse({ id: EXPENSE_ID, label: " Douane ", notes: "" })).toEqual({
      id: EXPENSE_ID,
      label: "Douane",
      notes: null,
    });
    // Un champ absent n'est pas touché ; un champ que le contrat ignore ne passe pas au writer.
    expect(updateBatchExpenseInput.parse({ id: EXPENSE_ID })).toEqual({ id: EXPENSE_ID });
    expect(updateBatchExpenseInput.parse({ id: EXPENSE_ID, amount: "90", pocketId: ID })).toEqual({ id: EXPENSE_ID });
    expect(errors(updateBatchExpenseInput.safeParse({ id: EXPENSE_ID, label: "T" }))).toEqual({
      label: "Indique le libellé de la dépense (Transport, Douane…).",
    });
  });
});

describe("paramètres d'écran de E05", () => {
  it("saisie rognée et plafonnée, pagination bornée", () => {
    expect(parseBatchesParams({})).toEqual({ q: "", pages: 1 });
    expect(parseBatchesParams({ q: "  fares  ", pages: "3" })).toEqual({ q: "fares", pages: 3 });
    expect(parseBatchesParams({ q: "x".repeat(200) }).q).toHaveLength(120);
  });

  it("une pagination illisible ou hors bornes revient à une valeur sûre", () => {
    expect(parseBatchesParams({ pages: "0" }).pages).toBe(1);
    expect(parseBatchesParams({ pages: "-2" }).pages).toBe(1);
    expect(parseBatchesParams({ pages: "abc" }).pages).toBe(1);
    expect(parseBatchesParams({ pages: "999" }).pages).toBe(MAX_UNBATCHED_PAGES);
  });
});
