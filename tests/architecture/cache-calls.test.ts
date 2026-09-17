import { describe, expect, it } from "vitest";
import { isTestFile, lineOf, listSources, read, stripCommentsAndLiterals } from "./support/sources";

/**
 * Cache et invalidation en un seul endroit chacun (docs/refonte/04-ARCHITECTURE.md §7.1, §10) :
 * `unstable_cache` dans `cached.ts`, `updateTag` / `revalidateTag` / `revalidatePath` dans
 * `invalidate.ts`. Une lecture ne peut donc jamais invalider un cache.
 */

type Rule = { name: string; api: RegExp; allowed: ReadonlySet<string> };

const RULES: Rule[] = [
  {
    name: "unstable_cache",
    api: /\bunstable_cache\b/g,
    // Contrat vitrine (04 §12) : le point de lecture du catalogue public reste où il est.
    allowed: new Set(["src/server/cache/cached.ts", "src/lib/catalogue-service.ts"]),
  },
  {
    name: "updateTag / revalidateTag / revalidatePath",
    api: /\b(updateTag|revalidateTag|revalidatePath)\b/g,
    allowed: new Set(["src/server/cache/invalidate.ts"]),
  },
];

const SOURCES = listSources("app", "src", "proxy.ts", "instrumentation.ts").filter((file) => !isTestFile(file));

function violations(rule: Rule, file: string, source: string): string[] {
  if (rule.allowed.has(file)) return [];
  const code = stripCommentsAndLiterals(source);
  return [...code.matchAll(rule.api)].map((match) => `${file}:${lineOf(code, match.index ?? 0)} utilise ${match[0]}`);
}

describe("appels de cache (04 §10)", () => {
  for (const rule of RULES) {
    it(`${rule.name} seulement dans ${[...rule.allowed].join(", ")}`, () => {
      expect(SOURCES.flatMap((file) => violations(rule, file, read(file)))).toEqual([]);
    });
  }

  it("le contrôle détecte une invalidation dans une lecture", () => {
    const source = 'import { revalidateTag } from "next/cache";\nexport const x = defineQuery(async () => { revalidateTag("gestion"); });';
    expect(RULES.flatMap((rule) => violations(rule, "src/server/batches/queries.ts", source))).toHaveLength(2);
  });
});
