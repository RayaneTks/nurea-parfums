import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { collectAllInput } from "@/contracts/payments";
import { deliverAndCollectInput } from "@/contracts/documents";
import {
  INJECTED_ON,
  balanceOf,
  catalogueLine,
  createDocument,
  expectInvariants,
  failingOn,
  loadMoneyServer,
  moneyCounts,
  paymentsOf,
  seedPocket,
  viewBalance,
  type MoneyServer,
} from "./transactions/support/argent";
import { expectError, expectOk, freshStart, newId, seedCustomer, seedPerfume, stockOf } from "./transactions/support/harness";

/**
 * Actions composées transactionnelles (07 §3.0.2 A-5 ; 06 S02 variantes Livrer et Tout encaisser ; 07 J6) :
 * `deliverAndCollectAction` (T7 puis T4 en une transaction) et `collectAllAction` (un T7 par document, du plus
 * ancien au plus récent, une transaction).
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

const documentOf = (id: string) =>
  server.prisma.saleDocument.findUniqueOrThrow({ where: { id }, include: { lines: { orderBy: { position: "asc" } } } });

describe("deliverAndCollectAction — « Encaisser et livrer »", () => {
  it("succès : document DELIVERED, dû 0, un mouvement PAYMENT (solde), lignes complètes, stock décrémenté, jeton rendu", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const sauvage = await seedPerfume(server.prisma, { stock: 10 });
    const id = await createDocument(server, {
      origin: "ORDER",
      lines: [catalogueLine(sauvage.id, { quantity: 2, unitPriceEur: "60" })],
      received: [{ amount: "60", pocketId: cash.id }],
    });
    const movementsBefore = await server.prisma.cashMovement.count();

    const data = expectOk(
      await server.documents.deliverAndCollectAction({
        documentId: id,
        payment: { id: newId(), amount: "60", pocketId: cash.id },
      }),
    );

    expect(data.document).toMatchObject({ status: "DELIVERED", total: "120.00", paid: "120.00", due: "0.00" });
    expect(data.payment).toMatchObject({ kind: "BALANCE", amount: "60.00", pocketId: cash.id });
    expect(typeof data.undo).toBe("string");
    expect(await server.prisma.cashMovement.count()).toBe(movementsBefore + 1);
    const doc = await documentOf(id);
    expect(doc.deliveredAt).not.toBeNull();
    expect(doc.lines.map((line) => line.deliveredQuantity)).toEqual([2]);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(8);
    expect(await viewBalance(server.prisma, id)).toMatchObject({ due: "0.00" });
    expect(await balanceOf(server.prisma, cash.id)).toBe("120.00");
  });

  it("erreur injectée dans la partie T4 ⇒ aucun paiement ni mouvement écrit, statut et stock intacts", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 10 });
    const id = await createDocument(server, { origin: "ORDER", lines: [catalogueLine(sauvage.id, { quantity: 2, unitPriceEur: "60" })] });
    expectOk(await server.documents.changeDocumentStatusAction({ documentId: id, to: "CONFIRMED", confirm: true }));
    const before = await documentOf(id);
    const counts = await moneyCounts(server.prisma);
    const input = deliverAndCollectInput.parse({ documentId: id, payment: { id: newId(), amount: "120", pocketId: null } });
    let written: string[] = [];

    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingOn(tx, "saleDocument.update");
        written = failing.written;
        return server.documentsWriter.deliverAndCollect(failing, input);
      }),
    ).rejects.toThrow(INJECTED_ON);

    // La partie T7 avait écrit son mouvement et sa pièce avant la partie T4.
    expect(written).toEqual(expect.arrayContaining(["cashMovement.create", "payment.create", "saleLine.update", "saleDocument.update"]));
    expect(written.indexOf("payment.create")).toBeLessThan(written.indexOf("saleLine.update"));
    expect(await moneyCounts(server.prisma)).toEqual(counts);
    expect(await paymentsOf(server.prisma, id)).toEqual([]);
    expect(await documentOf(id)).toEqual(before);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(10);
  });

  it("réserves de la livraison lues avec le payé d'après l'encaissement ; plafond au dû ; rien d'écrit sur refus", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 1 });
    const id = await createDocument(server, { origin: "ORDER", lines: [catalogueLine(sauvage.id, { quantity: 2, unitPriceEur: "60" })] });
    const counts = await moneyCounts(server.prisma);
    const send = (amount: string, confirm = false) =>
      server.documents.deliverAndCollectAction({ documentId: id, payment: { id: newId(), amount, pocketId: null }, confirm });

    expect(expectError(await send("121"), "CONFLICT").message).toBe("Le montant dépasse le reste dû (120,00 €).");
    const reserves = expectError(await send("100"), "NEEDS_CONFIRMATION").confirm;
    expect(reserves).toEqual({
      title: "Livrer cette commande ?",
      reserves: [
        "La commande passe directement de « En attente » à « Livrée ».",
        "Il reste 20,00 € à encaisser.",
        "Stock de Sauvage à 1 : la fiche passera à 0.",
      ],
      confirmLabel: "Confirmer",
    });
    expect(await moneyCounts(server.prisma)).toEqual(counts);
    expect((await documentOf(id)).status).toBe("PENDING");

    const data = expectOk(await send("100", true));
    expect(data.document).toMatchObject({ status: "DELIVERED", due: "20.00" });
    expect(await stockOf(server.prisma, sauvage.id)).toBe(0);
  });

  it("renvoi du même identifiant de paiement : une livraison, un paiement, pas de second jeton", async () => {
    const id = await createDocument(server, { origin: "ORDER" });
    const input = { documentId: id, payment: { id: newId(), amount: "120", pocketId: null }, confirm: true };
    const first = expectOk(await server.documents.deliverAndCollectAction(input));
    const again = expectOk(await server.documents.deliverAndCollectAction(input));
    expect(again).toMatchObject({ payment: first.payment, document: first.document, undo: null });
    expect(await server.prisma.payment.count()).toBe(1);
  });
});

describe("collectAllAction — « Tout encaisser » d'un client", () => {
  const DAY = 24 * 3600 * 1000;

  /** Trois ventes à crédit de Fares, engagées il y a 30, 20 et 10 jours ; dûs 80, 60, 40. */
  async function threeReceivables() {
    const fares = await seedCustomer(server.prisma, { fullName: "Fares" });
    const ids: string[] = [];
    for (const [ago, received] of [
      [30, "40"],
      [20, "60"],
      [10, "80"],
    ] as const) {
      const id = await createDocument(server, {
        origin: "DIRECT_SALE",
        customer: { kind: "linked", customerId: fares.id },
        received: [{ amount: received, pocketId: null }],
      });
      const at = new Date(Date.now() - ago * DAY);
      await server.prisma.saleDocument.update({ where: { id }, data: { confirmedAt: at, deliveredAt: at, orderedAt: at } });
      ids.push(id);
    }
    return ids as [string, string, string];
  }

  it("trois documents ⇒ trois paiements, écrits du plus ancien au plus récent, quel que soit l'ordre reçu", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const [oldest, middle, newest] = await threeReceivables();
    const input = {
      pocketId: cash.id,
      payments: [
        { id: newId(), documentId: newest, amount: "40" },
        { id: newId(), documentId: oldest, amount: "80" },
        { id: newId(), documentId: middle, amount: "60" },
      ],
    };

    const data = expectOk(await server.payments.collectAllAction(input));

    expect(data.payments.map((payment) => [payment.documentId, payment.amount, payment.kind])).toEqual([
      [oldest, "80.00", "BALANCE"],
      [middle, "60.00", "BALANCE"],
      [newest, "40.00", "BALANCE"],
    ]);
    expect(data.documents.map((doc) => [doc.id, doc.due])).toEqual([
      [oldest, "0.00"],
      [middle, "0.00"],
      [newest, "0.00"],
    ]);
    expect(await balanceOf(server.prisma, cash.id)).toBe("180.00");
    // Même date de valeur pour les trois, et une même transaction : même horloge.
    expect(new Set(data.payments.map((payment) => payment.occurredAt)).size).toBe(1);

    // Renvoi : mêmes paiements, rien de plus.
    expect(expectOk(await server.payments.collectAllAction(input)).payments.map((payment) => payment.id).sort()).toEqual(
      data.payments.map((payment) => payment.id).sort(),
    );
    expect(await server.prisma.payment.count({ where: { movement: { pocketId: cash.id } } })).toBe(3);
  });

  it("un plafond dépassé sur le troisième ⇒ CONFLICT, rien d'écrit (ni les deux premiers)", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const [oldest, middle, newest] = await threeReceivables();
    const counts = await moneyCounts(server.prisma);

    const refused = expectError(
      await server.payments.collectAllAction({
        pocketId: cash.id,
        payments: [
          { id: newId(), documentId: oldest, amount: "80" },
          { id: newId(), documentId: middle, amount: "60" },
          { id: newId(), documentId: newest, amount: "40,01" },
        ],
      }),
      "CONFLICT",
    );
    expect(refused.message).toBe("Le montant dépasse le reste dû (40,00 €).");
    expect(await moneyCounts(server.prisma)).toEqual(counts);
    expect(await balanceOf(server.prisma, cash.id)).toBe("0.00");
  });

  it("erreur injectée après les trois pièces (mémoire de la poche) ⇒ rien d'écrit", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const [oldest, middle, newest] = await threeReceivables();
    const counts = await moneyCounts(server.prisma);
    const input = collectAllInput.parse({
      pocketId: cash.id,
      payments: [
        { id: newId(), documentId: oldest, amount: "10" },
        { id: newId(), documentId: middle, amount: "10" },
        { id: newId(), documentId: newest, amount: "10" },
      ],
    });
    let payments = 0;
    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingOn(tx, "setting.upsert");
        const result = server.documentsWriter.collectAll(failing, input);
        return result.finally(() => {
          payments = failing.written.filter((write) => write === "payment.create").length;
        });
      }),
    ).rejects.toThrow(INJECTED_ON);
    expect(payments).toBe(3);
    expect(await moneyCounts(server.prisma)).toEqual(counts);
  });

  it("« Annuler » du toast (T4b) : les trois paiements contre-passés en une transaction", async () => {
    const [oldest, middle, newest] = await threeReceivables();
    const data = expectOk(
      await server.payments.collectAllAction({
        pocketId: null,
        payments: [
          { id: newId(), documentId: oldest, amount: "80" },
          { id: newId(), documentId: middle, amount: "60" },
          { id: newId(), documentId: newest, amount: "40" },
        ],
      }),
    );
    const reverted = expectOk(await server.documents.revertDocumentChangeAction({ token: data.undo as string }));
    expect(reverted.reversedPaymentIds.sort()).toEqual(data.payments.map((payment) => payment.id).sort());
    expect(reverted.documents.map((doc) => doc.due)).toEqual(["80.00", "60.00", "40.00"]);
  });

  it("une commande en attente encaissée ainsi est confirmée (T7) ; document inconnu ⇒ NOT_FOUND ; doublon ⇒ VALIDATION", async () => {
    const order = await createDocument(server, { origin: "ORDER" });
    const data = expectOk(await server.payments.collectAllAction({ pocketId: null, payments: [{ id: newId(), documentId: order, amount: "20" }] }));
    expect(data.documents[0]).toMatchObject({ status: "CONFIRMED", paid: "20.00" });

    expectError(
      await server.payments.collectAllAction({ pocketId: null, payments: [{ id: newId(), documentId: newId(), amount: "20" }] }),
      "NOT_FOUND",
    );
    expectError(
      await server.payments.collectAllAction({
        pocketId: null,
        payments: [
          { id: newId(), documentId: order, amount: "1" },
          { id: newId(), documentId: order, amount: "1" },
        ],
      }),
      "VALIDATION",
    );
  });
});
