import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { recordPaymentInput } from "@/contracts/payments";
import { eurFromWire, formatEur, type MoneyString } from "@/domain/money";
import {
  balanceOf,
  catalogueLine,
  createDocument,
  defaultPocketId,
  expectInvariants,
  loadMoneyServer,
  moneyCounts,
  paymentsOf,
  seedPocket,
  seedSystemPocket,
  viewBalance,
  type MoneyServer,
} from "./support/argent";
import { INJECTED, expectError, expectOk, failingAfterFirstWrite, freshStart, newId, seedPerfume } from "./support/harness";

/**
 * T7 (03 §4.3 ; 07 J6) : `recordPaymentAction` — nature fixée par le serveur, plafond au reste dû
 * (« Le montant dépasse le reste dû (xx,xx €). »), confirmation automatique d'une commande en attente
 * seulement sur un verdict sans réserve, poche mémorisée (N2), date de valeur jamais dans le futur,
 * idempotence, jeton d'annulation, atomicité.
 */

const cache = vi.hoisted(() => ({ calls: [] as string[] }));
const cookieJar = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  updateTag: (tag: string) => void cache.calls.push(`updateTag:${tag}`),
  revalidateTag: (tag: string) => void cache.calls.push(`revalidateTag:${tag}`),
  revalidatePath: (path: string) => void cache.calls.push(`revalidatePath:${path}`),
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
  cache.calls.length = 0;
});

afterEach(async () => {
  await expectInvariants(server.prisma);
});

const pay = (documentId: string, amount: string, pocketId: string | null, extra: Record<string, unknown> = {}) =>
  server.payments.recordPaymentAction({ id: newId(), documentId, amount, pocketId, ...extra });

const eurText = (wire: string) => formatEur(eurFromWire(wire as MoneyString));

describe("T7 — nominal", () => {
  it("acompte sur une commande confirmée : DEPOSIT, mouvement PAYMENT positif dans la poche, dû réduit", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const id = await createDocument(server, { origin: "ORDER" });
    expectOk(await server.documents.changeDocumentStatusAction({ documentId: id, to: "CONFIRMED", confirm: true }));

    const data = expectOk(await pay(id, "50", cash.id, { method: "Espèces", note: "Remis en main propre" }));

    expect(data.payment).toMatchObject({ documentId: id, kind: "DEPOSIT", amount: "50.00", pocketId: cash.id, method: "Espèces" });
    expect(data.document).toMatchObject({ status: "CONFIRMED", total: "120.00", paid: "50.00", due: "70.00" });
    expect(typeof data.undo).toBe("string");
    const [payment] = await paymentsOf(server.prisma, id);
    expect(payment?.movement).toMatchObject({ kind: "PAYMENT", pocketId: cash.id, reversesId: null });
    expect(payment?.movement.amount.toFixed(2)).toBe("50.00");
    expect(await viewBalance(server.prisma, id)).toMatchObject({ paid: "50.00", due: "70.00" });
    expect(await balanceOf(server.prisma, cash.id)).toBe("50.00");
    // N2 : la poche choisie devient la poche proposée.
    expect(await defaultPocketId(server.prisma)).toBe(cash.id);
    expect(cache.calls).toContain("updateTag:gestion");
  });

  it("solde sur une vente livrée : BALANCE ; « Non attribué » créée au besoin et mémorisée comme NULL", async () => {
    const id = await createDocument(server, { origin: "DIRECT_SALE" });
    const data = expectOk(await pay(id, "120", null));
    expect(data.payment.kind).toBe("BALANCE");
    expect(data.document).toMatchObject({ status: "DELIVERED", paid: "120.00", due: "0.00" });
    const system = await server.prisma.pocket.findFirstOrThrow({ where: { isSystem: true } });
    expect(data.payment.pocketId).toBe(system.id);
    expect(await balanceOf(server.prisma, system.id)).toBe("120.00");
    expect(await defaultPocketId(server.prisma)).toBeNull();
  });

  it("date de valeur : « hier » retenue ; jour futur ⇒ VALIDATION sans rien écrire", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const id = await createDocument(server, { origin: "DIRECT_SALE" });
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
    const data = expectOk(await pay(id, "20", cash.id, { occurredAt: yesterday.toISOString() }));
    expect(data.payment.occurredAt).toBe(yesterday.toISOString());

    const before = await moneyCounts(server.prisma);
    const tomorrow = new Date(Date.now() + 2 * 24 * 3600 * 1000);
    const refused = expectError(await pay(id, "20", cash.id, { occurredAt: tomorrow.toISOString() }), "VALIDATION");
    expect(refused.fields).toEqual({ occurredAt: "Choisis une date passée : un paiement ne se date pas dans le futur." });
    expect(await moneyCounts(server.prisma)).toEqual(before);
  });
});

