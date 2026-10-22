import { describe, expect, it } from "vitest";
import { MIN_SELECTION, SAISONS, moisParis, selectionDuMoment } from "../saison";

const catalogue = (ids: number[]) => ids.map((id) => ({ id }));

describe("selectionDuMoment", () => {
  it("garde l'ordre choisi et ignore les parfums non publiés", () => {
    const saisons = [{ titre: "Froid", motCle: "Froid", mois: [11], ids: [5, 999, 3, 1, 2] }];
    const result = selectionDuMoment(catalogue([1, 2, 3, 4, 5]), 11, saisons);
    expect(result).toEqual({ titre: "Froid", motCle: "Froid", perfumes: [{ id: 5 }, { id: 3 }, { id: 1 }, { id: 2 }] });
  });

  it("se tait hors saison et sous le minimum", () => {
    const saisons = [{ titre: "Froid", motCle: "Froid", mois: [11], ids: [1, 2, 3, 4] }];
    expect(selectionDuMoment(catalogue([1, 2, 3, 4]), 6, saisons)).toBeNull();
    expect(selectionDuMoment(catalogue([1, 2, 3]), 11, saisons)).toBeNull();
    expect(MIN_SELECTION).toBe(4);
  });

  it("lit le mois à l'heure de Paris", () => {
    // 31 octobre 23 h 30 UTC = 1er novembre à Paris.
    expect(moisParis(new Date("2026-10-31T23:30:00Z"))).toBe(11);
  });

  it("le mot mis en valeur figure dans le titre", () => {
    for (const s of SAISONS) expect(s.titre).toContain(s.motCle);
  });

  it("aucun parfum en double, aucun mois couvert deux fois", () => {
    for (const s of SAISONS) expect(new Set(s.ids).size).toBe(s.ids.length);
    const mois = SAISONS.flatMap((s) => s.mois);
    expect(new Set(mois).size).toBe(mois.length);
  });
});
