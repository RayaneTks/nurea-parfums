import { describe, expect, it } from "vitest";
import {
  TOP_PERFUMES_PAGE,
  firstRunDone,
  isFirstRun,
  parseJourParam,
  parseStatsParams,
  statsPeriodKey,
  topPerfumesLimit,
} from "../stats";

const NOW = new Date("2026-09-17T08:00:00Z");

describe("paramètres de E07 (06 §1.2)", () => {
  it("défaut : le mois courant, une page", () => {
    expect(parseStatsParams({})).toEqual({ periode: "mois", ref: null, pages: 1 });
    expect(statsPeriodKey(parseStatsParams({}))).toBe("month");
  });

  it("une période et un jour de référence lisibles sont retenus", () => {
    expect(parseStatsParams({ periode: "annee", ref: "2026-01-15", pages: "3" })).toEqual({
      periode: "annee",
      ref: "2026-01-15",
      pages: 3,
    });
    expect(statsPeriodKey({ periode: "annee", ref: "2026-01-15" })).toBe("year@2026-01-15");
  });

  it("une valeur illisible retombe sur le défaut, et `ref` n'a pas de sens pour « Tout »", () => {
    expect(parseStatsParams({ periode: "décennie", ref: "2026-02-30", pages: "zéro" })).toEqual({
      periode: "mois",
      ref: null,
      pages: 1,
    });
    expect(parseStatsParams({ periode: "tout", ref: "2026-01-15" })).toEqual({ periode: "tout", ref: null, pages: 1 });
    expect(statsPeriodKey({ periode: "tout", ref: null })).toBe("all");
  });

  it("« Afficher plus » est borné : ni page 0, ni page négative, ni page infinie", () => {
    expect(parseStatsParams({ pages: "0" }).pages).toBe(1);
    expect(parseStatsParams({ pages: "-4" }).pages).toBe(1);
    expect(parseStatsParams({ pages: "9999" }).pages).toBe(25);
    expect(topPerfumesLimit(1)).toBe(TOP_PERFUMES_PAGE);
    expect(topPerfumesLimit(3)).toBe(3 * TOP_PERFUMES_PAGE);
    expect(topPerfumesLimit(0)).toBe(TOP_PERFUMES_PAGE);
    expect(topPerfumesLimit(9999)).toBe(25 * TOP_PERFUMES_PAGE);
  });
});

describe("paramètre `jour` de E02 (06 E02 zone 1)", () => {
  it("absent ou illisible : aujourd'hui à Paris", () => {
    expect(parseJourParam(undefined, NOW)).toBe("2026-09-17");
    expect(parseJourParam(null, NOW)).toBe("2026-09-17");
    expect(parseJourParam("hier", NOW)).toBe("2026-09-17");
    expect(parseJourParam("2026-02-30", NOW)).toBe("2026-09-17");
  });

  it("un jour de Paris lisible est retenu tel quel", () => {
    expect(parseJourParam("2026-08-31", NOW)).toBe("2026-08-31");
  });
});

describe("vide de première utilisation (06 PC-12, 05 §5.1)", () => {
  it("rien n'existe : l'Accueil oriente au lieu d'afficher des zéros", () => {
    expect(isFirstRun({ pockets: 0, perfumes: 0, documents: 0 })).toBe(true);
    // Des poches créées mais aucun parfum ni document : toujours le vide de départ.
    expect(isFirstRun({ pockets: 2, perfumes: 0, documents: 0 })).toBe(true);
    expect(isFirstRun({ pockets: 0, perfumes: 1, documents: 0 })).toBe(false);
    expect(isFirstRun({ pockets: 0, perfumes: 0, documents: 1 })).toBe(false);
  });

  it("les trois étapes faites : la carte « Pour commencer » disparaît", () => {
    expect(firstRunDone({ pockets: 1, perfumes: 1, documents: 1 })).toBe(true);
    expect(firstRunDone({ pockets: 1, perfumes: 1, documents: 0 })).toBe(false);
    expect(firstRunDone({ pockets: 0, perfumes: 3, documents: 2 })).toBe(false);
  });
});
