import { describe, expect, it } from "vitest";
import {
  DEFAULT_VOLUME_ML,
  LEGACY_VOLUME_ML,
  VOLUMES_ML,
  isAcceptedVolumeMl,
  isVolumeMl,
  normalizeVolumeMl,
  volumeLabel,
  volumeOptions,
} from "../volumes";

describe("contenances proposées", () => {
  it("l'offre est 10 / 50 / 80 ml", () => {
    expect([...VOLUMES_ML]).toEqual([10, 50, 80]);
  });

  it("la valeur par défaut fait partie de l'offre", () => {
    expect(isVolumeMl(DEFAULT_VOLUME_ML)).toBe(true);
  });

  it("aucune contenance héritée ne figure dans l'offre", () => {
    for (const legacy of Object.keys(LEGACY_VOLUME_ML).map(Number)) {
      expect(isVolumeMl(legacy)).toBe(false);
    }
  });
});

describe("normalizeVolumeMl", () => {
  it("traduit les contenances héritées", () => {
    expect(normalizeVolumeMl(30)).toBe(10);
    expect(normalizeVolumeMl(100)).toBe(80);
  });

  it("laisse passer les contenances courantes", () => {
    expect(normalizeVolumeMl(10)).toBe(10);
    expect(normalizeVolumeMl(50)).toBe(50);
    expect(normalizeVolumeMl(80)).toBe(80);
  });

  it("refuse ce qu'elle ne sait pas traduire, plutôt que d'inventer", () => {
    expect(normalizeVolumeMl(75)).toBeNull();
    expect(normalizeVolumeMl(0)).toBeNull();
    expect(normalizeVolumeMl(-10)).toBeNull();
    expect(normalizeVolumeMl(Number.NaN)).toBeNull();
    expect(normalizeVolumeMl(null)).toBeNull();
    expect(normalizeVolumeMl(undefined)).toBeNull();
  });

  it("est idempotente : traduire deux fois ne change rien", () => {
    const once = normalizeVolumeMl(100);
    expect(normalizeVolumeMl(once)).toBe(once);
  });
});

describe("isAcceptedVolumeMl", () => {
  it("accepte courantes et héritées, rejette le reste", () => {
    expect(isAcceptedVolumeMl(50)).toBe(true);
    expect(isAcceptedVolumeMl(30)).toBe(true);
    expect(isAcceptedVolumeMl(42)).toBe(false);
  });
});

describe("volumeOptions", () => {
  it("propose l'offre pour une ligne neuve", () => {
    expect(volumeOptions(null)).toEqual([10, 50, 80]);
  });

  it("ne double pas l'option pour une contenance héritée : elle est traduite", () => {
    expect(volumeOptions(100)).toEqual([10, 50, 80]);
  });

  it("garde une contenance inconnue dans la liste, sinon le menu la réécrirait", () => {
    expect(volumeOptions(75)).toEqual([10, 50, 75, 80]);
  });
});

describe("volumeLabel", () => {
  it("écrit la contenance en toutes lettres courtes", () => {
    expect(volumeLabel(80)).toBe("80 ml");
  });
});
