import { describe, expect, it } from "vitest";
import type { ZodError } from "zod";
import { fieldMessages } from "../zod-fr";
import {
  adjustInput,
  createPocketInput,
  futureDateMessage,
  isRecordId,
  pocketChoice,
  positiveAmount,
  reverseMovementInput,
  supplierPaymentInput,
  transferInput,
  updatePocketInput,
  valueDateOf,
} from "../treasury";

const ID = "5b0f3a1e-2c4d-4e6f-8a9b-0c1d2e3f4a5b";
const CUID = "cm0abc123def456ghi789jkl0";

const errors = (result: { success: boolean; error?: ZodError }) =>
  result.success ? {} : fieldMessages(result.error as ZodError);

describe("champs d'argent partagés", () => {
  it("montant saisi → MoneyString positive ; nul, négatif, illisible ou à 3 décimales refusés", () => {
    expect(positiveAmount.parse("60")).toBe("60.00");
    expect(positiveAmount.parse("59,9")).toBe("59.90");
    expect(positiveAmount.parse("1 234,56")).toBe("1234.56");
    expect(positiveAmount.parse("60.00")).toBe("60.00");
    expect(errors(positiveAmount.safeParse("0"))).toEqual({ "": "Indique un montant supérieur à 0 €." });
    for (const text of ["-5", "douze", "12,345", ""]) {
      expect(errors(positiveAmount.safeParse(text))).toEqual({ "": "Saisis un montant en euros (ex. 60 ou 59,90)." });
    }
  });

  it("identifiants de lignes en base : cuid, UUID, identifiants de la reprise et de la poche système ; rien d'autre", () => {
    for (const id of [ID, CUID, "mig-pay-cm0abc123def456ghi789jkl0", "mig-poche-non-attribue", "poche-non-attribue"]) {
      expect(isRecordId(id)).toBe(true);
    }
    for (const id of ["", "Robert'); DROP", "MIG-PAY-X", "espèces", "a".repeat(200), 12]) {
      expect(isRecordId(id)).toBe(false);
    }
  });

  it("poche : null ou absente = « Non attribué »", () => {
    expect(pocketChoice.parse(undefined)).toBeNull();
    expect(pocketChoice.parse(null)).toBeNull();
    expect(pocketChoice.parse(CUID)).toBe(CUID);
  });

  it("date de valeur : absente ⇒ maintenant ; jour futur (Paris) ⇒ refus ; plus tard aujourd'hui ⇒ maintenant ; passée ⇒ gardée", () => {
    const now = new Date("2026-09-17T10:00:00.000Z"); // 12:00 à Paris
    expect(valueDateOf(undefined, now)).toBe(now);
    expect(valueDateOf(null, now)).toBe(now);
    expect(valueDateOf(new Date("2026-09-17T20:00:00.000Z"), now)).toBe(now);
    expect(valueDateOf(new Date("2026-09-17T22:30:00.000Z"), now)).toBeNull(); // 00:30 le 18 à Paris
    const yesterday = new Date("2026-09-16T08:00:00.000Z");
    expect(valueDateOf(yesterday, now)).toBe(yesterday);
    expect(futureDateMessage("dépense")).toBe("Choisis une date passée : une dépense ne se date pas dans le futur.");
    expect(futureDateMessage("paiement")).toBe("Choisis une date passée : un paiement ne se date pas dans le futur.");
  });
});

describe("poches", () => {
  it("création : nom rogné, nature créable, solde d'ouverture vide = 0, défaut non demandé", () => {
    expect(createPocketInput.parse({ name: " Espèces ", kind: "CASH" })).toEqual({
      name: "Espèces",
      kind: "CASH",
      openingBalance: "0.00",
      makeDefault: false,
    });
    expect(createPocketInput.parse({ id: ID, name: "Banque", kind: "BANK", openingBalance: "1 200,5", makeDefault: true })).toMatchObject({
      openingBalance: "1200.50",
      makeDefault: true,
    });
    expect(errors(createPocketInput.safeParse({ name: "B", kind: "UNASSIGNED", openingBalance: "-5" }))).toEqual({
      name: "Donne un nom à la poche (2 caractères au moins).",
      kind: "Choisis une des options proposées.",
      openingBalance: "Saisis un solde en euros (ex. 200 ou 0).",
    });
  });

  it("modification : au moins un champ ; rang entier positif", () => {
    expect(updatePocketInput.parse({ id: CUID, position: 0 })).toEqual({ id: CUID, position: 0 });
    expect(errors(updatePocketInput.safeParse({ id: CUID }))).toEqual({ "": "Aucune modification à enregistrer." });
    expect(errors(updatePocketInput.safeParse({ id: CUID, position: -1 }))).toEqual({ position: "Indique un rang de 0 ou plus." });
  });
});

describe("mouvements manuels", () => {
  it("transfert : source null = « Non attribué » ; deux fois la même poche refusée ; réserve non confirmée par défaut", () => {
    expect(transferInput.parse({ fromPocketId: null, toPocketId: CUID, amount: "120" })).toEqual({
      fromPocketId: null,
      toPocketId: CUID,
      amount: "120.00",
      confirm: false,
    });
    expect(errors(transferInput.safeParse({ fromPocketId: CUID, toPocketId: CUID, amount: "1" }))).toEqual({
      toPocketId: "Choisis deux poches différentes.",
    });
    expect(errors(transferInput.safeParse({ fromPocketId: CUID, toPocketId: ID, amount: "1", occurredAt: "hier" }))).toEqual({
      occurredAt: "Choisis une date valide.",
    });
  });

  it("ajustement : sens et raison exigés ; paiement fournisseur : note facultative", () => {
    expect(adjustInput.parse({ pocketId: CUID, direction: "out", amount: "20", reason: " Écart " })).toMatchObject({
      direction: "out",
      amount: "20.00",
      reason: "Écart",
    });
    expect(errors(adjustInput.safeParse({ pocketId: CUID, direction: "sideways", amount: "20" }))).toEqual({
      direction: "Choisis une des options proposées.",
      reason: "Indique la raison de l'ajustement.",
    });
    expect(supplierPaymentInput.parse({ pocketId: null, amount: "500", note: "" })).toEqual({ pocketId: null, amount: "500.00", note: null });
    expect(reverseMovementInput.parse({ movementId: "mig-compensation-cm0abc123def456ghi789jkl0" })).toBeTruthy();
  });
});
