/**
 * Harnais des tests du moteur de l'argent (07 J6) : modules serveur des encaissements, de la trésorerie, des
 * réglages et des dépenses chargés contre la base de test, jeux de données (poches, documents payés), lectures
 * de contrôle (soldes, vue `DocumentBalance`), injection d'erreur ciblée et invariants de 03 §5.7.
 *
 * Même contrat que `harness.ts` : chaque fichier de test déclare lui-même, au niveau du module,
 * `vi.mock("server-only")`, `vi.mock("next/cache")` et `vi.mock("next/headers")`.
 */
import { expect } from "vitest";
import type { CreateDocumentInput } from "@/contracts/documents";
import { checkInvariants } from "../../../../scripts/check-invariants";
import { expectOk, loadServer, newId, seedPerfume, type Server } from "./harness";

export type MoneyServer = Server & {
  documentsWriter: typeof import("@/server/documents/writer");
  payments: typeof import("@/server/payments/actions");
  paymentsWriter: typeof import("@/server/payments/writer");
  treasury: typeof import("@/server/treasury/actions");
  treasuryWriter: typeof import("@/server/treasury/writer");
  treasuryQueries: typeof import("@/server/treasury/queries");
  settings: typeof import("@/server/settings/actions");
  settingsQueries: typeof import("@/server/settings/queries");
  batchesWriter: typeof import("@/server/batches/writer");
};

export async function loadMoneyServer(): Promise<MoneyServer> {
  const server = await loadServer();
  return {
    ...server,
    payments: await import("@/server/payments/actions"),
    paymentsWriter: await import("@/server/payments/writer"),
    treasury: await import("@/server/treasury/actions"),
    treasuryWriter: await import("@/server/treasury/writer"),
    treasuryQueries: await import("@/server/treasury/queries"),
    settings: await import("@/server/settings/actions"),
    settingsQueries: await import("@/server/settings/queries"),
    batchesWriter: await import("@/server/batches/writer"),
  };
}

type Prisma = Server["prisma"];

// ── Jeux de données ────────────────────────────────────────────────────────────

export function seedPocket(
  prisma: Prisma,
  data: { name: string; kind?: "CASH" | "BANK" | "SUPPLIER" | "OTHER"; openingBalance?: string; archived?: boolean },
) {
  return prisma.pocket.create({
    data: {
      name: data.name,
      kind: data.kind ?? "CASH",
      openingBalance: data.openingBalance ?? "0",
      archived: data.archived ?? false,
    },
  });
}

/** La poche « Non attribué », comme la reprise la laisse (ou créée si la base est neuve). */
export async function seedSystemPocket(prisma: Prisma, openingBalance = "0") {
  return (
    (await prisma.pocket.findFirst({ where: { isSystem: true } })) ??
    prisma.pocket.create({
      data: { id: "poche-non-attribue", name: "Non attribué", kind: "UNASSIGNED", isSystem: true, sortOrder: 999, openingBalance },
    })
  );
}

type LineInput = CreateDocumentInput["lines"][number];

export const catalogueLine = (perfumeId: number, overrides: Partial<LineInput> = {}): LineInput => ({
  item: { kind: "catalogue", perfumeId },
  volumeMl: 50,
  quantity: 1,
  unitPriceEur: "120",
  ...overrides,
});

/**
 * Un document créé par l'action (T1). `payments` : montants reçus à la création, dans `pocketId`.
 * Rend l'identifiant.
 */
export async function createDocument(
  server: Server,
  options: {
    origin?: "ORDER" | "DIRECT_SALE";
    lines?: LineInput[];
    perfumeId?: number;
    received?: { amount: string; pocketId: string | null }[];
    customer?: CreateDocumentInput["customer"];
    confirm?: boolean;
  } = {},
): Promise<string> {
  const id = newId();
  const perfumeId = options.perfumeId ?? (await seedPerfume(server.prisma, { name: `Parfum ${id.slice(0, 8)}` })).id;
  expectOk(
    await server.documents.createDocumentAction({
      id,
      origin: options.origin ?? "ORDER",
      customer: options.customer ?? { kind: "passing", name: "Fares" },
      lines: options.lines ?? [catalogueLine(perfumeId)],
      payments: (options.received ?? []).map((payment) => ({ id: newId(), ...payment })),
      confirm: options.confirm ?? true,
    }),
  );
  return id;
}

