import { describe, expect, it } from "vitest";
import type { ZodError } from "zod";
import { fieldMessages } from "../zod-fr";
import {
  collectAllInput,
  correctPaymentInput,
  creationPaymentInput,
  recordPaymentInput,
  refundInput,
  voidPaymentInput,
} from "../payments";

const ID = "5b0f3a1e-2c4d-4e6f-8a9b-0c1d2e3f4a5b";
const DOC = "7c1e2d3f-4a5b-4c6d-9e8f-1a2b3c4d5e6f";
const OTHER = "9d2f3e4a-5b6c-4d7e-8f9a-0b1c2d3e4f5a";
const CUID = "cm0abc123def456ghi789jkl0";

const errors = (result: { success: boolean; error?: ZodError }) =>
  result.success ? {} : fieldMessages(result.error as ZodError);

describe("contrats des encaissements", () => {
  it("encaisser : montant normalisé, poche absente = « Non attribué », date ISO, nature jamais demandée", () => {
    expect(
      recordPaymentInput.parse({ id: ID, documentId: DOC, amount: "59,9", occurredAt: "2026-09-16", method: " Espèces ", note: "", kind: "REFUND" }),
    ).toEqual({
      id: ID,
      documentId: DOC,
      amount: "59.90",
      pocketId: null,
      occurredAt: new Date("2026-09-16"),
      method: "Espèces",
      note: null,
    });
  });

  it("encaisser : identifiant de paiement fourni par le formulaire (UUID), montant positif exigé", () => {
    expect(errors(recordPaymentInput.safeParse({ id: "mig-pay-x", documentId: DOC, amount: "0" }))).toEqual({
      id: "Cet élément n'est plus reconnu : recharge la page et réessaie.",
      amount: "Indique un montant supérieur à 0 €.",
    });
    expect(errors(recordPaymentInput.safeParse({ id: ID, documentId: DOC }))).toEqual({ amount: "Indique un montant supérieur à 0 €." });
  });

  it("annuler, corriger : un paiement repris (`mig-…`) reste désignable ; le nouveau paiement a un UUID", () => {
    expect(voidPaymentInput.parse({ paymentId: "mig-vente-cm0abc123def456ghi789jkl0" })).toBeTruthy();
    expect(correctPaymentInput.parse({ paymentId: CUID, newPaymentId: ID, amount: "50" })).toEqual({
      paymentId: CUID,
      newPaymentId: ID,
      amount: "50.00",
    });
    // `pocketId` absent : même poche ; null : « Non attribué ».
    expect(correctPaymentInput.parse({ paymentId: CUID, newPaymentId: ID, amount: "50", pocketId: null }).pocketId).toBeNull();
    expect(errors(correctPaymentInput.safeParse({ paymentId: CUID, newPaymentId: CUID, amount: "50" }))).toEqual({});
  });

  it("rembourser et paiement de création : même forme de montant et de poche", () => {
    expect(refundInput.parse({ id: ID, documentId: DOC, amount: "20" })).toMatchObject({ amount: "20.00", pocketId: null });
    expect(creationPaymentInput.parse({ id: ID, amount: "120" })).toEqual({ id: ID, amount: "120.00", pocketId: null });
  });

  it("tout encaisser : au moins un document, chacun une fois", () => {
    expect(collectAllInput.parse({ payments: [{ id: ID, documentId: DOC, amount: "80" }] })).toMatchObject({
      pocketId: null,
      payments: [{ id: ID, documentId: DOC, amount: "80.00" }],
    });
    expect(errors(collectAllInput.safeParse({ payments: [] }))).toEqual({ payments: "Aucun document à encaisser." });
    expect(
      errors(
        collectAllInput.safeParse({
          payments: [
            { id: ID, documentId: DOC, amount: "1" },
            { id: OTHER, documentId: DOC, amount: "1" },
          ],
        }),
      ),
    ).toEqual({ "payments.1": "Ce document apparaît deux fois : recharge la page et réessaie." });
  });
});
