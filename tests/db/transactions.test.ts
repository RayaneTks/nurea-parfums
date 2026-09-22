import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "./support/database";
import { useTestDatabaseForServer } from "./support/server";

/**
 * `inTransaction` et `locks.ts` sur un vrai PostgreSQL (04 §3.6, §4.1, §4.2) : rejeu d'idempotence,
 * ordre canonique des verrous, rejeu d'un interblocage.
 */

vi.mock("server-only", () => ({}));

type Server = typeof import("@/server/db/transaction") &
  typeof import("@/server/db/locks") &
  typeof import("@/server/core/errors") &
  typeof import("@/lib/db/prisma");

let server: Server;

beforeAll(async () => {
  await useTestDatabaseForServer();
  server = {
    ...(await import("@/server/db/transaction")),
    ...(await import("@/server/db/locks")),
    ...(await import("@/server/core/errors")),
    ...(await import("@/lib/db/prisma")),
  };
});

afterAll(async () => {
  await server?.prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(server.prisma);
});

/** Un portillon : chaque transaction attend que toutes y soient arrivées. */
function barrier(parties: number) {
  let arrived = 0;
  let open!: () => void;
  const opened = new Promise<void>((resolve) => (open = resolve));
  return async () => {
    arrived += 1;
    if (arrived === parties) open();
    await opened;
  };
}

describe("idempotence : deux créations du même id (04 §3.6)", () => {
  // Le patron d'un writer de création idempotente : chercher l'id, rendre l'existant, sinon créer.
  async function createBatch(
    tx: import("@/server/db/transaction").Tx,
    input: { id: string; name: string },
    beforeInsert?: () => Promise<void>,
  ) {
    const existing = await tx.db.batch.findUnique({ where: { id: input.id } });
    if (existing) return { id: existing.id, name: existing.name, replayed: true };
    await beforeInsert?.();
    const created = await tx.db.batch.create({ data: { id: input.id, name: input.name } });
    return { id: created.id, name: created.name, replayed: false };
  }

  it("deux envois croisés : une ligne, deux succès, le second rejoué", async () => {
    const id = "5b0f3a1e-2c4d-4e6f-8a9b-0c1d2e3f4a5b";
    const bothChecked = barrier(2);
    let attempts = 0;
    const send = () =>
      server.inTransaction(async (tx) => {
        attempts += 1;
        // Seules les premières tentatives passent le portillon : le rejeu ne doit pas l'attendre.
        return createBatch(tx, { id, name: "Commande de mars" }, attempts <= 2 ? bothChecked : undefined);
      });

    const results = await Promise.all([send(), send()]);

    expect(results.map((r) => r.id)).toEqual([id, id]);
    expect(results.map((r) => r.replayed).sort()).toEqual([false, true]);
    expect(attempts).toBe(3);
    expect(await server.prisma.batch.count({ where: { id } })).toBe(1);
  });

  it("un renvoi après succès ne réécrit rien", async () => {
    const id = "7c1e2d3f-4a5b-4c6d-9e8f-1a2b3c4d5e6f";
    const first = await server.inTransaction((tx) => createBatch(tx, { id, name: "Avril" }));
    const again = await server.inTransaction((tx) => createBatch(tx, { id, name: "Avril (double tap)" }));
    expect(first.replayed).toBe(false);
    expect(again).toEqual({ id, name: "Avril", replayed: true });
    expect(await server.prisma.batch.count()).toBe(1);
  });

  it("un conflit d'unicité hors clé primaire n'est pas rejoué et devient CONFLICT", async () => {
    let attempts = 0;
    await server.prisma.customer.create({ data: { fullName: "Inès", phoneE164: "+33612345678" } });
    const error = await server
      .inTransaction(async (tx) => {
        attempts += 1;
        return tx.db.customer.create({ data: { fullName: "Autre", phoneE164: "+33612345678" } });
      })
      .catch((e: unknown) => e);
    expect(attempts).toBe(1);
    expect(server.toActionError(error)).toMatchObject({ code: "CONFLICT", retryable: false });
  });

  it("refuse une transaction imbriquée", async () => {
    await expect(server.inTransaction(() => server.inTransaction(async () => 1))).rejects.toThrow("imbriqué");
  });
});