// ── Lectures de contrôle ───────────────────────────────────────────────────────

/** Solde d'une poche, calculé en SQL (03 §5.5). */
export async function balanceOf(prisma: Prisma, pocketId: string): Promise<string> {
  const [row] = await prisma.$queryRawUnsafe<{ balance: string }[]>(
    `SELECT (p."openingBalance" + COALESCE(SUM(m.amount), 0))::numeric(12,2)::text AS balance
     FROM "Pocket" p LEFT JOIN "CashMovement" m ON m."pocketId" = p.id
     WHERE p.id = $1 GROUP BY p.id`,
    pocketId,
  );
  return row?.balance ?? "absente";
}

/** Total, payé, dû d'un document lus dans la vue `DocumentBalance` (03 §5.1). */
export async function viewBalance(prisma: Prisma, documentId: string) {
  const [row] = await prisma.$queryRawUnsafe<{ status: string; total: string; paid: string; due: string }[]>(
    `SELECT status::text AS status, total::text AS total, paid::text AS paid, due::text AS due
     FROM "DocumentBalance" WHERE "documentId" = $1`,
    documentId,
  );
  return row;
}

/** Paiements d'un document avec leur mouvement, dans l'ordre d'écriture. */
export function paymentsOf(prisma: Prisma, documentId: string) {
  return prisma.payment.findMany({
    where: { documentId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { movement: true },
  });
}

export async function moneyCounts(prisma: Prisma) {
  return {
    payments: await prisma.payment.count(),
    movements: await prisma.cashMovement.count(),
    expenses: await prisma.batchExpense.count(),
    pockets: await prisma.pocket.count(),
  };
}

export async function defaultPocketId(prisma: Prisma): Promise<string | null> {
  return (await prisma.setting.findUnique({ where: { id: 1 } }))?.defaultPocketId ?? null;
}

// ── Invariants ─────────────────────────────────────────────────────────────────

/**
 * Les requêtes de 03 §5.7 (celles de `npm run check:invariants`), plus la règle de service « Non attribué »
 * jamais négatif (03 §4.9).
 */
export async function expectInvariants(prisma: Prisma): Promise<void> {
  const results = await checkInvariants(prisma);
  expect(results.filter((result) => !result.ok)).toEqual([]);
  const system = await prisma.pocket.findFirst({ where: { isSystem: true } });
  if (system) expect((await balanceOf(prisma, system.id)).startsWith("-"), "« Non attribué » négatif").toBe(false);
}

// ── Injection d'erreur ciblée ──────────────────────────────────────────────────

const WRITE_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
]);

export const INJECTED_ON = "échec injecté après l'écriture ciblée";

/**
 * Le `tx` d'une transaction dont l'écriture `modèle.opération` ciblée (« saleDocument.update ») aboutit en
 * base puis lève : tout ce que la transaction a écrit, avant comme pendant, doit disparaître au ROLLBACK.
 * `written` liste les écritures passées, dans l'ordre.
 */
export function failingOn<T extends { db: object }>(tx: T, target: string): T & { written: string[] } {
  const written: string[] = [];
  const db = new Proxy(tx.db, {
    get(root, property) {
      const delegate = Reflect.get(root, property);
      if (typeof property !== "string" || property.startsWith("$") || delegate === null || typeof delegate !== "object") {
        return typeof delegate === "function" ? delegate.bind(root) : delegate;
      }
      return new Proxy(delegate, {
        get(model, operation) {
          const method = Reflect.get(model, operation);
          if (typeof operation !== "string" || typeof method !== "function") return method;
          if (!WRITE_OPERATIONS.has(operation)) return method.bind(model);
          return async (...args: unknown[]) => {
            const result = await (method as (...a: unknown[]) => Promise<unknown>).apply(model, args);
            written.push(`${property}.${operation}`);
            if (`${property}.${operation}` === target) throw new Error(`${INJECTED_ON} (${written.join(", ")})`);
            return result;
          };
        },
      });
    },
  });
  return Object.assign({}, tx, { db, written });
}
