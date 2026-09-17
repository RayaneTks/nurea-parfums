import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { correctPaymentInput, voidPaymentInput } from "@/contracts/payments";
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
import { INJECTED, expectError, expectOk, failingAfterFirstWrite, freshStart, newId, seedPerfume } from "./support/harness";

/**
 * T8 (03 §4.3, §4.4 ; 07 J6) : annuler un paiement (contre-passation même poche, même date de valeur, montant
 * opposé ; seconde annulation refusée ; annuler un remboursement = paiement d'entrée ; statut inchangé),
 * corriger (annuler + nouveau en une transaction), rembourser (plafond au payé ou au trop-perçu), atomicité.
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

async function paid(documentId: string, amount: string, pocketId: string | null, occurredAt?: Date) {
  const data = expectOk(
    await server.payments.recordPaymentAction({
      id: newId(),
      documentId,
      amount,
      pocketId,
      occurredAt: occurredAt?.toISOString(),
    }),
  );
  return data.payment;
}

const statusOf = async (id: string) => (await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } })).status;

describe("T8 — annuler un paiement", () => {
  it("contre-passation : même poche, même date de valeur, montant opposé ; REFUND ; statut inchangé", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const id = await createDocument(server, { origin: "ORDER" });
    const lastWeek = new Date(Date.now() - 7 * DAY);
    const deposit = await paid(id, "40", cash.id, lastWeek);
    expect(await statusOf(id)).toBe("CONFIRMED");

    const data = expectOk(await server.payments.voidPaymentAction({ paymentId: deposit.id }));

    expect(data.voidedPaymentId).toBe(deposit.id);
    expect(data.payment).toMatchObject({
      kind: "REFUND",
      amount: "-40.00",
      pocketId: cash.id,
      occurredAt: lastWeek.toISOString(),
      reversesPaymentId: deposit.id,
    });
    expect(data.document).toMatchObject({ status: "CONFIRMED", paid: "0.00", due: "120.00" });
    const [original, reversal] = await paymentsOf(server.prisma, id);
    expect(reversal?.movement).toMatchObject({ reversesId: original?.movementId, pocketId: cash.id, kind: "PAYMENT" });
    expect(reversal?.movement.occurredAt).toEqual(original?.movement.occurredAt);
    expect(reversal?.movement.amount.toFixed(2)).toBe("-40.00");
    expect(await balanceOf(server.prisma, cash.id)).toBe("0.00");
    expect(await statusOf(id)).toBe("CONFIRMED");
  });

  it("seconde annulation du même paiement ⇒ CONFLICT « Ce mouvement a déjà été annulé. » ; une annulation ne s'annule pas", async () => {
    const id = await createDocument(server, { origin: "DIRECT_SALE" });
    const payment = await paid(id, "50", null);
    const reversal = expectOk(await server.payments.voidPaymentAction({ paymentId: payment.id })).payment;
    const before = await moneyCounts(server.prisma);

    expect(expectError(await server.payments.voidPaymentAction({ paymentId: payment.id }), "CONFLICT").message).toBe(
      "Ce mouvement a déjà été annulé.",
    );
    expect(expectError(await server.payments.voidPaymentAction({ paymentId: reversal.id }), "CONFLICT").message).toBe(
      "Ce paiement annule déjà un autre paiement : il ne s'annule pas lui-même.",
    );
    expect(await moneyCounts(server.prisma)).toEqual(before);
  });

  it("annuler un remboursement ⇒ paiement d'entrée positif qui contre-passe le REFUND : DEPOSIT (non livré), BALANCE (livré)", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });

    // Non livré : commande annulée, acompte remboursé.
    const order = await createDocument(server, { origin: "ORDER" });
    await paid(order, "60", cash.id);
    const cancelled = expectOk(
      await server.documents.cancelDocumentAction({ documentId: order, refunds: [{ id: newId(), amount: "60", pocketId: cash.id }] }),
    );
    const refund = cancelled.refunds[0]!;
    const undone = expectOk(await server.payments.voidPaymentAction({ paymentId: refund.id }));
    expect(undone.payment).toMatchObject({ kind: "DEPOSIT", amount: "60.00", reversesPaymentId: refund.id });
    expect(undone.document).toMatchObject({ status: "CANCELLED", paid: "60.00" });

    // Livré : trop-perçu d'une vente (prix baissé après paiement), remboursé puis remboursement annulé.
    const perfume = await seedPerfume(server.prisma, { name: "Bleu" });
    const sale = await createDocument(server, {
      origin: "DIRECT_SALE",
      lines: [catalogueLine(perfume.id)],
      received: [{ amount: "120", pocketId: cash.id }],
    });
    const [line] = await server.prisma.saleLine.findMany({ where: { documentId: sale } });
    expectOk(
      await server.documents.updateDocumentAction({
        documentId: sale,
        lines: [{ id: line!.id, volumeMl: 50, quantity: 1, unitPriceEur: "100" }],
        confirm: true,
      }),
    );
    const overpaid = expectOk(await server.payments.refundAction({ id: newId(), documentId: sale, amount: "20", pocketId: cash.id }));
    expect(overpaid.payment).toMatchObject({ kind: "REFUND", amount: "-20.00" });
    const balance = expectOk(await server.payments.voidPaymentAction({ paymentId: overpaid.payment.id }));
    expect(balance.payment).toMatchObject({ kind: "BALANCE", amount: "20.00" });
    expect(balance.document).toMatchObject({ status: "DELIVERED", paid: "120.00", due: "0.00" });
    expect(await viewBalance(server.prisma, sale)).toMatchObject({ paid: "120.00" });
  });

  it("annuler une entrée rangée dans « Non attribué » vidé depuis ⇒ CONFLICT, rien d'écrit", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const id = await createDocument(server, { origin: "DIRECT_SALE" });
    const payment = await paid(id, "50", null);
    expectOk(await server.treasury.transferAction({ fromPocketId: null, toPocketId: cash.id, amount: "50" }));
    const before = await moneyCounts(server.prisma);

    expect(expectError(await server.payments.voidPaymentAction({ paymentId: payment.id }), "CONFLICT").message).toBe(
      "« Non attribué » ne contient que 0,00 € : il ne passe jamais sous zéro. Choisis une autre poche ou un montant plus petit.",
    );
    expect(await moneyCounts(server.prisma)).toEqual(before);
  });

  it("paiement inconnu ⇒ NOT_FOUND ; identifiant repris (`mig-…`) accepté par le contrat", async () => {
    expectError(await server.payments.voidPaymentAction({ paymentId: newId() }), "NOT_FOUND");
    expectError(await server.payments.voidPaymentAction({ paymentId: "mig-vente-cm0abc123def456ghi789jkl0" }), "NOT_FOUND");
    expectError(await server.payments.voidPaymentAction({ paymentId: "Robert'); DROP" }), "VALIDATION");
  });
});

describe("T8 — corriger", () => {
  it("une transaction : ancien contre-passé à SA date, nouveau à la date saisie, dans la poche choisie, même nature", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const bank = await seedPocket(server.prisma, { name: "Banque", kind: "BANK" });
    const id = await createDocument(server, { origin: "ORDER" });
    const tenDaysAgo = new Date(Date.now() - 10 * DAY);
    const twoDaysAgo = new Date(Date.now() - 2 * DAY);
    const original = await paid(id, "80", cash.id, tenDaysAgo);

    const newPaymentId = newId();
    const data = expectOk(
      await server.payments.correctPaymentAction({
        paymentId: original.id,
        newPaymentId,
        amount: "50",
        pocketId: bank.id,
        occurredAt: twoDaysAgo.toISOString(),
      }),
    );

    expect(data.reversal).toMatchObject({ kind: "REFUND", amount: "-80.00", pocketId: cash.id, occurredAt: tenDaysAgo.toISOString() });
    expect(data.payment).toMatchObject({ id: newPaymentId, kind: "DEPOSIT", amount: "50.00", pocketId: bank.id, occurredAt: twoDaysAgo.toISOString() });
    expect(data.document).toMatchObject({ paid: "50.00", due: "70.00", status: "CONFIRMED" });
    expect(await balanceOf(server.prisma, cash.id)).toBe("0.00");
    expect(await balanceOf(server.prisma, bank.id)).toBe("50.00");
    expect((await paymentsOf(server.prisma, id)).length).toBe(3);

    // Renvoi : même réponse, rien de plus.
    const again = expectOk(
      await server.payments.correctPaymentAction({ paymentId: original.id, newPaymentId, amount: "50", pocketId: bank.id }),
    );
    expect(again.payment).toEqual(data.payment);
    expect(again.reversal).toEqual(data.reversal);
    expect((await paymentsOf(server.prisma, id)).length).toBe(3);
  });

  it("seuls le moyen ou la note changent : modifiés en place, aucun mouvement ; rien ne change : aucune écriture", async () => {
    const id = await createDocument(server, { origin: "DIRECT_SALE" });
    const original = await paid(id, "80", null);
    const before = await moneyCounts(server.prisma);

    const data = expectOk(
      await server.payments.correctPaymentAction({ paymentId: original.id, newPaymentId: newId(), amount: "80", method: "Virement" }),
    );
    expect(data).toMatchObject({ reversal: null, payment: { id: original.id, method: "Virement", amount: "80.00" } });
    expect(await moneyCounts(server.prisma)).toEqual(before);

    const unchanged = expectOk(
      await server.payments.correctPaymentAction({ paymentId: original.id, newPaymentId: newId(), amount: "80,00" }),
    );
    expect(unchanged.payment).toMatchObject({ id: original.id, method: "Virement" });
    expect(await moneyCounts(server.prisma)).toEqual(before);
  });

  it("nouveau montant au-delà du dû (lu après contre-passation) ⇒ CONFLICT, rien d'écrit ; paiement annulé ⇒ CONFLICT", async () => {
    const id = await createDocument(server, { origin: "DIRECT_SALE" });
    const first = await paid(id, "80", null);
    await paid(id, "30", null);
    const before = await moneyCounts(server.prisma);

    expect(
      expectError(
        await server.payments.correctPaymentAction({ paymentId: first.id, newPaymentId: newId(), amount: "95" }),
        "CONFLICT",
      ).message,
    ).toBe("Le montant dépasse le reste dû (90,00 €).");
    expect(await moneyCounts(server.prisma)).toEqual(before);

    expectOk(await server.payments.correctPaymentAction({ paymentId: first.id, newPaymentId: newId(), amount: "90" }));
    expect(await viewBalance(server.prisma, id)).toMatchObject({ paid: "120.00", due: "0.00" });
    expect(
      expectError(await server.payments.correctPaymentAction({ paymentId: first.id, newPaymentId: newId(), amount: "70" }), "CONFLICT")
        .message,
    ).toBe("Ce mouvement a déjà été annulé.");
  });

  it("date future ⇒ VALIDATION", async () => {
    const id = await createDocument(server, { origin: "DIRECT_SALE" });
    const original = await paid(id, "80", null);
    const refused = expectError(
      await server.payments.correctPaymentAction({
        paymentId: original.id,
        newPaymentId: newId(),
        amount: "70",
        occurredAt: new Date(Date.now() + 3 * DAY).toISOString(),
      }),
      "VALIDATION",
    );
    expect(refused.fields).toEqual({ occurredAt: "Choisis une date passée : un paiement ne se date pas dans le futur." });
  });
});

describe("T8 — rembourser", () => {
  it("document annulé : plafond au payé net, sortie datée du jour", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const id = await createDocument(server, { origin: "ORDER" });
    await paid(id, "60", cash.id);
    expectOk(await server.documents.cancelDocumentAction({ documentId: id }));

    expect(
      expectError(await server.payments.refundAction({ id: newId(), documentId: id, amount: "61", pocketId: cash.id }), "CONFLICT")
        .message,
    ).toBe("Le montant dépasse ce qui peut être remboursé (60,00 €).");

    const before = Date.now();
    const data = expectOk(await server.payments.refundAction({ id: newId(), documentId: id, amount: "20", pocketId: cash.id, note: "Geste" }));
    expect(data.payment).toMatchObject({ kind: "REFUND", amount: "-20.00", note: "Geste", reversesPaymentId: null });
    expect(new Date(data.payment.occurredAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(data.document).toMatchObject({ status: "CANCELLED", paid: "40.00" });
    expect(await balanceOf(server.prisma, cash.id)).toBe("40.00");
  });

  it("document engagé : plafond au trop-perçu (0 s'il n'y en a pas)", async () => {
    const id = await createDocument(server, { origin: "DIRECT_SALE", received: [{ amount: "120", pocketId: null }] });
    expect(
      expectError(await server.payments.refundAction({ id: newId(), documentId: id, amount: "1", pocketId: null }), "CONFLICT").message,
    ).toBe("Le montant dépasse ce qui peut être remboursé (0,00 €).");
  });

  it("renvoi du même identifiant : un remboursement", async () => {
    const id = await createDocument(server, { origin: "ORDER" });
    await paid(id, "60", null);
    expectOk(await server.documents.cancelDocumentAction({ documentId: id }));
    const input = { id: newId(), documentId: id, amount: "10", pocketId: null };
    const first = expectOk(await server.payments.refundAction(input));
    expect(expectOk(await server.payments.refundAction(input)).payment).toEqual(first.payment);
    expect((await paymentsOf(server.prisma, id)).length).toBe(2);
  });
});

describe("T8 — atomicité", () => {
  it("annuler : erreur injectée après la première écriture ⇒ ni contre-passation ni pièce", async () => {
    const id = await createDocument(server, { origin: "DIRECT_SALE" });
    const payment = await paid(id, "50", null);
    const before = await moneyCounts(server.prisma);
    let written: string[] = [];
    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingAfterFirstWrite(tx);
        written = failing.written;
        return server.paymentsWriter.voidPayment(failing, voidPaymentInput.parse({ paymentId: payment.id }));
      }),
    ).rejects.toThrow(INJECTED);
    expect(written).toEqual(["cashMovement.create"]);
    expect(await moneyCounts(server.prisma)).toEqual(before);
  });

  it("corriger : erreur injectée après la première écriture ⇒ l'ancien paiement vaut toujours", async () => {
    const id = await createDocument(server, { origin: "DIRECT_SALE" });
    const payment = await paid(id, "50", null);
    const before = await moneyCounts(server.prisma);
    await expect(
      server.inTransaction(async (tx) =>
        server.paymentsWriter.correctPayment(
          failingAfterFirstWrite(tx),
          correctPaymentInput.parse({ paymentId: payment.id, newPaymentId: newId(), amount: "40" }),
        ),
      ),
    ).rejects.toThrow(INJECTED);
    expect(await moneyCounts(server.prisma)).toEqual(before);
    expect(await viewBalance(server.prisma, id)).toMatchObject({ paid: "50.00" });
  });
});
