import { describe, expect, it } from "vitest";
import { parsePeriod } from "../chiffres";
import {
  comptaPeriodKey,
  exportComptaUrl,
  exportFileName,
  exportRangeOf,
  figurePeriodLabel,
  journalNavigation,
  parseComptaParams,
  parseExportParams,
  parseJournalMonth,
  periodNavigation,
  seriesTitle,
} from "../compta";

/** Jeudi 17 septembre 2026, 10 h à Paris. */
const NOW = new Date("2026-09-17T08:00:00Z");

describe("paramètres de la Compta (06 E03, §1.2)", () => {
  it("lit vue, période, jour de référence, recherche et filtre ; retombe sur Ventes · Mois sinon", () => {
    expect(parseComptaParams({})).toEqual({ vue: "ventes", periode: "mois", ref: null, q: "", filtre: null });
    expect(parseComptaParams({ vue: "tresorerie", periode: "annee", ref: "2025-03-02", q: "  dior ", filtre: "cout-a-completer" })).toEqual({
      vue: "tresorerie",
      periode: "annee",
      ref: "2025-03-02",
      q: "dior",
      filtre: "cout-a-completer",
    });
    expect(parseComptaParams({ vue: "stats", periode: "trimestre", ref: "2026-02-30", filtre: "retard" })).toEqual({
      vue: "ventes",
      periode: "mois",
      ref: null,
      q: "",
      filtre: null,
    });
  });

  it("« Tout » ignore le jour de référence ; la clé de période est celle des chiffres", () => {
    expect(parseComptaParams({ periode: "tout", ref: "2026-01-01" }).ref).toBeNull();
    expect(comptaPeriodKey({ periode: "mois", ref: null })).toBe("month");
    expect(comptaPeriodKey({ periode: "semaine", ref: "2026-09-02" })).toBe("week@2026-09-02");
    expect(comptaPeriodKey({ periode: "tout", ref: null })).toBe("all");
  });
});

describe("noms de période (06 §1.7)", () => {
  it("date chaque chiffre de flux : aujourd'hui, hier, cette semaine, le mois, l'année, depuis le début", () => {
    expect(figurePeriodLabel("jour", null, NOW)).toBe("aujourd'hui");
    expect(figurePeriodLabel("jour", "2026-09-16", NOW)).toBe("hier");
    expect(figurePeriodLabel("jour", "2026-09-10", NOW)).toBe("jeudi 10 septembre");
    expect(figurePeriodLabel("semaine", null, NOW)).toBe("cette semaine");
    expect(figurePeriodLabel("semaine", "2026-09-08", NOW)).toBe("semaine du 7 septembre");
    expect(figurePeriodLabel("mois", null, NOW)).toBe("septembre");
    expect(figurePeriodLabel("mois", "2026-08-31", NOW)).toBe("août");
    expect(figurePeriodLabel("annee", null, NOW)).toBe("2026");
    expect(figurePeriodLabel("tout", null, NOW)).toBe("depuis le début");
  });

  it("ajoute l'année hors de l'année en cours", () => {
    expect(figurePeriodLabel("mois", "2025-12-05", NOW)).toBe("décembre 2025");
    expect(figurePeriodLabel("semaine", "2025-12-30", NOW)).toBe("semaine du 29 décembre 2025");
  });

  it("titre du graphe selon la période ; pas de graphe pour un jour", () => {
    expect(seriesTitle("jour")).toBeNull();
    expect(seriesTitle("semaine")).toBe("Encaissé par jour");
    expect(seriesTitle("mois")).toBe("Encaissé par semaine");
    expect(seriesTitle("annee")).toBe("Encaissé par mois");
    expect(seriesTitle("tout")).toBe("Encaissé par mois");
  });
});

