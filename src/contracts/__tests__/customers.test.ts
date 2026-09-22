import { describe, expect, it } from "vitest";
import type { ZodError } from "zod";
import { fieldMessages } from "../zod-fr";
import { PHONE_MESSAGE, createCustomerInput, updateCustomerInput } from "../customers";

const ID = "5b0f3a1e-2c4d-4e6f-8a9b-0c1d2e3f4a5b";

const errors = (result: { success: boolean; error?: ZodError }) =>
  result.success ? {} : fieldMessages(result.error as ZodError);

describe("createCustomerInput", () => {
  it("normalise les téléphones français en E.164", () => {
    const parsed = createCustomerInput.parse({
      fullName: "  Fares Benali ",
      phone: "06 12 34 56 78",
      whatsapp: "+33 7 11 22 33 44",
      snapchat: "@fares.b",
      address: "",
      notes: "  préfère le soir ",
    });
    expect(parsed).toEqual({
      fullName: "Fares Benali",
      phone: "+33612345678",
      whatsapp: "+33711223344",
      snapchat: "fares.b",
      address: null,
      notes: "préfère le soir",
    });
  });

  it("nom seul suffit (création en ligne)", () => {
    expect(createCustomerInput.parse({ fullName: "Lina" })).toEqual({ fullName: "Lina" });
  });

  it("refuse un nom trop court, un numéro illisible, un Snap trop court", () => {
    expect(errors(createCustomerInput.safeParse({ fullName: "L", phone: "12 34", snapchat: "a" }))).toEqual({
      fullName: "Indique le nom du client (2 caractères au moins).",
      phone: PHONE_MESSAGE,
      snapchat: "Indique un identifiant Snap de 2 à 40 caractères.",
    });
  });

  it("identifiant facultatif, validé s'il est fourni", () => {
    expect(createCustomerInput.parse({ id: ID, fullName: "Lina" }).id).toBe(ID);
    expect(createCustomerInput.safeParse({ id: "x", fullName: "Lina" }).success).toBe(false);
  });
});

describe("updateCustomerInput", () => {
  it("absent = inchangé, vidé = effacé", () => {
    expect(updateCustomerInput.parse({ id: ID, phone: "", snapchat: null })).toEqual({ id: ID, phone: null, snapchat: null });
    expect(updateCustomerInput.parse({ id: ID })).toEqual({ id: ID });
  });

  it("le nom ne se vide pas", () => {
    expect(errors(updateCustomerInput.safeParse({ id: ID, fullName: "" }))).toEqual({
      fullName: "Indique le nom du client (2 caractères au moins).",
    });
  });
});
