import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { addBatchExpenseInput } from "@/contracts/batches";
import {
  balanceOf,
  defaultPocketId,
  expectInvariants,
  loadMoneyServer,
  moneyCounts,
  seedPocket,
  seedSystemPocket,
  type MoneyServer,
} from "./support/argent";
import { INJECTED, expectError, expectOk, failingAfterFirstWrite, freshStart, newId, seedBatch } from "./support/harness";

/**
 * T9 (03 §4.3, §4.4 ; 06 S12 ; 07 J6) : `addBatchExpenseAction` — pièce et mouvement EXPENSE négatif dans la
 * même transaction, datable jamais dans le futur, lot clos accepté, poche archivée refusée, « Non attribué »
 * jamais négatif, poche mémorisée, idempotence, atomicité.
 */

const cookieJar = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  updateTag: () => undefined,
  revalidateTag: () => undefined,
  revalidatePath: () => undefined,
  unstable_cache: (fn: () => unknown) => fn,
}));
vi.mock("next/headers", () => ({ cookies: async () => cookieJar.current }));

let server: MoneyServer;

beforeAll(async () => {
  server = await loadMoneyServer();
});

afterAll(async () => {
  await server?.prisma.$disconnect();
});

beforeEach(async () => {
  cookieJar.current = await freshStart(server);
});

afterEach(async () => {
  await expectInvariants(server.prisma);
});

const DAY = 24 * 3600 * 1000;

const expense = (batchId: string, overrides: Record<string, unknown> = {}) =>
  server.batches.addBatchExpenseAction({ id: newId(), batchId, label: "Transport", amount: "45", pocketId: null, ...overrides } as never);

describe("T9 — nominal", () => {
  it("dépense datée d'hier : pièce + mouvement EXPENSE −45 à cette date, poche débitée et mémorisée", async () => {
    const bank = await seedPocket(server.prisma, { name: "Banque", kind: "BANK", openingBalance: "100" });
    const batch = await seedBatch(server.prisma, { name: "Commande de mars" });
    const yesterday = new Date(Date.now() - DAY);
    const id = newId();

    const data = expectOk(
      await server.batches.addBatchExpenseAction({
        id,
        batchId: batch.id,
        label: " Transport ",
        amount: "45",
        pocketId: bank.id,
        occurredAt: yesterday.toISOString(),
        notes: "DHL",
      }),
    );

    expect(data).toMatchObject({ id, batchId: batch.id, label: "Transport", notes: "DHL", amount: "45.00", pocketId: bank.id, occurredAt: yesterday.toISOString() });
    const stored = await server.prisma.batchExpense.findUniqueOrThrow({ where: { id }, include: { movement: true } });
    expect(stored.movement).toMatchObject({ kind: "EXPENSE", pocketId: bank.id, reversesId: null, label: "Transport" });
    expect(stored.movement.amount.toFixed(2)).toBe("-45.00");
    expect(stored.movement.occurredAt).toEqual(yesterday);
    expect(await balanceOf(server.prisma, bank.id)).toBe("55.00");
    expect(await defaultPocketId(server.prisma)).toBe(bank.id);
  });

  it("lot clos : la dépense tardive est acceptée", async () => {
    const bank = await seedPocket(server.prisma, { name: "Banque", kind: "BANK", openingBalance: "100" });
    const batch = await seedBatch(server.prisma, { name: "Février", status: "CLOSED" });
    expect(expectOk(await expense(batch.id, { pocketId: bank.id })).batchId).toBe(batch.id);
  });

  it("une poche autre que « Non attribué » peut passer en négatif (dépense réelle, sans réserve)", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const batch = await seedBatch(server.prisma, { name: "Mars" });
    expectOk(await expense(batch.id, { pocketId: cash.id }));
    expect(await balanceOf(server.prisma, cash.id)).toBe("-45.00");
  });
});

