import { describe, expect, it } from "vitest";
import {
  exists,
  importsOf,
  isTestFile,
  lineOf,
  listSources,
  read,
  resolveImport,
  stripCommentsAndLiterals,
} from "./support/sources";

/**
 * Une table, un point d'écriture (docs/refonte/04-ARCHITECTURE.md §4.3, 03 §4.2). Portée : le code
 * applicatif (`src/`, `app/`) ; les migrations et scripts de reprise écrivent en SQL par construction.
 */

const OWNERS: Record<string, readonly string[]> = {
  saleDocument: ["src/server/documents/writer.ts"],
  saleLine: ["src/server/documents/writer.ts"],
  payment: ["src/server/payments/writer.ts"],
  cashMovement: ["src/server/treasury/movements.ts"],
  pocket: ["src/server/treasury/writer.ts"],
  batch: ["src/server/batches/writer.ts"],
  batchExpense: ["src/server/batches/writer.ts"],
  brand: ["src/server/catalogue/writer.ts"],
  perfume: ["src/server/catalogue/writer.ts", "src/server/catalogue/stock.ts"],
  perfumePricing: ["src/server/catalogue/writer.ts"],
  perfumeMedia: ["src/server/catalogue/media.ts"],
  customer: ["src/server/customers/writer.ts"],
  setting: ["src/server/settings/writer.ts"],
  adminUser: ["src/server/auth/writer.ts"],
};

/**
 * Écritures héritées tolérées jusqu'au jalon qui les déplace — jamais au-delà (07 §3.0.3).
 * (J11 : `src/lib/admin/resoudMarque.ts` est devenu `src/server/catalogue/resoudMarque.ts`, en lecture
 * seule ; la marque est créée par le writer catalogue.)
 */
const PENDING: { file: string; model: string; until: string }[] = [];

const WRITE = /\.\s*(\w+)\s*\.\s*(create|createMany|createManyAndReturn|update|updateMany|updateManyAndReturn|upsert|delete|deleteMany)\s*\(/g;

/** Fichiers qui détiennent le droit d'écrire : ils ne reçoivent que `tx`, jamais le client global. */
const WRITER_FILE =
  /^src\/server\/[^/]+\/writer\.ts$|^src\/server\/treasury\/movements\.ts$|^src\/server\/catalogue\/(stock|media)\.ts$/;

const SOURCES = listSources("app", "src", "proxy.ts", "instrumentation.ts").filter((file) => !isTestFile(file));

function ownershipViolations(file: string, source: string): string[] {
  const code = stripCommentsAndLiterals(source);
  const found: string[] = [];
  for (const match of code.matchAll(WRITE)) {
    const model = match[1] as string;
    const owners = OWNERS[model];
    if (!owners || owners.includes(file)) continue;
    if (PENDING.some((pending) => pending.file === file && pending.model === model)) continue;
    found.push(`${file}:${lineOf(code, match.index ?? 0)} écrit ${model} (propriétaire : ${owners.join(", ")})`);
  }
  if (/\$executeRaw(Unsafe)?\b/.test(code)) found.push(`${file} : $executeRaw interdit dans le code applicatif`);
  if (/\$transaction\b/.test(code) && file !== "src/server/db/transaction.ts") {
    found.push(`${file} : $transaction hors de src/server/db/transaction.ts (passe par inTransaction)`);
  }
  if (WRITER_FILE.test(file)) {
    for (const ref of importsOf(source)) {
      const target = resolveImport(file, ref.specifier);
      if (ref.typeOnly) continue;
      if (/^(src\/lib\/db\/prisma|src\/server\/db\/client)$/.test(target) || /^next(\/|$)/.test(target)) {
        found.push(`${file} importe « ${ref.specifier} » : un writer ne reçoit que tx`);
      }
      if (/^src\/server\/[^/]+\/(queries|actions)$/.test(target)) {
        found.push(`${file} importe « ${ref.specifier} » : un writer ne dépend ni des lectures ni des actions`);
      }
    }
  }
  return found;
}

describe("propriété des tables (04 §4.3)", () => {
  it("chaque modèle n'est écrit que par son fichier propriétaire ; ni $executeRaw ni $transaction ailleurs", () => {
    expect(SOURCES.flatMap((file) => ownershipViolations(file, read(file)))).toEqual([]);
  });

  it("le writer catalogue n'écrit jamais le stock (04 §11 : src/server/catalogue/stock.ts seul)", () => {
    const file = "src/server/catalogue/writer.ts";
    const writesStock = exists(file) && /\bstock\s*:/.test(stripCommentsAndLiterals(read(file)));
    expect(writesStock).toBe(false);
  });

  it("les exceptions héritées portent sur des fichiers qui existent encore", () => {
    expect(PENDING.filter((pending) => !exists(pending.file))).toEqual([]);
  });

  it("le contrôle détecte une écriture hors propriétaire, un $executeRaw et un client global dans un writer", () => {
    const outside = 'await prisma.payment.create({ data });\nawait db.$executeRaw`DELETE FROM "Payment"`;';
    expect(ownershipViolations("src/server/documents/writer.ts", outside)).toHaveLength(2);
    const writer = 'import "server-only";\nimport { prisma } from "@/lib/db/prisma";';
    expect(ownershipViolations("src/server/payments/writer.ts", writer)).toHaveLength(1);
  });
});
