import { describe, expect, it } from "vitest";
import { isTestFile, lineOf, listSources, read, stripComments } from "./support/sources";

/**
 * Aucune lecture de la gestion ne s'exporte sans `defineQuery`, donc sans session vérifiée
 * (docs/refonte/04-ARCHITECTURE.md §8.4). Portée : `src/server/<domaine>/queries.ts` et
 * `src/server/chiffres/index.ts`.
 */

const QUERY_FILES = /^src\/server\/([^/]+\/queries|chiffres\/index)\.ts$/;

function queryFileViolations(file: string, source: string): string[] {
  const code = stripComments(source);
  return [...code.matchAll(/^export\b[^\n]*/gm)]
    .filter((match) => !/^export\s+(type|interface)\s/.test(match[0]))
    .filter((match) => !/^export const \w+ = defineQuery\(/.test(match[0]))
    .map((match) => `${file}:${lineOf(code, match.index ?? 0)} : « ${match[0].trim()} » — attendu « export const x = defineQuery( »`);
}

describe("lectures définies (04 §8.4)", () => {
  it("chaque export de queries.ts et de chiffres/index.ts est fabriqué par defineQuery", () => {
    const files = listSources("src/server").filter((file) => QUERY_FILES.test(file) && !isTestFile(file));
    expect(files.flatMap((file) => queryFileViolations(file, read(file)))).toEqual([]);
  });

  it("le contrôle détecte une lecture exportée sans defineQuery", () => {
    const source = [
      'import "server-only";',
      "export const listed = defineQuery(async () => []);",
      "export async function leaked() { return []; }",
      "export type Row = { id: string };",
    ].join("\n");
    expect(queryFileViolations("src/server/x/queries.ts", source)).toHaveLength(1);
  });
});