describe("T9 — gardes", () => {
  it("jour futur ⇒ VALIDATION « Choisis une date passée : une dépense ne se date pas dans le futur. »", async () => {
    const batch = await seedBatch(server.prisma, { name: "Mars" });
    const refused = expectError(await expense(batch.id, { occurredAt: new Date(Date.now() + 2 * DAY).toISOString() }), "VALIDATION");
    expect(refused.fields).toEqual({ occurredAt: "Choisis une date passée : une dépense ne se date pas dans le futur." });
    expect(await server.prisma.batchExpense.count()).toBe(0);
  });

  it("« Non attribué » insuffisant ⇒ CONFLICT ; poche archivée ⇒ CONFLICT ; lot inconnu ⇒ NOT_FOUND ; rien d'écrit", async () => {
    await seedSystemPocket(server.prisma, "30");
    const archived = await seedPocket(server.prisma, { name: "Ancienne", archived: true });
    const batch = await seedBatch(server.prisma, { name: "Mars" });
    const before = await moneyCounts(server.prisma);

    expect(expectError(await expense(batch.id), "CONFLICT").message).toBe(
      "« Non attribué » ne contient que 30,00 € : il ne passe jamais sous zéro. Choisis une autre poche ou un montant plus petit.",
    );
    expectError(await expense(batch.id, { pocketId: archived.id }), "CONFLICT");
    expectError(await expense(newId(), { amount: "5" }), "NOT_FOUND");
    expect(await moneyCounts(server.prisma)).toEqual(before);
  });

  it("libellé vide ou montant nul ⇒ VALIDATION du contrat", async () => {
    const batch = await seedBatch(server.prisma, { name: "Mars" });
    expect(expectError(await expense(batch.id, { label: " ", amount: "0" }), "VALIDATION").fields).toEqual({
      label: "Indique le libellé de la dépense (Transport, Douane…).",
      amount: "Indique un montant supérieur à 0 €.",
    });
  });

  it("un lot qui a eu une dépense ne se supprime plus, même la dépense supprimée (J5)", async () => {
    const bank = await seedPocket(server.prisma, { name: "Banque", openingBalance: "100" });
    const batch = await seedBatch(server.prisma, { name: "Mars" });
    const data = expectOk(await expense(batch.id, { pocketId: bank.id }));
    expect(expectError(await server.batches.deleteBatchAction({ id: batch.id }), "CONFLICT").message).toBe(
      "Impossible : 1 dépense rattachée. Clôture-le plutôt.",
    );
    expectOk(await server.batches.deleteBatchExpenseAction({ id: data.id }));
    expect(expectError(await server.batches.deleteBatchAction({ id: batch.id }), "CONFLICT").message).toBe(
      "Impossible : ce lot a un historique de dépenses. Clôture-le plutôt.",
    );
  });
});

describe("T9 — idempotence et atomicité", () => {
  it("renvoi du même identifiant : une dépense, deux succès identiques", async () => {
    const bank = await seedPocket(server.prisma, { name: "Banque", openingBalance: "100" });
    const batch = await seedBatch(server.prisma, { name: "Mars" });
    const input = { id: newId(), batchId: batch.id, label: "Douane", amount: "20", pocketId: bank.id };
    const first = expectOk(await server.batches.addBatchExpenseAction(input));
    expect(expectOk(await server.batches.addBatchExpenseAction(input))).toEqual(first);
    const concurrent = { ...input, id: newId() };
    const results = await Promise.all([
      server.batches.addBatchExpenseAction(concurrent),
      server.batches.addBatchExpenseAction(concurrent),
    ]);
    expect(results.map((result) => result.ok)).toEqual([true, true]);
    expect(await moneyCounts(server.prisma)).toMatchObject({ expenses: 2, movements: 2 });
    expect(await balanceOf(server.prisma, bank.id)).toBe("60.00");
  });

  it("erreur injectée après la première écriture ⇒ ni mouvement, ni dépense, ni réglage", async () => {
    const bank = await seedPocket(server.prisma, { name: "Banque", openingBalance: "100" });
    const batch = await seedBatch(server.prisma, { name: "Mars" });
    const input = addBatchExpenseInput.parse({ id: newId(), batchId: batch.id, label: "Douane", amount: "20", pocketId: bank.id });
    const before = await moneyCounts(server.prisma);
    let written: string[] = [];
    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingAfterFirstWrite(tx);
        written = failing.written;
        return server.batchesWriter.addBatchExpense(failing, input);
      }),
    ).rejects.toThrow(INJECTED);
    expect(written).toEqual(["cashMovement.create"]);
    expect(await moneyCounts(server.prisma)).toEqual(before);
    expect(await defaultPocketId(server.prisma)).toBeNull();
  });
});
