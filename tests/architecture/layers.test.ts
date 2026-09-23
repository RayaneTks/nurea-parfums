import { describe, expect, it } from "vitest";
import { importsOf, isTestFile, listSources, read, resolveImport, stripComments } from "./support/sources";

/**
 * Règles d'import entre couches (docs/refonte/04-ARCHITECTURE.md §1.3), dont les registres vitrine
 * et gestion disjoints (CLAUDE.md). Une cible d'import est comparée sous sa forme résolue :
 * `src/server/db/client`, `next/navigation`, `@prisma/client`…
 */

type Rule = {
  /** Couche concernée, telle que la nomme 04 §1.3. */
  layer: string;
  files: RegExp;
  forbidden: RegExp;
  /** Import de type seul toléré (il disparaît à la compilation). */
  allowTypeOnly?: boolean;
  why: string;
};

const WRITERS = /^src\/server\/[^/]+\/(writer|movements|stock)$/;

const RULES: Rule[] = [
  {
    layer: "src/domain",
    files: /^src\/domain\//,
    // Pur : rien hors du domaine, sauf la bibliothèque décimale (money-imports en borne l'usage).
    forbidden: /^(?!src\/domain(\/|$)|decimal\.js-light$)/,
    why: "le domaine est pur : ni Next, ni React, ni Prisma, ni autre couche (04 §1.3)",
  },
  {
    layer: "src/contracts",
    files: /^src\/contracts\//,
    forbidden: /^(?!src\/contracts(\/|$)|src\/domain(\/|$)|zod$)/,
    why: "un contrat n'importe que le domaine et zod (04 §1.3)",
  },
  {
    layer: "src/server (db, core, cache, auth)",
    files: /^src\/server\/(db|core|cache|auth)\//,
    forbidden: /^src\/(features|ui|app-shell|components)(\/|$)/,
    why: "le socle serveur ne dépend d'aucun écran (04 §1.3)",
  },
  {
    layer: "queries et chiffres",
    files: /^src\/server\/([^/]+\/queries\.ts$|chiffres\/)/,
    forbidden: /^src\/server\/[^/]+\/(writer|movements|stock|actions)$/,
    why: "une lecture n'écrit jamais : ni writer ni action (04 §7.1)",
  },
  {
    layer: "features — pages et blocs (RSC)",
    files: /^src\/features\/[^/]+\/(pages|blocks)\//,
    forbidden: new RegExp(`${WRITERS.source}|^src\\/server\\/db(\\/|$)`),
    why: "un écran lit par les queries, jamais par un writer ni le client base (04 §1.3)",
  },
  {
    layer: "features — composants clients",
    files: /^src\/features\/[^/]+\/components\//,
    forbidden: /^src\/server\/(?![^/]+\/actions$)/,
    allowTypeOnly: true,
    why: "un composant client n'appelle que des fonctions d'action (04 §1.3)",
  },
  {
    layer: "src/ui",
    files: /^src\/ui\//,
    forbidden: /^src\/(features|server|app-shell)(\/|$)/,
    why: "les briques d'interface ignorent les écrans, le serveur et le shell (04 §1.3)",
  },
  {
    layer: "src/app-shell",
    files: /^src\/app-shell\//,
    forbidden: /^src\/(features(\/|$)|server\/(?!auth\/actions$))/,
    allowTypeOnly: true,
    why: "le shell n'importe ni les écrans ni le serveur, hors actions d'authentification (04 §1.3)",
  },
  {
    layer: "vitrine",
    // `src/lib/db`, `src/lib/pwa` et `src/lib/security` sont communs aux deux registres : le frein
    // de débit sert la recherche de la vitrine ET la connexion de la gestion, et ne dépend de rien.
    files: /^(app\/\(shop\)\/|app\/(layout|not-found|robots|sitemap)\.tsx?$|app\/api\/(perfume-search|pwa\/shop)\/|src\/components\/|src\/actions\/|src\/hooks\/|src\/lib\/(?!db\/|pwa\/|security\/))/,
    forbidden: /^src\/(server|features|ui|app-shell|contracts)(\/|$)/,
    why: "registres disjoints : la vitrine n'importe rien de la gestion (CLAUDE.md, 04 §1.3)",
  },
];

function violations(files: string[], rule: Rule): string[] {
  const found: string[] = [];
  for (const file of files) {
    if (!rule.files.test(file) || isTestFile(file)) continue;
    for (const ref of importsOf(read(file))) {
      if (rule.allowTypeOnly && ref.typeOnly) continue;
      const target = resolveImport(file, ref.specifier);
      if (rule.forbidden.test(target)) found.push(`${file} importe « ${ref.specifier} »`);
    }
  }
  return found;
}

const SOURCES = listSources("app", "src");

describe("couches (04 §1.3)", () => {
  for (const rule of RULES) {
    it(`${rule.layer} : ${rule.why}`, () => {
      expect(violations(SOURCES, rule)).toEqual([]);
    });
  }

  it("chaque fichier de src/server commence par import \"server-only\" (après \"use server\" pour une action)", () => {
    const missing = SOURCES.filter((file) => file.startsWith("src/server/") && !isTestFile(file)).filter((file) => {
      const statements = stripComments(read(file))
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const first = statements[0] === '"use server";' ? statements[1] : statements[0];
      return first !== 'import "server-only";';
    });
    expect(missing).toEqual([]);
  });
});
