import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  balanceOf,
  catalogueLine,
  createDocument,
  expectInvariants,
  loadMoneyServer,
  moneyCounts,
  paymentsOf,
  seedPocket,
  viewBalance,
  type MoneyServer,
} from "./support/argent";
import {
  INJECTED,
  expectError,
  expectOk,
  failingAfterFirstWrite,
  freshStart,
  newId,
  seedPerfume,
  stockOf,
} from "./support/harness";

/**
 * T4b (03 §2.3, §4.3 ; 06 §4.3, S02, PC-04, PC-05, PC-10 ; 07 J6) : `revertDocumentChangeAction`, filet
 * « Annuler » du toast. Rétablit exactement l'état d'avant le geste (statut, horodatages, pointage, stock) et
 * contre-passe les paiements du geste, en une transaction ; refus si le document a changé depuis.
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

const revert = (token: string | null) => server.documents.revertDocumentChangeAction({ token: token ?? "" });

/** Une commande de 3 Sauvage (stock 10), confirmée, pointée 1/3. */
async function confirmedOrderPointedOneOfThree(options: { deposit?: string; pocketId?: string | null } = {}) {
  const sauvage = await seedPerfume(server.prisma, { stock: 10 });
  const id = await createDocument(server, {
    origin: "ORDER",
    lines: [catalogueLine(sauvage.id, { quantity: 3, unitPriceEur: "40" })],
    received: options.deposit ? [{ amount: options.deposit, pocketId: options.pocketId ?? null }] : [],
  });
  if (!options.deposit) expectOk(await server.documents.changeDocumentStatusAction({ documentId: id, to: "CONFIRMED", confirm: true }));
  const [line] = (await documentOf(id)).lines;
  expectOk(await server.documents.setLineDeliveredAction({ documentId: id, lineId: line!.id, deliveredQuantity: 1 }));
  expect(await stockOf(server.prisma, sauvage.id)).toBe(9);
  return { id, perfumeId: sauvage.id };
}

describe("T4b — livrer puis « Annuler »", () => {
  it("commande pointée 1/3 puis livrée, puis Annuler ⇒ CONFIRMED, pointage 1/3 et stock d'avant rétablis", async () => {
    const { id, perfumeId } = await confirmedOrderPointedOneOfThree();
    const before = await documentOf(id);

    const delivered = expectOk(await server.documents.changeDocumentStatusAction({ documentId: id, to: "DELIVERED", confirm: true }));
    expect((await documentOf(id)).lines[0]?.deliveredQuantity).toBe(3);
    expect(await stockOf(server.prisma, perfumeId)).toBe(7);

    const data = expectOk(await revert(delivered.undo));
    expect(data).toMatchObject({ reversedPaymentIds: [], documents: [expect.objectContaining({ status: "CONFIRMED", deliveredAt: null })] });
    const after = await documentOf(id);
    expect(after.status).toBe("CONFIRMED");
    expect(after.confirmedAt).toEqual(before.confirmedAt);
    expect(after.deliveredAt).toBeNull();
    expect(after.lines.map((line) => line.deliveredQuantity)).toEqual([1]);
    expect(await stockOf(server.prisma, perfumeId)).toBe(9);
  });

  it("« Livrer et encaisser » puis Annuler ⇒ en plus, paiement contre-passé à sa date dans sa poche", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const { id, perfumeId } = await confirmedOrderPointedOneOfThree({ deposit: "60", pocketId: cash.id });
    const counts = await moneyCounts(server.prisma);

    const delivered = expectOk(
      await server.documents.deliverAndCollectAction({
        documentId: id,
        payment: { id: newId(), amount: "60", pocketId: cash.id },
        confirm: false,
      }),
    );
    expect(delivered.document).toMatchObject({ status: "DELIVERED", due: "0.00" });
    expect(await stockOf(server.prisma, perfumeId)).toBe(7);

    const data = expectOk(await revert(delivered.undo));
    expect(data.reversedPaymentIds).toEqual([delivered.payment.id]);
    const after = await documentOf(id);
    expect([after.status, after.deliveredAt]).toEqual(["CONFIRMED", null]);
    expect(after.lines.map((line) => line.deliveredQuantity)).toEqual([1]);
    expect(await stockOf(server.prisma, perfumeId)).toBe(9);
    expect(await viewBalance(server.prisma, id)).toMatchObject({ paid: "60.00", due: "60.00" });
    expect(await balanceOf(server.prisma, cash.id)).toBe("60.00");
    const payments = await paymentsOf(server.prisma, id);
    const reversal = payments.find((payment) => payment.movement.reversesId !== null);
    const original = payments.find((payment) => payment.id === delivered.payment.id);
    expect(reversal).toMatchObject({ kind: "REFUND" });
    expect(reversal?.movement).toMatchObject({ reversesId: original?.movementId, pocketId: cash.id, occurredAt: original?.movement.occurredAt });
    expect(await moneyCounts(server.prisma)).toMatchObject({ payments: counts.payments + 2, movements: counts.movements + 2 });
  });
});

