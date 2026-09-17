import { describe, expect, it } from "vitest";
import type { ZodError } from "zod";
import { fieldMessages } from "../zod-fr";
import { createBatchInput, setBatchStatusInput, updateBatchInput } from "../batches";

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
