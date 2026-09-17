import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { resetDatabase } from "./support/database";
import { memoryCookies, useTestDatabaseForServer } from "./support/server";

/**
 * V-lib-1 (07 J0, 04 §10.2) : l'extension `$allOperations` enregistre, via `AsyncLocalStorage`, les
 * modèles écrits À L'INTÉRIEUR d'une transaction interactive `inTransaction` ; `defineAction` en déduit
 * les tags à invalider (04 §10.1).
 */

const cache = vi.hoisted(() => ({ calls: [] as string[] }));
const cookieJar = vi.hoisted(() => ({ current: undefined as undefined | ReturnType<typeof memoryCookies>["store"] }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  updateTag: (tag: string) => void cache.calls.push(`updateTag:${tag}`),
  revalidateTag: (tag: string, profile: unknown) => void cache.calls.push(`revalidateTag:${tag}:${JSON.stringify(profile)}`),
  revalidatePath: (path: string) => void cache.calls.push(`revalidatePath:${path}`),
  unstable_cache: (fn: () => unknown) => fn,
}));
vi.mock("next/headers", () => ({ cookies: async () => cookieJar.current }));

type Server = {
  inTransaction: typeof import("@/server/db/transaction").inTransaction;
  runUnitOfWork: typeof import("@/server/db/unit-of-work").runUnitOfWork;
  defineAction: typeof import("@/server/core/define-action").defineAction;
  signSessionToken: typeof import("@/server/auth/token").signSessionToken;
  prisma: typeof import("@/lib/db/prisma").prisma;
};

let server: Server;

beforeAll(async () => {
  await useTestDatabaseForServer();
  server = {
    ...(await import("@/server/db/transaction")),
    ...(await import("@/server/db/unit-of-work")),
    ...(await import("@/server/core/define-action")),
    ...(await import("@/server/auth/token")),
    ...(await import("@/lib/db/prisma")),
  };
  await resetDatabase(server.prisma);
});

afterAll(async () => {
  await server?.prisma.$disconnect();
});

beforeEach(async () => {
  cache.calls.length = 0;
  const cookies = memoryCookies();
  cookies.store.set("nurea_admin", await server.signSessionToken({ userId: "u-test", username: "gerant" }));
  cookieJar.current = cookies.store;
});

describe("V-lib-1 : modèles écrits dans inTransaction (04 §10.2)", () => {
  it("enregistre chaque modèle écrit dans la transaction interactive, lecture exclue", async () => {
    const written = new Set<string>();
    await server.runUnitOfWork(written, () =>
      server.inTransaction(async (tx) => {
        await tx.db.customer.findMany();
        await tx.db.customer.create({ data: { fullName: "Inès" } });
        const brand = await tx.db.brand.create({ data: { name: "Dior", slug: "dior" } });
        await tx.db.perfume.updateMany({ where: { brandId: brand.id }, data: { isFeatured: false } });
        await tx.db.batch.upsert({ where: { id: "b-vlib1" }, create: { id: "b-vlib1", name: "Mars" }, update: {} });
      }),
    );
    expect([...written].sort()).toEqual(["Batch", "Brand", "Customer", "Perfume"]);
  });

  it("enregistre aussi les écritures d'une transaction annulée (ROLLBACK)", async () => {
    const written = new Set<string>();
    await expect(
      server.runUnitOfWork(written, () =>
        server.inTransaction(async (tx) => {
          await tx.db.pocket.create({ data: { name: "Espèces" } });
          throw new Error("échec injecté");
        }),
      ),
    ).rejects.toThrow("échec injecté");
    expect([...written]).toEqual(["Pocket"]);
    expect(await server.prisma.pocket.count()).toBe(0);
  });

  it("isole deux unités de travail concurrentes, et ne fait rien hors unité de travail", async () => {
    const first = new Set<string>();
    const second = new Set<string>();
    await Promise.all([
      server.runUnitOfWork(first, () =>
        server.inTransaction(async (tx) => {
          await new Promise((resolve) => setTimeout(resolve, 30));
          await tx.db.customer.create({ data: { fullName: "Samir" } });
        }),
      ),
      server.runUnitOfWork(second, () => server.inTransaction((tx) => tx.db.batch.create({ data: { name: "Avril" } }))),
      server.inTransaction((tx) => tx.db.pocket.create({ data: { name: "Banque" } })),
    ]);
    expect([...first]).toEqual(["Customer"]);
    expect([...second]).toEqual(["Batch"]);
  });
});

describe("defineAction : invalidation déduite des modèles écrits (04 §10.1)", () => {
  it("une écriture de gestion invalide le seul tag gestion", async () => {
    const action = server.defineAction("tests.customer", z.object({ name: z.string() }), async ({ name }) =>
      server.inTransaction(async (tx) => (await tx.db.customer.create({ data: { fullName: name } })).id),
    );
    const result = await action({ name: "Yanis" });
    expect(result.ok).toBe(true);
    expect(cache.calls).toEqual(["updateTag:gestion"]);
  });

  it("une écriture du catalogue invalide gestion, admin-catalogue et le contrat vitrine", async () => {
    const action = server.defineAction("tests.brand", z.object({ name: z.string() }), async ({ name }) =>
      server.inTransaction(async (tx) => (await tx.db.brand.create({ data: { name, slug: name.toLowerCase() } })).id),
    );
    expect((await action({ name: "Guerlain" })).ok).toBe(true);
    expect(cache.calls).toEqual([
      "updateTag:gestion",
      "updateTag:admin-catalogue",
      'revalidateTag:public-catalogue:{"expire":0}',
      'revalidateTag:admin-catalogue:{"expire":0}',
      "revalidatePath:/admin/catalogue",
      "revalidatePath:/",
    ]);
  });

  it("invalide aussi après un échec (ROLLBACK), et rien sans écriture", async () => {
    const failing = server.defineAction("tests.failing", z.object({}), async () =>
      server.inTransaction(async (tx) => {
        await tx.db.customer.create({ data: { fullName: "Temporaire" } });
        throw new Error("échec injecté");
      }),
    );
    const failed = await failing({});
    expect(failed.ok).toBe(false);
    expect(!failed.ok && failed.error.code).toBe("UNEXPECTED");
    expect(cache.calls).toEqual(["updateTag:gestion"]);

    cache.calls.length = 0;
    const readOnly = server.defineAction("tests.read", z.object({}), async () =>
      server.inTransaction((tx) => tx.db.customer.count()),
    );
    expect((await readOnly({})).ok).toBe(true);
    expect(cache.calls).toEqual([]);
  });

  it("sans session : SESSION_EXPIRED, handler jamais exécuté", async () => {
    cookieJar.current = memoryCookies().store;
    const handler = vi.fn(async () => "jamais");
    const action = server.defineAction("tests.guarded", z.object({}), handler);
    const result = await action({});
    expect(result).toMatchObject({ ok: false, error: { code: "SESSION_EXPIRED" } });
    expect(handler).not.toHaveBeenCalled();
  });
});
