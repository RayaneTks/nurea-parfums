/**
 * Harnais des tests de transactions (docs/refonte/04-ARCHITECTURE.md §16.3) : modules serveur chargés
 * contre la base de test, session signée, jeux de données minimaux, et un `tx` qui échoue après sa
 * première écriture pour prouver l'atomicité.
 *
 * Chaque fichier de test déclare lui-même, au niveau du module (hissés par Vitest) :
 *   vi.mock("server-only", () => ({}));
 *   vi.mock("next/cache", …);      // updateTag, revalidateTag, revalidatePath, unstable_cache
 *   vi.mock("next/headers", () => ({ cookies: async () => cookieJar.current }));
 */
import { expect } from "vitest";
import type { ActionResult } from "@/contracts/result";
import { resetDatabase } from "../../support/database";
// Renommé : ce n'est pas un hook React, la règle `rules-of-hooks` se fie au préfixe « use ».
import { memoryCookies, useTestDatabaseForServer as pinServerToTestDatabase } from "../../support/server";

export type Server = {
  prisma: typeof import("@/lib/db/prisma").prisma;
  inTransaction: typeof import("@/server/db/transaction").inTransaction;
  documentsWriter: typeof import("@/server/documents/writer");
  documents: typeof import("@/server/documents/actions");
  customers: typeof import("@/server/customers/actions");
  batches: typeof import("@/server/batches/actions");
  stock: typeof import("@/server/catalogue/stock");
  signSessionToken: typeof import("@/server/auth/token").signSessionToken;
};

export async function loadServer(): Promise<Server> {
  await pinServerToTestDatabase();
  return {
    prisma: (await import("@/lib/db/prisma")).prisma,
    inTransaction: (await import("@/server/db/transaction")).inTransaction,
    documentsWriter: await import("@/server/documents/writer"),
    documents: await import("@/server/documents/actions"),
    customers: await import("@/server/customers/actions"),
    batches: await import("@/server/batches/actions"),
    stock: await import("@/server/catalogue/stock"),
    signSessionToken: (await import("@/server/auth/token")).signSessionToken,
  };
}

/** Base vide et session valide : à appeler dans `beforeEach`. */
export async function freshStart(server: Server): Promise<ReturnType<typeof memoryCookies>["store"]> {
  await resetDatabase(server.prisma);
  const cookies = memoryCookies();
  cookies.store.set("nurea_admin", await server.signSessionToken({ userId: "u-test", username: "gerant" }));
  return cookies.store;
}

export const newId = () => globalThis.crypto.randomUUID();

// ── Résultats d'action ─────────────────────────────────────────────────────────

export function expectOk<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(`Action refusée : ${result.error.code} — ${result.error.message}`);
  return result.data;
}

export function expectError<T>(result: ActionResult<T>, code: string) {
  expect(result.ok, result.ok ? "l'action aurait dû échouer" : "").toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.error.code, result.error.message).toBe(code);
  return result.error;
}

// ── Jeux de données ────────────────────────────────────────────────────────────

type Prisma = Server["prisma"];

export async function seedPerfume(
  prisma: Prisma,
  options: { name?: string; brand?: string; stock?: number | null; image?: string } = {},
) {
  const brandName = options.brand ?? "Dior";
  const brand = await prisma.brand.upsert({
    where: { name: brandName },
    create: { name: brandName, slug: brandName.toLowerCase().replace(/\W+/g, "-") },
    update: {},
  });
  return prisma.perfume.create({
    data: {
      brandId: brand.id,
      name: options.name ?? "Sauvage",
      image: options.image ?? "https://cdn.example/sauvage.webp",
      stock: options.stock === undefined ? null : options.stock,
    },
  });
}

export async function stockOf(prisma: Prisma, perfumeId: number): Promise<number | null> {
  return (await prisma.perfume.findUniqueOrThrow({ where: { id: perfumeId }, select: { stock: true } })).stock;
}

export function seedCustomer(prisma: Prisma, data: { fullName: string; phoneE164?: string | null }) {
  return prisma.customer.create({ data: { fullName: data.fullName, phoneE164: data.phoneE164 ?? null } });
}

export function seedBatch(prisma: Prisma, data: { name: string; status?: "OPEN" | "CLOSED" }) {
  return prisma.batch.create({ data: { name: data.name, status: data.status ?? "OPEN" } });
}

/** Un paiement comme le module encaissements l'écrira (J6) : mouvement PAYMENT et sa pièce, même transaction. */
export async function seedPayment(prisma: Prisma, documentId: string, amount: string) {
  const pocket =
    (await prisma.pocket.findFirst({ where: { isSystem: true } })) ??
    (await prisma.pocket.create({ data: { name: "Non attribué", kind: "UNASSIGNED", isSystem: true } }));
  await prisma.$transaction(async (t) => {
    const movement = await t.cashMovement.create({ data: { pocketId: pocket.id, amount, kind: "PAYMENT" } });
    await t.payment.create({ data: { documentId, kind: "DEPOSIT", movementId: movement.id } });
  });
}

export async function counts(prisma: Prisma) {
  return {
    documents: await prisma.saleDocument.count(),
    lines: await prisma.saleLine.count(),
    customers: await prisma.customer.count(),
    pricings: await prisma.perfumePricing.count(),
  };
}

// ── Atomicité ──────────────────────────────────────────────────────────────────

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

export const INJECTED = "échec injecté après la première écriture";

/**
 * Le `tx` d'une transaction dont la PREMIÈRE écriture Prisma aboutit en base, puis lève : la transaction
 * est annulée, rien de ce qu'elle a écrit ne doit subsister. `written` dit quelle écriture a eu lieu.
 */
export function failingAfterFirstWrite<T extends { db: object }>(tx: T): T & { written: string[] } {
  const written: string[] = [];
  const db = new Proxy(tx.db, {
    get(target, property) {
      const delegate = Reflect.get(target, property);
      if (typeof property !== "string" || property.startsWith("$") || delegate === null || typeof delegate !== "object") {
        return typeof delegate === "function" ? delegate.bind(target) : delegate;
      }
      return new Proxy(delegate, {
        get(model, operation) {
          const method = Reflect.get(model, operation);
          if (typeof operation !== "string" || !WRITE_OPERATIONS.has(operation) || typeof method !== "function") {
            return typeof method === "function" ? method.bind(model) : method;
          }
          return async (...args: unknown[]): Promise<never> => {
            await (method as (...a: unknown[]) => Promise<unknown>).apply(model, args);
            written.push(`${property}.${operation}`);
            throw new Error(`${INJECTED} (${written.join(", ")})`);
          };
        },
      });
    },
  });
  return Object.assign({}, tx, { db, written });
}