describe("T4b — encaisser puis « Annuler »", () => {
  it("acompte qui a confirmé une commande en attente, puis Annuler ⇒ paiement contre-passé, PENDING, confirmedAt NULL", async () => {
    const id = await createDocument(server, { origin: "ORDER" });
    const deposit = expectOk(await server.payments.recordPaymentAction({ id: newId(), documentId: id, amount: "60", pocketId: null }));
    expect(deposit.document.status).toBe("CONFIRMED");

    const result = await revert(deposit.undo);
    expect(result).toMatchObject({ ok: true });
    expect(result.ok && result.notice).toBeUndefined();
    const doc = await documentOf(id);
    expect([doc.status, doc.confirmedAt]).toEqual(["PENDING", null]);
    expect(await viewBalance(server.prisma, id)).toMatchObject({ paid: "0.00", status: "PENDING" });
  });

  it("un autre paiement net subsiste ⇒ la commande reste confirmée et la notice le dit", async () => {
    const id = await createDocument(server, { origin: "ORDER" });
    // Commande revenue en attente avec un acompte conservé (réserve confirmée), puis nouvel acompte.
    expectOk(await server.payments.recordPaymentAction({ id: newId(), documentId: id, amount: "20", pocketId: null }));
    expectOk(await server.documents.changeDocumentStatusAction({ documentId: id, to: "PENDING", confirm: true }));
    const second = expectOk(await server.payments.recordPaymentAction({ id: newId(), documentId: id, amount: "30", pocketId: null }));
    expect(second.document.status).toBe("CONFIRMED");

    const result = await revert(second.undo);
    expect(result).toMatchObject({ ok: true, notice: "La commande reste confirmée : 100,00 € à encaisser." });
    const doc = await documentOf(id);
    expect(doc.status).toBe("CONFIRMED");
    expect(doc.confirmedAt).not.toBeNull();
    expect(await viewBalance(server.prisma, id)).toMatchObject({ paid: "20.00" });
  });

  it("solde sur une commande déjà confirmée ⇒ contre-passation seule, statut intact", async () => {
    const id = await createDocument(server, { origin: "ORDER", received: [{ amount: "20", pocketId: null }] });
    const confirmedAt = (await documentOf(id)).confirmedAt;
    const payment = expectOk(await server.payments.recordPaymentAction({ id: newId(), documentId: id, amount: "50", pocketId: null }));
    expectOk(await revert(payment.undo));
    const doc = await documentOf(id);
    expect([doc.status, doc.confirmedAt]).toEqual(["CONFIRMED", confirmedAt]);
    expect(await viewBalance(server.prisma, id)).toMatchObject({ paid: "20.00" });
  });
});

