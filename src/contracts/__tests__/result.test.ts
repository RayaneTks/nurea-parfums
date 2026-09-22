import { describe, expect, it } from "vitest";
import type { ActionErrorCode, ActionResult } from "../result";
import type { DomainErrorCode } from "@/domain/errors";

describe("ActionResult", () => {
  it("les codes du domaine restent des codes d'action (vérifié à la compilation)", () => {
    // `toActionError` recopie `DomainError.code` tel quel : un code du domaine absent de
    // ActionErrorCode ferait échouer `npm run typecheck` sur cette ligne.
    const domainCodesAreActionCodes: DomainErrorCode extends ActionErrorCode ? true : false = true;
    expect(domainCodesAreActionCodes).toBe(true);
  });

  it("un succès peut porter une notice, un échec porte toujours retryable", () => {
    const ok: ActionResult<{ id: string }> = { ok: true, data: { id: "x" }, notice: "Cette marque existait déjà." };
    const ko: ActionResult<never> = {
      ok: false,
      error: { code: "UNAVAILABLE", message: "La base ne répond pas. Rien n'a été enregistré — réessaie.", retryable: true },
    };
    expect([ok.ok, ko.ok]).toEqual([true, false]);
  });
});
