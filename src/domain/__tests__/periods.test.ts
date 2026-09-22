import { describe, expect, it } from "vitest";
import {
  parisDayKey,
  parisDaysBetween,
  parseParisDayKey,
  periodBounds,
  periodEnd,
  periodLabel,
  periodStart,
} from "../periods";

const at = (iso: string) => new Date(iso);
const iso = (d: Date) => d.toISOString();

/*
 * Attendus écrits en UTC, calculés à la main : Paris est à UTC+1 en hiver, UTC+2 en été.
 * 29 mars 2026 : 02:00 → 03:00 (journée de 23 h). 25 octobre 2026 : 03:00 → 02:00 (25 h).
 * `tests/db/periods.test.ts` confronte les mêmes instants à nurea_period_start/end.
 */
describe("periods — passage à l'heure d'été, dimanche 29 mars 2026", () => {
  const ref = at("2026-03-29T12:00:00Z"); // 14:00 à Paris

  it("la journée va de 00:00 UTC+1 à 00:00 UTC+2 : 23 heures", () => {
    const start = periodStart("day", ref);
    const end = periodEnd("day", ref);
    expect(iso(start)).toBe("2026-03-28T23:00:00.000Z");
    expect(iso(end)).toBe("2026-03-29T22:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(23 * 3_600_000);
  });

  it("la semaine commence le lundi 23 mars et finit le lundi 30 mars", () => {
    expect(iso(periodStart("week", ref))).toBe("2026-03-22T23:00:00.000Z");
    expect(iso(periodEnd("week", ref))).toBe("2026-03-29T22:00:00.000Z");
  });

  it("le mois de mars et l'année 2026", () => {
    expect(iso(periodStart("month", ref))).toBe("2026-02-28T23:00:00.000Z");
    expect(iso(periodEnd("month", ref))).toBe("2026-03-31T22:00:00.000Z");
    expect(iso(periodStart("year", ref))).toBe("2025-12-31T23:00:00.000Z");
    expect(iso(periodEnd("year", ref))).toBe("2026-12-31T23:00:00.000Z");
  });

  it("autour du saut : 01:59 UTC+1 et 03:00 UTC+2 sont le même jour", () => {
    expect(parisDayKey(at("2026-03-29T00:59:00Z"))).toBe("2026-03-29");
    expect(parisDayKey(at("2026-03-29T01:00:00Z"))).toBe("2026-03-29");
    expect(parisDayKey(at("2026-03-28T22:59:59Z"))).toBe("2026-03-28");
  });
});

describe("periods — retour à l'heure d'hiver, dimanche 25 octobre 2026", () => {
  const ref = at("2026-10-25T12:00:00Z"); // 13:00 à Paris

  it("la journée va de 00:00 UTC+2 à 00:00 UTC+1 : 25 heures", () => {
    const start = periodStart("day", ref);
    const end = periodEnd("day", ref);
    expect(iso(start)).toBe("2026-10-24T22:00:00.000Z");
    expect(iso(end)).toBe("2026-10-25T23:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(25 * 3_600_000);
  });

  it("la semaine du lundi 19 au lundi 26 octobre", () => {
    expect(iso(periodStart("week", ref))).toBe("2026-10-18T22:00:00.000Z");
    expect(iso(periodEnd("week", ref))).toBe("2026-10-25T23:00:00.000Z");
  });

  it("le mois d'octobre commence en été et finit en hiver", () => {
    expect(iso(periodStart("month", ref))).toBe("2026-09-30T22:00:00.000Z");
    expect(iso(periodEnd("month", ref))).toBe("2026-10-31T23:00:00.000Z");
  });

  it("l'heure répétée (02:30 deux fois) reste le 25", () => {
    expect(parisDayKey(at("2026-10-25T00:30:00Z"))).toBe("2026-10-25"); // 02:30 UTC+2
    expect(parisDayKey(at("2026-10-25T01:30:00Z"))).toBe("2026-10-25"); // 02:30 UTC+1
    expect(parisDayKey(at("2026-10-25T22:59:59Z"))).toBe("2026-10-25");
    expect(parisDayKey(at("2026-10-25T23:00:00Z"))).toBe("2026-10-26");
  });
});

describe("periods — la semaine commence le lundi", () => {
  it("un lundi est son propre début de semaine, un dimanche appartient à la semaine du lundi précédent", () => {
    const lundi = at("2026-09-14T10:00:00Z");
    const dimanche = at("2026-09-20T21:59:00Z"); // 23:59 Paris
    const lundiSuivant = at("2026-09-20T22:00:00Z"); // 00:00 Paris le 21
    expect(iso(periodStart("week", lundi))).toBe("2026-09-13T22:00:00.000Z");
    expect(iso(periodStart("week", dimanche))).toBe("2026-09-13T22:00:00.000Z");
    expect(iso(periodStart("week", lundiSuivant))).toBe("2026-09-20T22:00:00.000Z");
  });

  it("une semaine à cheval sur deux années commence le lundi 28 décembre", () => {
    expect(parisDayKey(periodStart("week", at("2027-01-01T12:00:00Z")))).toBe("2026-12-28");
  });
});

describe("periods — décalage, clés et libellés", () => {
  const ref = at("2026-09-17T10:00:00Z");

  it("offset -1 = période précédente, calendaire (le mois de mars traverse le passage à l'heure d'été)", () => {
    const b = periodBounds("month", at("2026-04-10T10:00:00Z"), -1);
    expect(iso(b.from)).toBe("2026-02-28T23:00:00.000Z");
    expect(iso(b.to)).toBe("2026-03-31T22:00:00.000Z");
    expect(periodBounds("day", ref, 0)).toEqual({ from: periodStart("day", ref), to: periodEnd("day", ref) });
  });

  it("clé du jour et son inverse", () => {
    expect(parisDayKey(ref)).toBe("2026-09-17");
    expect(iso(parseParisDayKey("2026-03-29")!)).toBe("2026-03-28T23:00:00.000Z");
    expect(iso(parseParisDayKey("2026-10-26")!)).toBe("2026-10-25T23:00:00.000Z");
    expect(parseParisDayKey("2026-02-30")).toBeNull();
    expect(parseParisDayKey("17/09/2026")).toBeNull();
  });

  it("jours calendaires entre deux instants, à travers un changement d'heure", () => {
    expect(parisDaysBetween(at("2026-03-28T22:59:00Z"), at("2026-03-28T23:01:00Z"))).toBe(1);
    expect(parisDaysBetween(at("2026-10-24T10:00:00Z"), at("2026-10-26T10:00:00Z"))).toBe(2);
    expect(parisDaysBetween(at("2026-09-17T10:00:00Z"), at("2026-09-17T20:00:00Z"))).toBe(0);
  });

  it("libellés français", () => {
    expect(periodLabel("day", ref)).toBe("jeudi 17 septembre 2026");
    expect(periodLabel("day", ref, { withYear: false })).toBe("jeudi 17 septembre");
    expect(periodLabel("week", ref)).toBe("semaine du 14 septembre 2026");
    expect(periodLabel("month", ref)).toBe("septembre 2026");
    expect(periodLabel("month", ref, { withYear: false })).toBe("septembre");
    expect(periodLabel("year", ref)).toBe("2026");
  });
});
