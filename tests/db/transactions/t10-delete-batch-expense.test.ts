import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  balanceOf,
  expectInvariants,
  loadMoneyServer,
  moneyCounts,
  seedPocket,
  type MoneyServer,
} from "./support/argent";
import { INJECTED, expectError, expectOk, failingAfterFirstWrite, freshStart, newId, seedBatch } from "./support/harness";

/**
 * T10 (03 §4.3, §4.4 ; 06 S18 « Supprimer la dépense » ; 07 J6) : `deleteBatchExpenseAction` — contre-passation
 * du mouvement (EXPENSE positif, même poche, même date), la pièce reste ; renvoi sans erreur ; poche archivée
 * refusée ; atomicité.
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

async function seedExpense(options: { openingBalance?: string; occurredAt?: Date } = {}) {
  const bank = await seedPocket(server.prisma, { name: "Banque", kind: "BANK", openingBalance: options.openingBalance ?? "100" });
  const batch = await seedBatch(server.prisma, { name: "Mars" });
  const data = expectOk(
    await server.batches.addBatchExpenseAction({
      id: newId(),
      batchId: batch.id,
      label: "Transport",
      amount: "45",
      pocketId: bank.id,
      occurredAt: options.occurredAt?.toISOString(),
    }),
  );
  return { bank, batch, expense: data };
}

describe("T10 — supprimer une dépense", () => {
  it("contre-passation EXPENSE +45 à la date de la dépense, dans sa poche ; la pièce reste ; renvoi ⇒ deleted: false", async () => {
    const lastWeek = new Date(Date.now() - 7 * DAY);
    const { bank, expense } = await seedExpense({ occurredAt: lastWeek });
    expect(await balanceOf(server.prisma, bank.id)).toBe("55.00");

    expect(expectOk(await server.batches.deleteBatchExpenseAction({ id: expense.id }))).toEqual({ id: expense.id, deleted: true });

    const reversal = await server.prisma.cashMovement.findUniqueOrThrow({ where: { reversesId: expense.movementId } });
    expect(reversal).toMatchObject({ kind: "EXPENSE", pocketId: bank.id, occurredAt: lastWeek });
    expect(reversal.amount.toFixed(2)).toBe("45.00");
    expect(await server.prisma.batchExpense.count()).toBe(1);
    expect(await balanceOf(server.prisma, bank.id)).toBe("100.00");

    const counts = await moneyCounts(server.prisma);
    expect(expectOk(await server.batches.deleteBatchExpenseAction({ id: expense.id }))).toEqual({ id: expense.id, deleted: false });
    expect(await moneyCounts(server.prisma)).toEqual(counts);
  });

  it("dépense inconnue ⇒ NOT_FOUND ; identifiant repris (`mig-dep-…`) accepté par le contrat", async () => {
    expectError(await server.batches.deleteBatchExpenseAction({ id: newId() }), "NOT_FOUND");
    expectError(await server.batches.deleteBatchExpenseAction({ id: "mig-dep-cm0abc123def456ghi789jkl0" }), "NOT_FOUND");
  });

  it("poche archivée depuis (solde ramené à 0) ⇒ CONFLICT : l'argent ne peut pas y revenir", async () => {
    const { bank, expense } = await seedExpense({ openingBalance: "45" });
    expectOk(await server.treasury.archivePocketAction({ id: bank.id }));
    const counts = await moneyCounts(server.prisma);
    expect(expectError(await server.batches.deleteBatchExpenseAction({ id: expense.id }), "CONFLICT").message).toBe(
      "La poche « Banque » est archivée : aucun mouvement ne peut plus y entrer ni en sortir.",
    );
    expect(await moneyCounts(server.prisma)).toEqual(counts);
  });

  it("le mouvement d'une dépense ne s'annule pas depuis le journal (T12) : CONFLICT", async () => {
    const { expense } = await seedExpense();
    expect(expectError(await server.treasury.reverseMovementAction({ movementId: expense.movementId }), "CONFLICT").message).toBe(
      "Ce mouvement vient d'une dépense : supprime la dépense depuis la fiche du lot.",
    );
  });

  it("erreur injectée après la première écriture ⇒ aucune contre-passation", async () => {
    const { expense } = await seedExpense();
    const counts = await moneyCounts(server.prisma);
    let written: string[] = [];
    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingAfterFirstWrite(tx);
        written = failing.written;
        return server.batchesWriter.deleteBatchExpense(failing, expense.id);
      }),
    ).rejects.toThrow(INJECTED);
    expect(written).toEqual(["cashMovement.create"]);
    expect(await moneyCounts(server.prisma)).toEqual(counts);
  });
});
