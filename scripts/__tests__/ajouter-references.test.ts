import { describe, expect, it } from "vitest";
import { decrire, parseArgs, planifier, type MarqueEnBase, type ParfumEnBase } from "../catalogue/ajouter-references";

/**
 * Fonctions pures du script « références du fournisseur ». Le script n'est jamais exécuté ici : il ne
 * s'exécute que lancé par son chemin. L'enjeu : ne jamais compter pour nouvelle une fiche qui existe déjà
 * (écart de casse, d'accent ou de ponctuation), ne rien compter deux fois, et que l'écriture exige le
 * chiffre de l'essai à blanc.
 */

const MARQUES: MarqueEnBase[] = [
  { id: "b-lattafa", name: "Lattafa" },
  { id: "b-dior", name: "Dior" },
];
const PARFUMS: ParfumEnBase[] = [
  { brandId: "b-lattafa", name: "Asad" },
  { brandId: "b-dior", name: "Sauvage" },
];

describe("parseArgs", () => {
  it("n'écrit pas par défaut", () => {
    expect(parseArgs([])).toEqual({ apply: false, journal: "migration-artifacts/references-fournisseur-journal.json" });
  });

  it("lit --apply, --attendu, l'hôte, le journal et l'annulation", () => {
    expect(parseArgs(["--apply", "--attendu", "234", "--confirm-host", "db.x", "--journal", "j.json", "--annuler", "a.json"])).toEqual({
      apply: true,
      attendu: 234,
      confirmHost: "db.x",
      journal: "j.json",
      annuler: "a.json",
    });
  });
});

describe("planifier", () => {
  it("saute ce qui existe déjà, aux accents, à la casse et à la ponctuation près", () => {
    const plan = planifier(
      [
        { brand: "LATTAFA", name: "asad" },
        { brand: "Dior", name: "Sauvage" },
      ],
      MARQUES,
      PARFUMS,
    );
    expect(plan.dejaPresentes).toHaveLength(2);
    expect(plan.aInserer).toEqual([]);
  });

  it("ajoute une fiche à une marque existante, sans créer de marque", () => {
    const plan = planifier([{ brand: "Lattafa", name: "Khamrah" }], MARQUES, PARFUMS);
    expect(plan.aInserer).toEqual([{ brand: "Lattafa", brandId: "b-lattafa", name: "Khamrah" }]);
    expect(plan.marquesACreer).toEqual([]);
  });

  it("crée une marque absente une seule fois, même pour plusieurs fiches", () => {
    const plan = planifier(
      [
        { brand: "Rasasi", name: "Hawas" },
        { brand: "rasasi", name: "La Yuqawam" },
      ],
      MARQUES,
      PARFUMS,
    );
    expect(plan.marquesACreer).toHaveLength(1);
    expect(plan.aInserer.map((i) => i.brandId)).toEqual([null, null]);
  });

  it("ne compte pas deux fois un doublon du fichier", () => {
    const plan = planifier(
      [
        { brand: "Lattafa", name: "Khamrah" },
        { brand: "LATTAFA", name: "KHAMRAH" },
      ],
      MARQUES,
      PARFUMS,
    );
    expect(plan.aInserer).toHaveLength(1);
  });

  it("signale une ressemblance sans bloquer", () => {
    const plan = planifier([{ brand: "Lattafa", name: "Asad Bourbon" }], MARQUES, PARFUMS);
    expect(plan.aInserer).toHaveLength(1);
    expect(plan.proches.join("\n")).toMatch(/Asad Bourbon.*Asad/);
  });

  it("décrit le plan avec les chiffres exacts", () => {
    const plan = planifier([{ brand: "Rasasi", name: "Hawas" }], MARQUES, PARFUMS);
    const texte = decrire(plan);
    expect(texte).toContain("Fiches à ajouter : 1");
    expect(texte).toContain("Marques à créer : 1 (Rasasi)");
  });
});
