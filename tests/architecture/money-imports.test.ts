import { describe, expect, it } from "vitest";
import { importsOf, isTestFile, lineOf, listSources, read, stripCommentsAndLiterals } from "./support/sources";

/**
 * Un seul module monétaire (docs/refonte/04-ARCHITECTURE.md §5.1, §5.3 règle 7) : `decimal.js-light`
 * n'est importé que par `src/domain/money.ts`, `decimal.js` par personne, et `Prisma.Decimal` ne sert
 * qu'à la frontière base, dans `src/server/db/`.
 */

const MONEY_MODULE = "src/domain/money.ts";
const DECIMAL_LIBRARIES = new Set(["decimal.js", "decimal.js-light"]);
const ROOT_FILES = ["proxy.ts", "instrumentation.ts", "next.config.mjs", "vitest.config.ts", "playwright.config.ts"];

function decimalImports(file: string, source: string): string[] {
  if (file === MONEY_MODULE) return [];
  return importsOf(source)
    .filter((ref) => DECIMAL_LIBRARIES.has(ref.specifier))
    .map((ref) => `${file} importe « ${ref.specifier} »`);
}

function prismaDecimalUses(file: string, source: string): string[] {
  if (file.startsWith("src/server/db/")) return [];
  const code = stripCommentsAndLiterals(source);
  return [...code.matchAll(/\bPrisma\s*\.\s*Decimal\b/g)].map(
    (match) => `${file}:${lineOf(code, match.index ?? 0)} utilise Prisma.Decimal`,
  );
}

describe("imports monétaires (04 §5)", () => {
  it("decimal.js-light n'est importé que par src/domain/money.ts, decimal.js par aucun fichier", () => {
    const files = listSources("src", "app", "scripts", "tests", "e2e", ...ROOT_FILES);
    expect(files.flatMap((file) => decimalImports(file, read(file)))).toEqual([]);
  });

  it("Prisma.Decimal n'apparaît que dans src/server/db/", () => {
    const files = listSources("src", "app", "scripts", ...ROOT_FILES).filter((file) => !isTestFile(file));
    expect(files.flatMap((file) => prismaDecimalUses(file, read(file)))).toEqual([]);
  });

  it("le contrôle ignore commentaires et chaînes, et détecte un usage réel", () => {
    const source = [
      '// Prisma.Decimal("1") dans un commentaire',
      'const label = "Prisma.Decimal";',
      `import Decimal from "${"decimal.js"}";`,
      "const x = new Prisma.Decimal(label);",
    ].join("\n");
    expect(prismaDecimalUses("src/server/payments/writer.ts", source)).toEqual([
      "src/server/payments/writer.ts:4 utilise Prisma.Decimal",
    ]);
    expect(decimalImports("src/server/payments/writer.ts", source)).toHaveLength(1);
  });
});
