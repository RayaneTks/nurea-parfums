import { describe, expect, it } from "vitest";
import type { ZodError } from "zod";
import { fieldMessages } from "../zod-fr";
import { RATE_MESSAGE, updateSettingsInput } from "../settings";

const CUID = "cm0abc123def456ghi789jkl0";

const errors = (result: { success: boolean; error?: ZodError }) =>
  result.success ? {} : fieldMessages(result.error as ZodError);

describe("contrat des réglages", () => {
  it("taux normalisé en chaîne exacte ; poche par défaut, ou null (« Non attribué »)", () => {
    expect(updateSettingsInput.parse({ defaultExchangeRate: "245,5" })).toEqual({ defaultExchangeRate: "245.50" });
    expect(updateSettingsInput.parse({ defaultExchangeRate: "277" })).toEqual({ defaultExchangeRate: "277.00" });
    expect(updateSettingsInput.parse({ defaultPocketId: null })).toEqual({ defaultPocketId: null });
    expect(updateSettingsInput.parse({ defaultPocketId: CUID })).toEqual({ defaultPocketId: CUID });
  });

  it("taux nul, négatif ou à plus de 4 décimales refusé ; rien à changer refusé", () => {
    for (const rate of ["0", "-1", "277,12345", "beaucoup"]) {
      expect(errors(updateSettingsInput.safeParse({ defaultExchangeRate: rate }))).toEqual({ defaultExchangeRate: RATE_MESSAGE });
    }
    expect(errors(updateSettingsInput.safeParse({}))).toEqual({ "": "Aucune modification à enregistrer." });
  });
});
