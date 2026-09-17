import { describe, expect, it } from "vitest";
import { SERIES_BUCKET, parsePeriod, periodFromParams, periodKey, type Period } from "../chiffres";

describe("clés de période (04 §6.2, 06 §8.1.7)", () => {
  it("lit « depuis toujours », les périodes calendaires, leur jour de référence et leur décalage", () => {
    expect(parsePeriod("all")).toEqual({ kind: "all" });
    expect(parsePeriod("month")).toEqual({ kind: "calendar", unit: "month", ref: null, offset: 0 });
    expect(parsePeriod("week-1")).toEqual({ kind: "calendar", unit: "week", ref: null, offset: -1 });
    expect(parsePeriod("day@2026-03-29")).toEqual({ kind: "calendar", unit: "day", ref: "2026-03-29", offset: 0 });
    expect(parsePeriod("year@2026-09-17+2")).toEqual({ kind: "calendar", unit: "year", ref: "2026-09-17", offset: 2 });
    expect(parsePeriod("month@2026-09-17-12")).toEqual({ kind: "calendar", unit: "month", ref: "2026-09-17", offset: -12 });
  });

  it("lit un intervalle d'instants ISO munis de leur fuseau, [from, to[", () => {
    expect(parsePeriod("2026-08-31T22:00:00.000Z/2026-09-30T22:00:00Z")).toEqual({
      kind: "range",
      from: "2026-08-31T22:00:00.000Z",
      to: "2026-09-30T22:00:00.000Z",
    });
    expect(parsePeriod("2026-09-01T00:00+02:00/2026-10-01T00:00+02:00")).toEqual({
      kind: "range",
      from: "2026-08-31T22:00:00.000Z",
      to: "2026-09-30T22:00:00.000Z",
    });
  });

  it("refuse une unité inconnue, un jour inexistant, un instant sans fuseau, un intervalle vide ou inversé", () => {
    for (const key of [
      "",
      "mois",
      "quarter",
      "month@2026-02-30",
      "month@17-09-2026",
      "month+",
      "month+12345",
      "2026-09-01/2026-10-01",
      "2026-09-01T00:00/2026-10-01T00:00",
      "2026-10-01T00:00:00Z/2026-09-01T00:00:00Z",
      "2026-09-01T00:00:00Z/2026-09-01T00:00:00Z",
      "all/all",
    ]) {
      expect(parsePeriod(key), key).toBeNull();
    }
  });

  it("clé canonique : aller-retour exact", () => {
    const periods: Period[] = [
      { kind: "all" },
      { kind: "calendar", unit: "day", ref: null, offset: 0 },
      { kind: "calendar", unit: "week", ref: null, offset: -3 },
      { kind: "calendar", unit: "month", ref: "2026-09-17", offset: 0 },
      { kind: "calendar", unit: "year", ref: "2026-01-01", offset: 1 },
      { kind: "range", from: "2026-08-31T22:00:00.000Z", to: "2026-09-30T22:00:00.000Z" },
    ];
    for (const period of periods) expect(parsePeriod(periodKey(period))).toEqual(period);
    expect(periodKey({ kind: "calendar", unit: "month", ref: "2026-09-17", offset: -1 })).toBe("month@2026-09-17-1");
  });

  it("paramètres d'URL : période et jour de référence, repli sur le mois", () => {
    expect(periodFromParams({ periode: "semaine", ref: "2026-09-17" })).toBe("week@2026-09-17");
    expect(periodFromParams({ periode: "annee" })).toBe("year");
    expect(periodFromParams({ periode: "tout", ref: "2026-09-17" })).toBe("all");
    expect(periodFromParams({})).toBe("month");
    expect(periodFromParams({ periode: "trimestre", ref: "2026-02-30" })).toBe("month");
    expect(periodFromParams({ periode: "jour", ref: "hier" })).toBe("day");
    expect(periodFromParams({ periode: null }, "tout")).toBe("all");
  });

  it("pas du graphe : jour par semaine, semaine par mois, mois par année et pour « Tout »", () => {
    expect(SERIES_BUCKET).toEqual({ day: "day", week: "day", month: "week", year: "month", all: "month" });
  });
});