describe("T4b — refus", () => {
  it("document modifié entre le geste et l'annulation ⇒ CONFLICT, rien d'écrit", async () => {
    const id = await createDocument(server, { origin: "ORDER" });
    const deposit = expectOk(await server.payments.recordPaymentAction({ id: newId(), documentId: id, amount: "60", pocketId: null }));
    expectOk(await server.documents.updateDocumentAction({ documentId: id, notes: "Appeler avant de passer" }));
    const before = await documentOf(id);
    const counts = await moneyCounts(server.prisma);

    expect(expectError(await revert(deposit.undo), "CONFLICT").message).toBe(
      "Ce document a changé depuis ce geste : rien n'a été annulé. Corrige-le depuis sa fiche.",
    );
    expect(await documentOf(id)).toEqual(before);
    expect(await moneyCounts(server.prisma)).toEqual(counts);
  });

  it("un pointage ou un autre paiement depuis le geste ⇒ CONFLICT ; seconde annulation du même geste ⇒ CONFLICT", async () => {
    const { id } = await confirmedOrderPointedOneOfThree();
    const [line] = (await documentOf(id)).lines;

    const pointed = expectOk(await server.documents.changeDocumentStatusAction({ documentId: id, to: "DELIVERED", confirm: true }));
    expectOk(await server.documents.setLineDeliveredAction({ documentId: id, lineId: line!.id, deliveredQuantity: 2 }));
    expectError(await revert(pointed.undo), "CONFLICT");

    const payment = expectOk(await server.payments.recordPaymentAction({ id: newId(), documentId: id, amount: "10", pocketId: null }));
    expectOk(await server.payments.recordPaymentAction({ id: newId(), documentId: id, amount: "10", pocketId: null }));
    expectError(await revert(payment.undo), "CONFLICT");

    const third = expectOk(await server.payments.recordPaymentAction({ id: newId(), documentId: id, amount: "10", pocketId: null }));
    expectOk(await revert(third.undo));
    expectError(await revert(third.undo), "CONFLICT");
  });

  it("jeton altéré ou fabriqué ⇒ CONFLICT ; jeton trop ancien ⇒ CONFLICT « Trop tard »", async () => {
    const id = await createDocument(server, { origin: "ORDER" });
    const deposit = expectOk(await server.payments.recordPaymentAction({ id: newId(), documentId: id, amount: "60", pocketId: null }));
    const [body, mac] = (deposit.undo as string).split(".");
    const tampered = `${Buffer.from(Buffer.from(body!, "base64url").toString("utf8").replace('"PENDING"', '"DELIVERED"')).toString("base64url")}.${mac}`;

    const refused = "Ce geste ne peut plus être annulé d'ici : corrige-le depuis la fiche du document.";
    expect(expectError(await revert(tampered), "CONFLICT").message).toBe(refused);
    expect(expectError(await revert("n'importe quoi"), "CONFLICT").message).toBe(refused);
    expectError(await revert(null), "VALIDATION");

    const payload = server.documentsWriter.decodeRevertToken(deposit.undo as string, new Date());
    const old = server.documentsWriter.encodeRevertToken({
      ...payload,
      issuedAt: new Date(Date.now() - server.documentsWriter.REVERT_WINDOW_MS - 1000).toISOString(),
    });
    expect(expectError(await revert(old), "CONFLICT").message).toBe(
      "Trop tard pour annuler ce geste : corrige-le depuis la fiche du document.",
    );
    expect((await documentOf(id)).status).toBe("CONFIRMED");
  });

  it("paiement du geste rangé dans « Non attribué » vidé depuis ⇒ CONFLICT, rien d'écrit", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const id = await createDocument(server, { origin: "ORDER" });
    const deposit = expectOk(await server.payments.recordPaymentAction({ id: newId(), documentId: id, amount: "60", pocketId: null }));
    expectOk(await server.treasury.transferAction({ fromPocketId: null, toPocketId: cash.id, amount: "60" }));
    const counts = await moneyCounts(server.prisma);

    expectError(await revert(deposit.undo), "CONFLICT");
    expect(await moneyCounts(server.prisma)).toEqual(counts);
    expect((await documentOf(id)).status).toBe("CONFIRMED");
  });
});

describe("T4b — réactivation puis « Annuler »", () => {
  it("vente directe réactivée puis Annuler ⇒ de nouveau annulée, livré à 0, stock restitué", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 5 });
    const id = await createDocument(server, { origin: "DIRECT_SALE", lines: [catalogueLine(sauvage.id, { quantity: 2 })] });
    expectOk(await server.documents.cancelDocumentAction({ documentId: id, confirm: true }));
    const cancelled = await documentOf(id);

    const reactivated = expectOk(await server.documents.changeDocumentStatusAction({ documentId: id, to: "DELIVERED", confirm: true }));
    expect(await stockOf(server.prisma, sauvage.id)).toBe(3);
    expectOk(await revert(reactivated.undo));

    const doc = await documentOf(id);
    expect([doc.status, doc.cancelledAt, doc.confirmedAt, doc.deliveredAt]).toEqual(["CANCELLED", cancelled.cancelledAt, null, null]);
    expect(doc.lines.map((line) => line.deliveredQuantity)).toEqual([0]);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(5);
  });
});

describe("T4b — atomicité", () => {
  it("erreur injectée après la première écriture ⇒ paiement, statut, pointage et stock inchangés", async () => {
    const { id, perfumeId } = await confirmedOrderPointedOneOfThree({ deposit: "30" });
    const delivered = expectOk(
      await server.documents.deliverAndCollectAction({ documentId: id, payment: { id: newId(), amount: "90", pocketId: null } }),
    );
    const before = await documentOf(id);
    const counts = await moneyCounts(server.prisma);
    let written: string[] = [];

    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingAfterFirstWrite(tx);
        written = failing.written;
        return server.documentsWriter.revertDocumentChange(failing, delivered.undo as string);
      }),
    ).rejects.toThrow(INJECTED);

    expect(written).toEqual(["cashMovement.create"]);
    expect(await documentOf(id)).toEqual(before);
    expect(await moneyCounts(server.prisma)).toEqual(counts);
    expect(await stockOf(server.prisma, perfumeId)).toBe(7);
  });
});
