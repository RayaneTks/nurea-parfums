import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { recordPaymentInput } from "@/contracts/payments";
import { transferInput } from "@/contracts/treasury";
import {
  balanceOf,
  createDocument,
  expectInvariants,
  loadMoneyServer,
  seedPocket,
  seedSystemPocket,
  viewBalance,
  type MoneyServer,
} from "./transactions/support/argent";
import { expectOk, freshStart, newId } from "./transactions/support/harness";

/**
 * Concurrence sur un vrai PostgreSQL (04 §3.6, §4.2, §16.3 ; 07 J6). Chaque scénario tient la première
 * transaction ouverte APRÈS ses écritures, attend que la seconde soit réellement bloquée sur un verrou
 * (`pg_stat_activity`), puis la libère : la sérialisation par les verrous est prouvée, pas supposée.
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

function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => (open = resolve));
  return { open, opened };
}

/** Attend qu'une session de la base de test attende un verrou (au plus 10 s). */
async function someoneWaitsForALock(): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const [row] = await server.prisma.$queryRawUnsafe<{ waiting: number }[]>(
      `SELECT count(*)::int AS waiting FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'`,
    );
    if ((row?.waiting ?? 0) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Aucune transaction n'a attendu de verrou : le scénario ne prouve pas la concurrence.");
}

/**
 * Lance `first` dans une transaction qu'on garde ouverte après ses écritures ; lance `second` dès que `first`
 * a écrit ; ne laisse `first` valider qu'une fois `second` bloquée. Rend les deux issues.
 */
async function overlapping<A, B>(first: (tx: Parameters<Parameters<MoneyServer["inTransaction"]>[0]>[0]) => Promise<A>, second: () => Promise<B>) {
  const written = gate();
  const release = gate();
  const firstDone = server.inTransaction(async (tx) => {
    const result = await first(tx);
    written.open();
    await release.opened;
    return result;
  });
  await written.opened;
  const secondDone = second();
  await someoneWaitsForALock();
  release.open();
  return { first: await firstDone, second: await secondDone };
}

describe("encaissements concurrents (T7)", () => {
  it("deux encaissements simultanés dépassant ensemble le dû ⇒ un succès, un CONFLICT ; jamais de trop-perçu", async () => {
    // Poche déjà là : la seconde transaction attend sur le verrou du document, pas sur la création de la poche.
    await seedSystemPocket(server.prisma);
    const id = await createDocument(server, { origin: "DIRECT_SALE" });
    const { first, second } = await overlapping(
      (tx) => server.documentsWriter.recordPayment(tx, recordPaymentInput.parse({ id: newId(), documentId: id, amount: "70", pocketId: null })),
      () => server.payments.recordPaymentAction({ id: newId(), documentId: id, amount: "70", pocketId: null }),
    );
    expect(first.document.paid).toBe("70.00");
    expect(second).toMatchObject({ ok: false, error: { code: "CONFLICT", message: "Le montant dépasse le reste dû (50,00 €)." } });
    expect(await viewBalance(server.prisma, id)).toMatchObject({ paid: "70.00", due: "50.00" });
  });

  it("deux encaissements lancés ensemble par l'écran (même poche, sans contrôle d'ordre) ⇒ un succès, un CONFLICT", async () => {
    const id = await createDocument(server, { origin: "DIRECT_SALE" });
    const results = await Promise.all([
      server.payments.recordPaymentAction({ id: newId(), documentId: id, amount: "100", pocketId: null }),
      server.payments.recordPaymentAction({ id: newId(), documentId: id, amount: "100", pocketId: null }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok).map((result) => !result.ok && result.error.code)).toEqual(["CONFLICT"]);
    expect(await server.prisma.payment.count()).toBe(1);
  });

  it("double envoi du même identifiant de paiement ⇒ une ligne, deux succès", async () => {
    await seedSystemPocket(server.prisma);
    const id = await createDocument(server, { origin: "DIRECT_SALE" });
    const input = { id: newId(), documentId: id, amount: "120", pocketId: null };
    const { first, second } = await overlapping(
      (tx) => server.documentsWriter.recordPayment(tx, recordPaymentInput.parse(input)),
      () => server.payments.recordPaymentAction(input),
    );
    expect(first.payment.id).toBe(input.id);
    expect(second).toMatchObject({ ok: true, data: { payment: { id: input.id, amount: "120.00" }, undo: null } });
    expect(await server.prisma.payment.count()).toBe(1);
    expect(await server.prisma.cashMovement.count()).toBe(1);

    const again = await Promise.all([server.payments.recordPaymentAction(input), server.payments.recordPaymentAction(input)]);
    expect(again.map((result) => result.ok)).toEqual([true, true]);
    expect(await server.prisma.payment.count()).toBe(1);
  });
});

describe("sorties concurrentes de « Non attribué »", () => {
  it("deux transferts concurrents depuis « Non attribué » ⇒ un succès, un CONFLICT ; jamais sous zéro", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const bank = await seedPocket(server.prisma, { name: "Banque" });
    const system = await seedSystemPocket(server.prisma, "100");
    const { first, second } = await overlapping(
      (tx) => server.treasuryWriter.transfer(tx, transferInput.parse({ fromPocketId: null, toPocketId: cash.id, amount: "60" })),
      () => server.treasury.transferAction({ fromPocketId: null, toPocketId: bank.id, amount: "60" }),
    );
    expect(first.from.balance).toBe("40.00");
    expect(second).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(await balanceOf(server.prisma, system.id)).toBe("40.00");

    const results = await Promise.all([
      server.treasury.transferAction({ fromPocketId: null, toPocketId: cash.id, amount: "30" }),
      server.treasury.transferAction({ fromPocketId: null, toPocketId: bank.id, amount: "30" }),
    ]);
    expect(results.map((result) => result.ok).sort()).toEqual([false, true]);
    expect(await balanceOf(server.prisma, system.id)).toBe("10.00");
  });

  it("deux annulations concurrentes du même paiement ⇒ un succès, un CONFLICT « Ce mouvement a déjà été annulé. »", async () => {
    const id = await createDocument(server, { origin: "DIRECT_SALE", received: [{ amount: "120", pocketId: null }] });
    const payment = await server.prisma.payment.findFirstOrThrow({ where: { documentId: id } });
    const { first, second } = await overlapping(
      (tx) => server.paymentsWriter.voidPayment(tx, { paymentId: payment.id }),
      () => server.payments.voidPaymentAction({ paymentId: payment.id }),
    );
    expect(first.voidedPaymentId).toBe(payment.id);
    expect(second).toMatchObject({ ok: false, error: { code: "CONFLICT", message: "Ce mouvement a déjà été annulé." } });
    expect(await viewBalance(server.prisma, id)).toMatchObject({ paid: "0.00" });
  });

  it("archiver une poche pendant qu'un paiement y entre : l'archivage attend et voit le solde non nul", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const id = await createDocument(server, { origin: "DIRECT_SALE" });
    const { first, second } = await overlapping(
      (tx) => server.documentsWriter.recordPayment(tx, recordPaymentInput.parse({ id: newId(), documentId: id, amount: "10", pocketId: cash.id })),
      () => server.treasury.archivePocketAction({ id: cash.id }),
    );
    expect(first.payment.pocketId).toBe(cash.id);
    expect(second).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect((await server.prisma.pocket.findUniqueOrThrow({ where: { id: cash.id } })).archived).toBe(false);
    expectOk(await server.treasury.transferAction({ fromPocketId: cash.id, toPocketId: (await seedPocket(server.prisma, { name: "Banque" })).id, amount: "10" }));
  });
});
