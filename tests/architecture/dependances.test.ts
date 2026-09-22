import { describe, expect, it } from "vitest";
import { importsOf, listSources, read } from "./support/sources";

/**
 * Dépendances de la refonte (docs/refonte/04-ARCHITECTURE.md §17.4, critère de 07 J16).
 *
 * Quatre paquets sont RETIRÉS : sans importeur à l'audit, ils continuaient d'être installés, mis à
 * jour et audités pour rien. Le test fait les deux moitiés du critère à la fois — aucun importeur
 * dans le code, aucune ligne dans `package.json` — pour qu'un `npm install` distrait ne les ramène
 * pas en silence.
 */

const RETIRES = ["@tanstack/react-query", "nuqs", "class-variance-authority", "motion"] as const;

/** Ajoutés par la refonte, et dont un retrait casserait le socle (04 §17.4). */
const EXIGES = { dependencies: ["server-only", "zod", "decimal.js-light"], devDependencies: ["esbuild"] } as const;

const manifest = JSON.parse(read("package.json")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

describe("dépendances (04 §17.4)", () => {
  it("les quatre paquets retirés ne sont plus déclarés", () => {
    const declares = { ...manifest.dependencies, ...manifest.devDependencies };
    expect(RETIRES.filter((name) => name in declares)).toEqual([]);
  });

  it("aucun fichier du dépôt ne les importe", () => {
    const interdits = new Set<string>(RETIRES);
    const fautifs = listSources("src", "app", "e2e", "tests", "scripts", "prisma").flatMap((file) =>
      importsOf(read(file))
        // `motion/react`, `nuqs/server` : un sous-chemin compte comme le paquet.
        .filter((ref) => interdits.has(ref.specifier) || [...interdits].some((name) => ref.specifier.startsWith(`${name}/`)))
        .map((ref) => `${file} importe « ${ref.specifier} »`),
    );
    expect(fautifs).toEqual([]);
  });

  it("les paquets que la refonte a ajoutés sont bien là", () => {
    expect(EXIGES.dependencies.filter((name) => !(name in manifest.dependencies))).toEqual([]);
    expect(EXIGES.devDependencies.filter((name) => !(name in manifest.devDependencies))).toEqual([]);
  });
});
