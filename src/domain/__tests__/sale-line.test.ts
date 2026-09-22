import { describe, expect, it } from "vitest";
import { eurFromDb } from "../money";
import {
  DEFAULT_VOLUME_ML,
  GIFT_PRICE_MESSAGE,
  VOLUMES_ML,
  isVolumeMl,
  storedLineViolation,
  type StoredLineRules,
} from "../sale-line";

const valid: StoredLineRules = {
  perfumeName: "Sauvage",
  volumeMl: 80,
  isGift: false,
  unitPriceEur: eurFromDb("120.00"),
  hasUnitCostDzd: true,
  hasValidExchangeRate: true,
};

describe("contenances réelles : 10, 50, 80 ml", () => {
  it("liste et défaut", () => {
    expect(VOLUMES_ML).toEqual([10, 50, 80]);
    expect(DEFAULT_VOLUME_ML).toBe(80);
  });
  it.each([10, 50, 80])("accepte %i ml", (v) => expect(isVolumeMl(v)).toBe(true));
  it.each([0, 30, 75, 100, 80.5, null, "80", undefined])("refuse %s", (v) => expect(isVolumeMl(v)).toBe(false));
});

describe("storedLineViolation — lignes reprises hors règles (03 §4.3)", () => {
  it("une ligne conforme ne signale rien", () => {
    expect(storedLineViolation(valid)).toBeNull();
    expect(storedLineViolation({ ...valid, hasUnitCostDzd: false, hasValidExchangeRate: false })).toBeNull();
    expect(storedLineViolation({ ...valid, isGift: true, unitPriceEur: eurFromDb("0.00") })).toBeNull();
  });

  it("volume nul : nomme le parfum et dit qu'il s'agit d'une ligne reprise", () => {
    expect(storedLineViolation({ ...valid, volumeMl: null })).toEqual({
      field: "volumeMl",
      message: "Choisis le volume de Sauvage (ligne reprise sans volume) pour continuer.",
    });
  });

  it.each([75, 100])("volume hors 10/50/80 (%i ml repris)", (volumeMl) => {
    expect(storedLineViolation({ ...valid, volumeMl })).toEqual({
      field: "volumeMl",
      message: "Choisis le volume de Sauvage (10, 50 ou 80 ml) pour continuer.",
    });
  });

  it("don à prix non nul", () => {
    expect(storedLineViolation({ ...valid, isGift: true })).toEqual({ field: "unitPriceEur", message: GIFT_PRICE_MESSAGE });
  });

  it("coût en dinars sans taux valide", () => {
    expect(storedLineViolation({ ...valid, hasValidExchangeRate: false })).toEqual({
      field: "exchangeRate",
      message: "Indique le taux de la ligne Sauvage.",
    });
  });

  it("une règle à la fois, dans l'ordre volume, don, taux", () => {
    expect(storedLineViolation({ ...valid, volumeMl: null, isGift: true, hasValidExchangeRate: false })?.field).toBe(
      "volumeMl",
    );
  });
});
