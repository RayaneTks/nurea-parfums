import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { checkInvariants } from "../../scripts/check-invariants";
import {
  catalogueLine,
  createDocument,
  expectInvariants,
  loadMoneyServer,
  seedPocket,
  type MoneyServer,
} from "./transactions/support/argent";
import { expectOk, freshStart, newId, seedBatch, seedPerfume } from "./transactions/support/harness";

/**
 * Invariants de l'argent (03 §5.7) — les requêtes de `npm run check:invariants` — vérifiés après CHAQUE geste
 * d'une journée complète du gérant (07 J6), et éprouvés : un écart écrit en SQL brut est bien détecté. La journée
 * passe en dernier : la base de test garde ses données, sur lesquelles `npm run check:invariants` sort 0.
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

describe("les contrôles détectent un écart réel", () => {
  it("un transfert à une jambe et une poche archivée à solde non nul (écrits en SQL brut) sont signalés", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces", openingBalance: "10" });
    expect((await checkInvariants(server.prisma)).every((result) => result.ok)).toBe(true);

    await server.prisma.$executeRawUnsafe(
      `INSERT INTO "CashMovement" (id, "pocketId", amount, kind, "transferGroupId") VALUES ('mv-orphelin', '${cash.id}', -5, 'TRANSFER', 'groupe-orphelin')`,
    );
    await server.prisma.$executeRawUnsafe(`UPDATE "Pocket" SET archived = true WHERE id = '${cash.id}'`);

    const results = await checkInvariants(server.prisma);
    expect(results.map((result) => [result.name, result.ok])).toEqual([
      ["Σ payé des documents = Σ des mouvements PAYMENT", true],
      ["chaque transfert a deux jambes de somme nulle", false],
      ["toute poche archivée a un solde nul", false],
    ]);
    expect(results[1]?.details).toEqual(["transfert groupe-orphelin : 1 jambe(s), somme -5.00 €"]);
    expect(results[2]?.details).toEqual([`poche archivée « Espèces » (${cash.id}) : solde 5.00 €`]);
  });
});

describe("invariants de 03 §5.7 après chaque scénario", () => {
  it("une journée d'argent : vente, commande, acompte, livraison, annulations, corrections, dépenses, transferts, archivage", async () => {
    const steps: [string, () => Promise<unknown>][] = [];
    const step = (name: string, run: () => Promise<unknown>) => steps.push([name, run]);

    const cash = await seedPocket(server.prisma, { name: "Espèces", openingBalance: "50" });
    const bank = await seedPocket(server.prisma, { name: "Banque", kind: "BANK", openingBalance: "1000" });
    const old = await seedPocket(server.prisma, { name: "Ancienne caisse", openingBalance: "20" });
    const sauvage = await seedPerfume(server.prisma, { stock: 20 });
    const batch = await seedBatch(server.prisma, { name: "Commande de mars" });
    const ids: Record<string, string> = {};

    step("vente directe payée en deux poches", async () => {
      ids.sale = await createDocument(server, {
        origin: "DIRECT_SALE",
        lines: [catalogueLine(sauvage.id, { quantity: 2 })],
        received: [
          { amount: "200", pocketId: cash.id },
          { amount: "40", pocketId: null },
        ],
      });
    });
    step("commande avec acompte", async () => {
      ids.order = await createDocument(server, {
        origin: "ORDER",
        lines: [catalogueLine(sauvage.id, { quantity: 3, unitPriceEur: "100" })],
        received: [{ amount: "100", pocketId: bank.id }],
      });
    });
    step("encaissement d'un solde puis « Annuler » du toast", async () => {
      const payment = expectOk(await server.payments.recordPaymentAction({ id: newId(), documentId: ids.order!, amount: "50", pocketId: cash.id }));
      expectOk(await server.documents.revertDocumentChangeAction({ token: payment.undo as string }));
    });
    step("livrer et encaisser", async () => {
      const done = expectOk(
        await server.documents.deliverAndCollectAction({ documentId: ids.order!, payment: { id: newId(), amount: "200", pocketId: cash.id } }),
      );
      ids.orderPayment = done.payment.id;
    });
    step("corriger le paiement de livraison", async () => {
      expectOk(await server.payments.correctPaymentAction({ paymentId: ids.orderPayment!, newPaymentId: newId(), amount: "150", pocketId: bank.id }));
    });
    step("annuler l'acompte d'origine", async () => {
      const deposit = await server.prisma.payment.findFirstOrThrow({ where: { documentId: ids.order!, kind: "DEPOSIT" } });
      expectOk(await server.payments.voidPaymentAction({ paymentId: deposit.id }));
    });
    step("annuler la vente avec remboursement réparti", async () => {
      expectOk(
        await server.documents.cancelDocumentAction({
          documentId: ids.sale!,
          refunds: [
            { id: newId(), amount: "200", pocketId: cash.id },
            { id: newId(), amount: "40", pocketId: null },
          ],
          confirm: true,
        }),
      );
    });
    step("annuler un remboursement", async () => {
      const refund = await server.prisma.payment.findFirstOrThrow({ where: { documentId: ids.sale!, kind: "REFUND", movement: { pocketId: cash.id } } });
      expectOk(await server.payments.voidPaymentAction({ paymentId: refund.id }));
    });
    step("dépense de lot puis suppression", async () => {
      const expense = expectOk(
        await server.batches.addBatchExpenseAction({ id: newId(), batchId: batch.id, label: "Transport", amount: "45", pocketId: bank.id }),
      );
      expectOk(await server.batches.addBatchExpenseAction({ id: newId(), batchId: batch.id, label: "Douane", amount: "15", pocketId: cash.id }));
      expectOk(await server.batches.deleteBatchExpenseAction({ id: expense.id }));
    });
    step("transfert, répartition, annulation d'un transfert", async () => {
      const transfer = expectOk(await server.treasury.transferAction({ fromPocketId: cash.id, toPocketId: bank.id, amount: "100" }));
      expectOk(await server.treasury.reverseMovementAction({ movementId: transfer.movements[0].id }));
      const system = await server.prisma.pocket.findFirstOrThrow({ where: { isSystem: true } });
      const [row] = await server.prisma.$queryRawUnsafe<{ balance: string }[]>(
        `SELECT (p."openingBalance" + COALESCE(SUM(m.amount), 0))::text AS balance FROM "Pocket" p LEFT JOIN "CashMovement" m ON m."pocketId" = p.id WHERE p.id = $1 GROUP BY p.id`,
        system.id,
      );
      if (row && row.balance !== "0.00") {
        expectOk(await server.treasury.transferAction({ fromPocketId: null, toPocketId: cash.id, amount: row.balance }));
      }
    });
    step("ajustement, paiement fournisseur et son annulation", async () => {
      expectOk(await server.treasury.adjustAction({ pocketId: cash.id, direction: "out", amount: "3", reason: "Écart de caisse" }));
      const supplier = expectOk(await server.treasury.recordSupplierPaymentAction({ pocketId: bank.id, amount: "300" }));
      expectOk(await server.treasury.reverseMovementAction({ movementId: supplier.movement.id }));
    });
    step("vider puis archiver une poche", async () => {
      expectOk(await server.treasury.transferAction({ fromPocketId: old.id, toPocketId: cash.id, amount: "20" }));
      expectOk(await server.treasury.archivePocketAction({ id: old.id }));
    });
    step("tout encaisser d'un client", async () => {
      const a = await createDocument(server, { origin: "DIRECT_SALE", received: [{ amount: "20", pocketId: bank.id }] });
      const b = await createDocument(server, { origin: "DIRECT_SALE", received: [{ amount: "20", pocketId: bank.id }] });
      const all = expectOk(
        await server.payments.collectAllAction({
          pocketId: cash.id,
          payments: [
            { id: newId(), documentId: a, amount: "100" },
            { id: newId(), documentId: b, amount: "50" },
          ],
        }),
      );
      expectOk(await server.documents.revertDocumentChangeAction({ token: all.undo as string }));
    });

    for (const [name, run] of steps) {
      await run();
      const results = await checkInvariants(server.prisma);
      expect(results.filter((result) => !result.ok), `après « ${name} »`).toEqual([]);
    }
    await expectInvariants(server.prisma);
  });
});