describe("navigateur « ‹ septembre 2026 › »", () => {
  it("sur la période courante : précédente datée de son premier jour, pas de suivante", () => {
    expect(periodNavigation("mois", null, NOW)).toEqual({ label: "septembre 2026", previous: { ref: "2026-08-01" }, next: null });
    expect(periodNavigation("tout", null, NOW)).toBeNull();
  });

  it("dans le passé : la suivante redevient l'adresse nue quand elle est la période courante", () => {
    expect(periodNavigation("mois", "2026-08-01", NOW)).toEqual({ label: "août 2026", previous: { ref: "2026-07-01" }, next: { ref: null } });
    expect(periodNavigation("mois", "2026-06-15", NOW)).toEqual({ label: "juin 2026", previous: { ref: "2026-05-01" }, next: { ref: "2026-07-01" } });
    expect(periodNavigation("semaine", "2026-09-08", NOW)).toEqual({
      label: "semaine du 7 septembre 2026",
      previous: { ref: "2026-08-31" },
      next: { ref: null },
    });
    expect(periodNavigation("annee", "2025-04-01", NOW)?.next).toEqual({ ref: null });
  });

  it("changement d'heure : le mois de mars 2026 a 30 jours et 23 h, son export s'arrête au 31", () => {
    expect(exportRangeOf({ periode: "mois", ref: "2026-03-29" }, NOW)).toEqual({ du: "2026-03-01", au: "2026-03-31" });
  });
});

describe("journal (06 E04)", () => {
  it("lit le mois (courant par défaut) et nomme ses voisins", () => {
    expect(parseJournalMonth(null, NOW)).toBe("2026-09");
    expect(parseJournalMonth("2026-13", NOW)).toBe("2026-09");
    expect(parseJournalMonth("2025-12", NOW)).toBe("2025-12");
    expect(journalNavigation("2026-09", NOW)).toEqual({ label: "septembre 2026", figureLabel: "septembre", previous: "2026-08", next: null });
    expect(journalNavigation("2025-12", NOW)).toEqual({ label: "décembre 2025", figureLabel: "décembre 2025", previous: "2025-11", next: "2026-01" });
  });
});

describe("export CSV (04 §3.5, 07 J12)", () => {
  it("la période de l'écran devient des jours de Paris, bornes comprises", () => {
    expect(exportRangeOf({ periode: "mois", ref: null }, NOW)).toEqual({ du: "2026-09-01", au: "2026-09-30" });
    expect(exportRangeOf({ periode: "semaine", ref: null }, NOW)).toEqual({ du: "2026-09-14", au: "2026-09-20" });
    expect(exportRangeOf({ periode: "jour", ref: null }, NOW)).toEqual({ du: "2026-09-17", au: "2026-09-17" });
    expect(exportRangeOf({ periode: "tout", ref: null }, NOW)).toBeNull();
    expect(exportComptaUrl({ du: "2026-09-01", au: "2026-09-30" })).toBe("/api/admin/export/compta?du=2026-09-01&au=2026-09-30");
    expect(exportComptaUrl(null)).toBe("/api/admin/export/compta");
    expect(exportFileName({ du: "2026-09-01", au: "2026-09-30" })).toBe("compta-2026-09-01-au-2026-09-30.csv");
    expect(exportFileName(null)).toBe("compta-depuis-le-debut.csv");
  });

  it("des jours de l'export à la clé de période : [00:00 du premier jour, 00:00 du lendemain du dernier[ à Paris", () => {
    const month = parseExportParams({ du: "2026-09-01", au: "2026-09-30" });
    expect(parsePeriod(month?.periode ?? "")).toEqual({ kind: "range", from: "2026-08-31T22:00:00.000Z", to: "2026-09-30T22:00:00.000Z" });
    // Passage à l'heure d'hiver le 25 octobre : le dernier jour dure 25 h.
    const october = parseExportParams({ du: "2026-10-25", au: "2026-10-25" });
    expect(parsePeriod(october?.periode ?? "")).toEqual({ kind: "range", from: "2026-10-24T22:00:00.000Z", to: "2026-10-25T23:00:00.000Z" });
    expect(parseExportParams({})).toEqual({ periode: "all", range: null });
  });

  it("refuse un seul des deux jours, un jour inexistant, un ordre inversé", () => {
    expect(parseExportParams({ du: "2026-09-01" })).toBeNull();
    expect(parseExportParams({ du: "2026-02-30", au: "2026-03-01" })).toBeNull();
    expect(parseExportParams({ du: "2026-09-30", au: "2026-09-01" })).toBeNull();
    expect(parseExportParams({ du: "01/09/2026", au: "30/09/2026" })).toBeNull();
  });
});
