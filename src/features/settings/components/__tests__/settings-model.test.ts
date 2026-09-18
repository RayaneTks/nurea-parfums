import { describe, expect, it } from "vitest";
import type { PocketSummary } from "@/contracts/treasury";
import { RATE_MESSAGE, updateSettingsInput } from "@/contracts/settings";
import type { MoneyString } from "@/domain/money";
import {
  canOrderPockets,
  defaultPocketLabel,
  rateToInputText,
  rateToStored,
  sameRate,
  selectablePockets,
  UNASSIGNED_LABEL,
} from "../settings-model";

/** Modèles purs de E08 (06 E08) : ce que la rangée écrit, ce que le champ envoie. */

const m = (value: string) => value as MoneyString;

const pocket = (over: Partial<PocketSummary> & { id: string; name: string }): PocketSummary => ({
  kind: "CASH",
  isSystem: false,
  archived: false,
  sortOrder: 0,
  openingBalance: m("0.00"),
  balance: m("0.00"),
  isDefault: false,
  ...over,
});

const SYSTEM = pocket({ id: "poche-non-attribue", name: "Non attribué", kind: "UNASSIGNED", isSystem: true, sortOrder: 0 });
const CASH = pocket({ id: "p-especes", name: "Espèces", sortOrder: 1, isDefault: true });
const BANK = pocket({ id: "p-banque", name: "Banque", kind: "BANK", sortOrder: 2 });
const ARCHIVED = pocket({ id: "p-vieille", name: "Ancienne", archived: true, sortOrder: 3 });

describe("poche par défaut (N2)", () => {
  it("écrit le nom de la poche choisie", () => {
    expect(defaultPocketLabel([SYSTEM, CASH, BANK], CASH.id)).toBe("Espèces");
    expect(defaultPocketLabel([SYSTEM, CASH, BANK], BANK.id)).toBe("Banque");
  });

  it("sans poche choisie, écrit « Non attribué » — jamais une rangée vide", () => {
    expect(defaultPocketLabel([SYSTEM, CASH], null)).toBe("Non attribué");
    expect(defaultPocketLabel([], null)).toBe(UNASSIGNED_LABEL);
  });

  it("poche disparue depuis un autre écran : « Non attribué », ce qui est bien ce qui sera proposé", () => {
    expect(defaultPocketLabel([SYSTEM, CASH], "p-effacee")).toBe("Non attribué");
  });

  it("le sélecteur ne propose que les poches rangées et actives (06 S07)", () => {
    expect(selectablePockets([SYSTEM, CASH, BANK, ARCHIVED]).map((p) => p.name)).toEqual(["Espèces", "Banque"]);
  });
});

describe("ordre des poches (S21)", () => {
  it("ne s'offre qu'à partir de deux poches rangées : à une seule, ranger ne veut rien dire (05 §5.3)", () => {
    expect(canOrderPockets([SYSTEM])).toBe(false);
    expect(canOrderPockets([SYSTEM, CASH])).toBe(false);
    expect(canOrderPockets([SYSTEM, CASH, ARCHIVED])).toBe(false);
    expect(canOrderPockets([SYSTEM, CASH, BANK])).toBe(true);
  });
});

describe("taux DZD par défaut (N3)", () => {
  it("s'affiche comme on l'écrit, sans décimale inutile", () => {
    expect(rateToInputText("277.00")).toBe("277");
    expect(rateToInputText("245.50")).toBe("245,5");
    expect(rateToInputText("245.55")).toBe("245,55");
    expect(rateToInputText("300.1234")).toBe("300,1234");
  });

  it("se relit comme le contrat le relit : virgule, point, refus de 0 et de l'illisible", () => {
    expect(rateToStored("277")).toBe("277.00");
    expect(rateToStored("245,5")).toBe("245.50");
    expect(rateToStored("245.5")).toBe("245.50");
    expect(rateToStored("0")).toBeNull();
    expect(rateToStored("")).toBeNull();
    expect(rateToStored("beaucoup")).toBeNull();
  });

  it("l'écran valide EXACTEMENT comme le serveur (même lecture, même message)", () => {
    for (const text of ["277", "245,5", "245.5"]) {
      const parsed = updateSettingsInput.safeParse({ defaultExchangeRate: text });
      expect(parsed.success && parsed.data.defaultExchangeRate).toBe(rateToStored(text));
    }
    for (const text of ["0", "-2", "beaucoup"]) {
      const parsed = updateSettingsInput.safeParse({ defaultExchangeRate: text });
      expect(parsed.success).toBe(false);
      expect(rateToStored(text)).toBeNull();
      expect(RATE_MESSAGE).toBe("Saisis un taux supérieur à 0 (ex. 277).");
    }
  });

  it("une saisie qui redit le taux enregistré n'a rien à envoyer", () => {
    expect(sameRate("277", "277.00")).toBe(true);
    expect(sameRate("277,00", "277.00")).toBe(true);
    expect(sameRate("245,5", "245.50")).toBe(true);
    expect(sameRate("280", "277.00")).toBe(false);
    expect(sameRate("", "277.00")).toBe(false);
  });
});
