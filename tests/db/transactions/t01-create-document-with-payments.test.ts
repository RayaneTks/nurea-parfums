import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SALE_NAME_REQUIRED_MESSAGE, createDocumentInput, type CreateDocumentInput } from "@/contracts/documents";
import {
  INJECTED_ON,
  balanceOf,
  catalogueLine,
  defaultPocketId,
  expectInvariants,
  failingOn,
  loadMoneyServer,
  moneyCounts,
  paymentsOf,
  seedPocket,
  viewBalance,
  type MoneyServer,
} from "./support/argent";
import {
  INJECTED,
  counts,
  expectError,
  expectOk,
  failingAfterFirstWrite,
  freshStart,
  newId,
  seedPerfume,
  stockOf,
} from "./support/harness";

/**
 * T1 avec paiements (03 §4.3 ; 02 §5 N1, N2 ; 06 E11 zone 8, S08 ; 07 J6) : « Reçu maintenant » d'une vente,
 * acompte d'une commande (née confirmée), plusieurs poches, Σ ≤ total, nom exigé pour ce qui reste à
 * encaisser, poche mémorisée, idempotence, atomicité.
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

type Input = CreateDocumentInput;

const document = (overrides: Partial<Input> & { lines: Input["lines"] }): Input => ({
  id: newId(),
  origin: "DIRECT_SALE",
  customer: { kind: "passing", name: "Fares" },
  ...overrides,
});

describe("T1 — « Reçu maintenant » (N1)", () => {
  it("vente payée en entier : livrée, soldée, un paiement BALANCE daté de la vente, poche créditée et mémorisée", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const sauvage = await seedPerfume(server.prisma, { stock: 5 });
    const paymentId = newId();
    const input = document({ lines: [catalogueLine(sauvage.id, { quantity: 2 })], payments: [{ id: paymentId, amount: "240", pocketId: cash.id }] });

    const data = expectOk(await server.documents.createDocumentAction(input));

    expect(data).toEqual({ id: input.id, origin: "DIRECT_SALE", status: "DELIVERED", total: "240.00", paid: "240.00", due: "0.00" });
    const doc = await server.prisma.saleDocument.findUniqueOrThrow({ where: { id: input.id } });
    const [payment] = await paymentsOf(server.prisma, input.id);
    expect(payment).toMatchObject({ id: paymentId, kind: "BALANCE" });
    expect(payment?.movement).toMatchObject({ kind: "PAYMENT", pocketId: cash.id, reversesId: null });
    expect(payment?.movement.amount.toFixed(2)).toBe("240.00");
    expect(payment?.movement.occurredAt).toEqual(doc.confirmedAt);
    expect(await balanceOf(server.prisma, cash.id)).toBe("240.00");
    expect(await stockOf(server.prisma, sauvage.id)).toBe(3);
    expect(await defaultPocketId(server.prisma)).toBe(cash.id);
    expect(await viewBalance(server.prisma, input.id)).toMatchObject({ total: "240.00", paid: "240.00", due: "0.00" });
  });

  it("vente à crédit : le dû dérive du ledger ; un nom est exigé pour ce qui reste à encaisser", async () => {
    const perfume = await seedPerfume(server.prisma);
    const anonymous = document({
      customer: { kind: "passing" },
      lines: [catalogueLine(perfume.id)],
      payments: [{ id: newId(), amount: "50", pocketId: null }],
    });
    expect(expectError(await server.documents.createDocumentAction(anonymous), "VALIDATION").fields).toEqual({
      customer: "Choisis le client : il faut un nom pour suivre les 70,00 € à encaisser.",
    });
    expect(await counts(server.prisma)).toMatchObject({ documents: 0 });

    // Payée en entier, elle exige un nom aussi : chaque vente se range sur une fiche (amendé le 24/09/2026).
    const paid = await server.documents.createDocumentAction({ ...anonymous, payments: [{ id: newId(), amount: "120", pocketId: null }] });
    expect(expectError(paid, "VALIDATION").fields).toEqual({ customer: SALE_NAME_REQUIRED_MESSAGE });

    const credit = document({ lines: [catalogueLine(perfume.id)], payments: [{ id: newId(), amount: "50", pocketId: null }] });
    expect(expectOk(await server.documents.createDocumentAction(credit))).toMatchObject({ status: "DELIVERED", paid: "50.00", due: "70.00" });
    expect(await viewBalance(server.prisma, credit.id)).toMatchObject({ due: "70.00" });
  });

  it("commande avec acompte : née CONFIRMED (confirmedAt posé), acompte DEPOSIT ; sans acompte : PENDING", async () => {
    const perfume = await seedPerfume(server.prisma);
    const withDeposit = document({ origin: "ORDER", lines: [catalogueLine(perfume.id)], payments: [{ id: newId(), amount: "40", pocketId: null }] });
    expect(expectOk(await server.documents.createDocumentAction(withDeposit))).toMatchObject({ status: "CONFIRMED", paid: "40.00", due: "80.00" });
    const doc = await server.prisma.saleDocument.findUniqueOrThrow({ where: { id: withDeposit.id } });
    expect(doc.confirmedAt).not.toBeNull();
    expect(doc.deliveredAt).toBeNull();
    expect((await paymentsOf(server.prisma, withDeposit.id)).map((payment) => payment.kind)).toEqual(["DEPOSIT"]);

    const without = document({ origin: "ORDER", lines: [catalogueLine(perfume.id)] });
    expect(expectOk(await server.documents.createDocumentAction(without)).status).toBe("PENDING");
  });

  it("plusieurs poches (S08) : un paiement par poche, le reste dans « Non attribué » ; la poche du premier est mémorisée", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const perfume = await seedPerfume(server.prisma);
    const input = document({
      lines: [catalogueLine(perfume.id)],
      payments: [
        { id: newId(), amount: "100", pocketId: cash.id },
        { id: newId(), amount: "20", pocketId: null },
      ],
    });
    expectOk(await server.documents.createDocumentAction(input));
    const system = await server.prisma.pocket.findFirstOrThrow({ where: { isSystem: true } });
    expect(await balanceOf(server.prisma, cash.id)).toBe("100.00");
    expect(await balanceOf(server.prisma, system.id)).toBe("20.00");
    expect(await defaultPocketId(server.prisma)).toBe(cash.id);
    expect((await paymentsOf(server.prisma, input.id)).length).toBe(2);
  });
});

describe("T1 — gardes des paiements", () => {
  it("Σ des paiements > total ⇒ VALIDATION « Le montant reçu dépasse le total (120,00 €). », rien d'écrit", async () => {
    const perfume = await seedPerfume(server.prisma, { stock: 5 });
    const input = document({
      lines: [catalogueLine(perfume.id)],
      payments: [
        { id: newId(), amount: "100", pocketId: null },
        { id: newId(), amount: "20,01", pocketId: null },
      ],
    });
    expect(expectError(await server.documents.createDocumentAction(input), "VALIDATION").fields).toEqual({
      payments: "Le montant reçu dépasse le total (120,00 €).",
    });
    expect(await counts(server.prisma)).toMatchObject({ documents: 0, lines: 0 });
    expect(await moneyCounts(server.prisma)).toEqual({ payments: 0, movements: 0, expenses: 0, pockets: 0 });
    expect(await stockOf(server.prisma, perfume.id)).toBe(5);
  });

  it("le writer revérifie Σ ≤ total (entrée parsée hors contrat) ⇒ VALIDATION sous `payments`", async () => {
    const perfume = await seedPerfume(server.prisma);
    const parsed = createDocumentInput.parse(document({ lines: [catalogueLine(perfume.id)] }));
    const error = await server
      .inTransaction((tx) =>
        server.documentsWriter.createDocument(tx, {
          ...parsed,
          payments: [{ id: newId(), amount: "150.00" as never, pocketId: null }],
        }),
      )
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ code: "VALIDATION", field: "payments" });
  });

  it("poche archivée ⇒ CONFLICT ; poche inconnue ⇒ NOT_FOUND ; rien d'écrit", async () => {
    const perfume = await seedPerfume(server.prisma, { stock: 5 });
    const archived = await seedPocket(server.prisma, { name: "Vieille caisse", archived: true });
    const refused = expectError(
      await server.documents.createDocumentAction(
        document({ lines: [catalogueLine(perfume.id)], payments: [{ id: newId(), amount: "50", pocketId: archived.id }] }),
      ),
      "CONFLICT",
    );
    expect(refused.message).toBe("La poche « Vieille caisse » est archivée : aucun mouvement ne peut plus y entrer ni en sortir.");
    expectError(
      await server.documents.createDocumentAction(
        document({ lines: [catalogueLine(perfume.id)], payments: [{ id: newId(), amount: "50", pocketId: newId() }] }),
      ),
      "NOT_FOUND",
    );
    expect(await counts(server.prisma)).toMatchObject({ documents: 0 });
    expect(await server.prisma.payment.count()).toBe(0);
    expect(await stockOf(server.prisma, perfume.id)).toBe(5);
  });
});

describe("T1 — idempotence (04 §3.6)", () => {
  it("renvoi du même document : un document, un paiement, deux succès identiques", async () => {
    const perfume = await seedPerfume(server.prisma, { stock: 5 });
    const input = document({ lines: [catalogueLine(perfume.id)], payments: [{ id: newId(), amount: "120", pocketId: null }] });
    const first = expectOk(await server.documents.createDocumentAction(input));
    expect(expectOk(await server.documents.createDocumentAction(input))).toEqual(first);
    expect(await moneyCounts(server.prisma)).toMatchObject({ payments: 1, movements: 1 });
    expect(await stockOf(server.prisma, perfume.id)).toBe(4);
  });

  it("deux envois croisés : une ligne, deux succès", async () => {
    const perfume = await seedPerfume(server.prisma, { stock: 5 });
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const input = document({ lines: [catalogueLine(perfume.id)], payments: [{ id: newId(), amount: "120", pocketId: cash.id }] });
    const results = await Promise.all([
      server.documents.createDocumentAction(input),
      server.documents.createDocumentAction(input),
    ]);
    expect(results.map((result) => result.ok)).toEqual([true, true]);
    expect(await moneyCounts(server.prisma)).toMatchObject({ payments: 1, movements: 1 });
    expect(await balanceOf(server.prisma, cash.id)).toBe("120.00");
  });
});

describe("T1 — atomicité", () => {
  it("erreur injectée après la première écriture ⇒ aucune ligne en base", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const perfume = await seedPerfume(server.prisma, { stock: 5 });
    const input = createDocumentInput.parse(
      document({ lines: [catalogueLine(perfume.id)], payments: [{ id: newId(), amount: "120", pocketId: cash.id }] }),
    );
    let written: string[] = [];
    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingAfterFirstWrite(tx);
        written = failing.written;
        return server.documentsWriter.createDocument(failing, input);
      }),
    ).rejects.toThrow(INJECTED);
    expect(written).toEqual(["saleDocument.create"]);
    expect(await counts(server.prisma)).toMatchObject({ documents: 0, lines: 0, pricings: 0 });
    expect(await moneyCounts(server.prisma)).toEqual({ payments: 0, movements: 0, expenses: 0, pockets: 1 });
  });

  it("erreur injectée à la pièce du dernier paiement ⇒ document, lignes, stock, mouvements et réglage annulés", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const perfume = await seedPerfume(server.prisma, { stock: 5 });
    const input = createDocumentInput.parse(
      document({
        lines: [catalogueLine(perfume.id)],
        payments: [
          { id: newId(), amount: "60", pocketId: cash.id },
          { id: newId(), amount: "60", pocketId: cash.id },
        ],
      }),
    );
    let written: string[] = [];
    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingOn(tx, "setting.upsert");
        written = failing.written;
        return server.documentsWriter.createDocument(failing, input);
      }),
    ).rejects.toThrow(INJECTED_ON);
    expect(written.filter((write) => write.startsWith("payment") || write.startsWith("cashMovement"))).toEqual([
      "cashMovement.create",
      "payment.create",
      "cashMovement.create",
      "payment.create",
    ]);
    expect(await counts(server.prisma)).toMatchObject({ documents: 0, lines: 0 });
    expect(await moneyCounts(server.prisma)).toEqual({ payments: 0, movements: 0, expenses: 0, pockets: 1 });
    expect(await stockOf(server.prisma, perfume.id)).toBe(5);
    expect(await defaultPocketId(server.prisma)).toBeNull();
  });
});