describe("T7 — plafond au reste dû", () => {
  it("encaisser plus que le dû ⇒ CONFLICT « Le montant dépasse le reste dû (xx,xx €). », rien d'écrit", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const id = await createDocument(server, { origin: "DIRECT_SALE" });

    const first = expectError(await pay(id, "120,01", cash.id), "CONFLICT");
    expect(first.message).toBe(`Le montant dépasse le reste dû (${eurText("120.00")}).`);
    expect(first.message).toBe("Le montant dépasse le reste dû (120,00 €).");

    expectOk(await pay(id, "100", cash.id));
    const second = expectError(await pay(id, "30", cash.id), "CONFLICT");
    expect(second.message).toBe("Le montant dépasse le reste dû (20,00 €).");
    expect((await paymentsOf(server.prisma, id)).length).toBe(1);
    expect(await balanceOf(server.prisma, cash.id)).toBe("100.00");

    expectOk(await pay(id, "20", cash.id));
    expect(expectError(await pay(id, "0,01", cash.id), "CONFLICT").message).toBe("Le montant dépasse le reste dû (0,00 €).");
  });

  it("le plafond vaut aussi pour une commande en attente (total − payé)", async () => {
    const id = await createDocument(server, { origin: "ORDER" });
    expect(expectError(await pay(id, "121", null), "CONFLICT").message).toBe("Le montant dépasse le reste dû (120,00 €).");
    expect((await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } })).status).toBe("PENDING");
  });

  it("montant nul, négatif ou illisible ⇒ VALIDATION du contrat", async () => {
    const id = await createDocument(server, { origin: "DIRECT_SALE" });
    for (const amount of ["0", "-5", "douze", "12,345"]) {
      const error = expectError(await pay(id, amount, null), "VALIDATION");
      expect(Object.keys(error.fields ?? {})).toEqual(["amount"]);
    }
  });
});

describe("T7 — confirmation automatique (03 §2.3)", () => {
  it("acompte sur une commande en attente, sans réserve ⇒ CONFIRMED et confirmedAt posé", async () => {
    const id = await createDocument(server, { origin: "ORDER" });
    const data = expectOk(await pay(id, "40", null));
    expect(data.payment.kind).toBe("DEPOSIT");
    const doc = await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } });
    expect(doc.status).toBe("CONFIRMED");
    expect(doc.confirmedAt).not.toBeNull();
    expect(data.document.confirmedAt).toBe(doc.confirmedAt?.toISOString());
  });

  it("avec réserve ⇒ statut inchangé (payé net resté ≤ 0 : remboursement repris supérieur à l'acompte)", async () => {
    const id = await createDocument(server, { origin: "ORDER" });
    // Donnée reprise (03 §7) : un remboursement historique de 100 € sans acompte en face.
    const system = await seedSystemPocket(server.prisma, "500");
    await server.prisma.$transaction(async (t) => {
      const movement = await t.cashMovement.create({ data: { pocketId: system.id, amount: "-100.00", kind: "PAYMENT" } });
      await t.payment.create({ data: { documentId: id, kind: "REFUND", movementId: movement.id } });
    });

    const data = expectOk(await pay(id, "40", system.id));
    expect(data.document).toMatchObject({ status: "PENDING", paid: "-60.00", confirmedAt: null });
  });

  it("commande déjà confirmée : le statut ne bouge pas, confirmedAt conservé", async () => {
    const id = await createDocument(server, { origin: "ORDER" });
    expectOk(await pay(id, "40", null));
    const confirmedAt = (await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } })).confirmedAt;
    expectOk(await pay(id, "40", null));
    expect((await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } })).confirmedAt).toEqual(confirmedAt);
  });
});

describe("T7 — gardes", () => {
  it("document annulé ⇒ CONFLICT ; document ou poche disparus ⇒ NOT_FOUND ; poche archivée ⇒ CONFLICT", async () => {
    const perfume = await seedPerfume(server.prisma);
    const id = await createDocument(server, { origin: "ORDER", lines: [catalogueLine(perfume.id)] });
    expectOk(await server.documents.cancelDocumentAction({ documentId: id }));
    expect(expectError(await pay(id, "10", null), "CONFLICT").message).toBe(
      "Cette commande est annulée : réactive-la avant d'encaisser.",
    );

    const other = await createDocument(server, { origin: "DIRECT_SALE", perfumeId: perfume.id });
    expectError(await pay(newId(), "10", null), "NOT_FOUND");
    expectError(await pay(other, "10", "c123456789012345678901234"), "NOT_FOUND");

    const archived = await seedPocket(server.prisma, { name: "Ancienne caisse", archived: true });
    expect(expectError(await pay(other, "10", archived.id), "CONFLICT").message).toBe(
      "La poche « Ancienne caisse » est archivée : aucun mouvement ne peut plus y entrer ni en sortir.",
    );
    expect(await server.prisma.payment.count()).toBe(0);
  });
});

describe("T7 — idempotence (04 §3.6)", () => {
  it("renvoi du même identifiant : un paiement, deux succès, pas de second jeton", async () => {
    const id = await createDocument(server, { origin: "DIRECT_SALE" });
    const input = { id: newId(), documentId: id, amount: "60", pocketId: null };
    const first = expectOk(await server.payments.recordPaymentAction(input));
    const again = expectOk(await server.payments.recordPaymentAction(input));
    expect(again.payment).toEqual(first.payment);
    expect(again.undo).toBeNull();
    expect(await server.prisma.payment.count()).toBe(1);
    expect(await viewBalance(server.prisma, id)).toMatchObject({ paid: "60.00" });
  });
});

describe("T7 — atomicité", () => {
  it("erreur injectée après la première écriture ⇒ ni mouvement, ni paiement, ni confirmation, ni réglage", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const id = await createDocument(server, { origin: "ORDER" });
    const before = await moneyCounts(server.prisma);
    const input = recordPaymentInput.parse({ id: newId(), documentId: id, amount: "40", pocketId: cash.id });
    let written: string[] = [];

    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingAfterFirstWrite(tx);
        written = failing.written;
        return server.documentsWriter.recordPayment(failing, input);
      }),
    ).rejects.toThrow(INJECTED);

    expect(written).toEqual(["cashMovement.create"]);
    expect(await moneyCounts(server.prisma)).toEqual(before);
    expect((await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } })).status).toBe("PENDING");
    expect(await defaultPocketId(server.prisma)).toBeNull();
  });
});
