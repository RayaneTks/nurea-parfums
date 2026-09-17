import { describe, expect, it } from "vitest";
import { capitalizeFirst, formatDate, formatRelative, toDate } from "../date-format";

const NBSP = " ";
// Jeudi 17 septembre 2026, 14 h 32 à Paris (UTC+2).
const at = new Date("2026-09-17T12:32:00Z");
const now = new Date("2026-09-17T18:00:00Z");

describe("formatDate — Europe/Paris, typographie française", () => {
  it("formats de liste, de titre, de reçu", () => {
    expect(formatDate(at, "day", now)).toBe("jeu. 17 sept.");
    expect(formatDate(at, "short", now)).toBe("17 sept.");
    expect(formatDate(at, "long", now)).toBe("jeudi 17 septembre");
    expect(formatDate(at, "full", now)).toBe("17 septembre 2026");
    expect(formatDate(at, "time", now)).toBe(`14${NBSP}h${NBSP}32`);
    expect(formatDate(at, "datetime", now)).toBe(`17 sept. · 14${NBSP}h${NBSP}32`);
  });

  it("jamais de capitale sur un nom de jour ou de mois (« Mercredi 17 Septembre » était un bug)", () => {
    expect(formatDate(at, "long", now)).toMatch(/^[a-zé]/);
    expect(capitalizeFirst(formatDate(at, "long", now))).toBe("Jeudi 17 septembre");
  });

  it("le jour est celui de Paris, pas celui de la machine", () => {
    // 23 h 30 UTC le 17 = 1 h 30 le 18 à Paris.
    expect(formatDate(new Date("2026-09-17T23:30:00Z"), "short", now)).toBe("18 sept.");
    expect(formatDate(new Date("2026-09-17T23:30:00Z"), "time", now)).toBe(`1${NBSP}h${NBSP}30`);
  });

  it("l'année n'apparaît que si elle diffère", () => {
    expect(formatDate(new Date("2025-08-03T10:00:00Z"), "short", now)).toBe("3 août 2025");
    expect(formatDate(new Date("2025-08-03T10:00:00Z"), "day", now)).toBe("dim. 3 août 2025");
  });

  it("date invalide : null plutôt qu'« Invalid Date »", () => {
    expect(toDate("pas une date")).toBeNull();
    expect(toDate("2026-09-17T12:32:00Z")).toEqual(at);
  });
});

describe("formatRelative — jours calendaires de Paris", () => {
  it("relatif sous 7 jours", () => {
    expect(formatRelative(at, now)).toBe(`aujourd'hui · 14${NBSP}h${NBSP}32`);
    expect(formatRelative(new Date("2026-09-16T07:05:00Z"), now)).toBe(`hier · 9${NBSP}h${NBSP}05`);
    expect(formatRelative(new Date("2026-09-14T10:00:00Z"), now)).toBe(`il y a 3${NBSP}j`);
    expect(formatRelative(new Date("2026-09-18T10:00:00Z"), now)).toBe("demain");
    expect(formatRelative(new Date("2026-09-21T10:00:00Z"), now)).toBe(`dans 4${NBSP}j`);
  });

  it("absolu à partir de 7 jours", () => {
    expect(formatRelative(new Date("2026-09-10T10:00:00Z"), now)).toBe("jeu. 10 sept.");
  });

  it("23 h 59 → 0 h 01 compte un jour (minuit de Paris)", () => {
    const lateEvening = new Date("2026-09-16T21:59:00Z"); // 23 h 59 à Paris
    const justAfterMidnight = new Date("2026-09-16T22:01:00Z"); // 0 h 01 le 17
    expect(formatRelative(lateEvening, justAfterMidnight)).toBe(`hier · 23${NBSP}h${NBSP}59`);
  });
});
