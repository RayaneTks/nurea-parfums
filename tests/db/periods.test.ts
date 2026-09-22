import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { periodEnd, periodStart, type PeriodUnit } from "@/domain/periods";
import { connectTestDatabase, type TestDatabase } from "./support/database";

/**
 * `nurea_period_start/end` (SQL, 03 §5.1) = `periodStart/periodEnd` (`src/domain/periods.ts`), autour
 * des changements d'heure de 2026 (29 mars, 25 octobre) et des bornes de semaine, mois et année
 * (04 §6.5). Le fuseau de session PostgreSQL ne doit rien changer (04 §4.5).
 */

let db: TestDatabase;

beforeAll(async () => {
  db = await connectTestDatabase();
});

afterAll(async () => {
  await db?.$disconnect();
});

const UNITS: PeriodUnit[] = ["day", "week", "month", "year"];

/** Instants choisis là où une implémentation naïve se trompe. */
const INSTANTS = [
  // Passage à l'heure d'été : 29 mars 2026, 02:00 → 03:00 à Paris (01:00 UTC).
  "2026-03-28T22:59:59.999Z",
  "2026-03-28T23:00:00.000Z",
  "2026-03-29T00:30:00.000Z",
  "2026-03-29T00:59:59.999Z",
  "2026-03-29T01:00:00.000Z",
  "2026-03-29T21:59:59.999Z",
  "2026-03-29T22:00:00.000Z",
  "2026-03-31T21:59:59.999Z",
  "2026-03-31T22:00:00.000Z",
  // Passage à l'heure d'hiver : 25 octobre 2026, 03:00 → 02:00 à Paris (01:00 UTC).
  "2026-10-24T21:59:59.999Z",
  "2026-10-24T22:00:00.000Z",
  "2026-10-25T00:30:00.000Z",
  "2026-10-25T01:00:00.000Z",
  "2026-10-25T01:30:00.000Z",
  "2026-10-25T22:59:59.999Z",
  "2026-10-25T23:00:00.000Z",
  "2026-10-31T22:59:59.999Z",
  "2026-10-31T23:00:00.000Z",
  // Semaine commençant le lundi, fin d'année, année bissextile.
  "2026-09-13T21:59:59.999Z",
  "2026-09-13T22:00:00.000Z",
  "2026-09-17T08:00:00.000Z",
  "2026-12-31T22:59:59.999Z",
  "2026-12-31T23:00:00.000Z",
  "2028-02-29T12:00:00.000Z",
  "2025-12-28T23:30:00.000Z",
];

const SESSION_TIME_ZONES = ["UTC", "Europe/Paris", "America/Los_Angeles", "Asia/Tokyo"];

describe("fonctions de période SQL = src/domain/periods.ts (04 §6.5)", () => {
  for (const zone of SESSION_TIME_ZONES) {
    it(`bornes identiques pour chaque unité, session en ${zone}`, async () => {
      const mismatches = await db.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL TIME ZONE '${zone}'`);
        const found: string[] = [];
        for (const iso of INSTANTS) {
          const ref = new Date(iso);
          for (const unit of UNITS) {
            const [row] = await tx.$queryRaw<{ start: Date; end: Date }[]>`
              SELECT nurea_period_start(${unit}, ${ref}::timestamptz) AS start,
                     nurea_period_end(${unit}, ${ref}::timestamptz)   AS "end"`;
            const expected = { start: periodStart(unit, ref).toISOString(), end: periodEnd(unit, ref).toISOString() };
            const actual = { start: row?.start.toISOString(), end: row?.end.toISOString() };
            if (actual.start !== expected.start || actual.end !== expected.end) {
              found.push(`${unit} @ ${iso} : SQL ${actual.start} → ${actual.end}, TS ${expected.start} → ${expected.end}`);
            }
          }
        }
        return found;
      });
      expect(mismatches).toEqual([]);
    });
  }

  it("les journées de changement d'heure durent 23 h et 25 h, des deux côtés", async () => {
    const [row] = await db.$queryRaw<{ spring: number; autumn: number }[]>`
      SELECT EXTRACT(EPOCH FROM nurea_period_end('day', '2026-03-29T10:00:00Z') - nurea_period_start('day', '2026-03-29T10:00:00Z')) / 3600 AS spring,
             EXTRACT(EPOCH FROM nurea_period_end('day', '2026-10-25T10:00:00Z') - nurea_period_start('day', '2026-10-25T10:00:00Z')) / 3600 AS autumn`;
    expect(Number(row?.spring)).toBe(23);
    expect(Number(row?.autumn)).toBe(25);
    const hours = (iso: string) =>
      (periodEnd("day", new Date(iso)).getTime() - periodStart("day", new Date(iso)).getTime()) / 3_600_000;
    expect(hours("2026-03-29T10:00:00Z")).toBe(23);
    expect(hours("2026-10-25T10:00:00Z")).toBe(25);
  });
});