describe("verrous en ordre canonique (04 §4.2)", () => {
  async function seed() {
    const unassigned = await server.prisma.pocket.create({ data: { id: "p-b", name: "Non attribué" } });
    const cash = await server.prisma.pocket.create({ data: { id: "p-a", name: "Espèces" } });
    const batch = await server.prisma.batch.create({ data: { id: "b-1", name: "Mars" } });
    const document = await server.prisma.saleDocument.create({ data: { id: "d-1", origin: "ORDER" } });
    const brand = await server.prisma.brand.create({ data: { name: "Dior", slug: "dior" } });
    const perfumes = await Promise.all(
      [5, null].map((stock, i) =>
        server.prisma.perfume.create({ data: { brandId: brand.id, name: `Parfum ${i}`, image: "x.webp", stock } }),
      ),
    );
    return { unassigned, cash, batch, document, perfumes };
  }

  it("un appel verrouille tous ses rangs et rend les lignes trouvées", async () => {
    const { perfumes } = await seed();
    const result = await server.inTransaction(async (tx) => {
      const locked = await tx.lock({
        documents: ["d-1", "d-absent"],
        batches: { share: ["b-1"] },
        pockets: { update: ["p-b"], share: ["p-a", "p-b"] },
        perfumes: [perfumes[1]!.id, perfumes[0]!.id],
      });
      return {
        locked,
        held: [tx.lock.held("pockets", "p-a"), tx.lock.held("pockets", "p-b"), tx.lock.held("documents", "d-absent")],
      };
    });
    expect(result.locked.documents).toEqual(["d-1"]);
    expect(result.locked.batches).toEqual(["b-1"]);
    expect(result.locked.pockets).toEqual(["p-a", "p-b"]);
    expect(result.locked.perfumes).toEqual(
      [...perfumes].sort((a, b) => a.id - b.id).map((p) => ({ id: p.id, stock: p.stock })),
    );
    expect(result.held).toEqual(["share", "update", null]);
  });

  it("des appels successifs de rang croissant (ou égal) sont permis", async () => {
    const { perfumes } = await seed();
    await expect(
      server.inTransaction(async (tx) => {
        await tx.lock({ documents: ["d-1"] });
        await tx.lock({ documents: ["d-1"], pockets: { share: ["p-a"] } });
        await tx.lock({ perfumes: [perfumes[0]!.id] });
        return "ok";
      }),
    ).resolves.toBe("ok");
  });

  it("LockOrderError sur un ordre violé : rien d'écrit, jamais rejoué, UNEXPECTED", async () => {
    await seed();
    let attempts = 0;
    const error = await server
      .inTransaction(async (tx) => {
        attempts += 1;
        await tx.db.customer.create({ data: { fullName: "Écrit avant l'erreur" } });
        await tx.lock({ pockets: { share: ["p-a"] } });
        await tx.lock({ documents: ["d-1"] });
      })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(server.LockOrderError);
    expect(attempts).toBe(1);
    expect(await server.prisma.customer.count()).toBe(0);
    expect(server.toActionError(error)).toMatchObject({ code: "UNEXPECTED", retryable: false });
  });

  it("un interblocage est rejoué : les deux transactions aboutissent", async () => {
    await seed();
    const bothHoldFirstLock = barrier(2);
    let attempts = 0;
    let deadlocks = 0;
    // Ordre volontairement inverse, en SQL brut : ce que tx.lock empêche, pour éprouver le rejeu.
    const lockInOrder = (first: string, second: string) =>
      server.inTransaction(async (tx) => {
        attempts += 1;
        const isFirstAttempt = attempts <= 2;
        await tx.db.$queryRaw`SELECT id FROM "Pocket" WHERE id = ${first} FOR UPDATE`;
        if (isFirstAttempt) await bothHoldFirstLock();
        try {
          await tx.db.$queryRaw`SELECT id FROM "Pocket" WHERE id = ${second} FOR UPDATE`;
        } catch (e) {
          if (server.isRetryable(e)) deadlocks += 1;
          throw e;
        }
        return `${first}→${second}`;
      });

    const results = await Promise.all([lockInOrder("p-a", "p-b"), lockInOrder("p-b", "p-a")]);
    expect(results.sort()).toEqual(["p-a→p-b", "p-b→p-a"]);
    expect(deadlocks).toBe(1);
    expect(attempts).toBe(3);
  });
});
