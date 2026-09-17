import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { transferInput } from "@/contracts/treasury";
import {
  balanceOf,
  createDocument,
  expectInvariants,
  loadMoneyServer,
  moneyCounts,
  seedPocket,
  seedSystemPocket,
  type MoneyServer,
} from "./support/argent";
import { INJECTED, expectError, expectOk, failingAfterFirstWrite, freshStart, newId } from "./support/harness";

/**
 * T11 (03 §4.3 ; 06 S15, PC-11 ; 07 J6) : `transferAction` — deux jambes appariées de somme nulle, même date,
 * « Répartir le non attribué », « Non attribué » jamais sous zéro, autre poche en négatif = réserve confirmée,
 * poche archivée refusée, idempotence, atomicité. Et les lectures de la trésorerie (poches actives, journal).
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

describe("T11 — transfert", () => {
  it("Espèces → Banque : deux jambes TRANSFER, même groupe, même date, somme nulle ; soldes à jour", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces", openingBalance: "300" });
    const bank = await seedPocket(server.prisma, { name: "Banque", kind: "BANK" });
    const yesterday = new Date(Date.now() - DAY);

    const data = expectOk(
      await server.treasury.transferAction({
        fromPocketId: cash.id,
        toPocketId: bank.id,
        amount: "300",
        occurredAt: yesterday.toISOString(),
        label: "Dépôt",
      }),
    );

    expect(data.from).toEqual({ pocketId: cash.id, balance: "0.00" });
    expect(data.to).toEqual({ pocketId: bank.id, balance: "300.00" });
    expect(data.movements.map((m) => [m.pocketId, m.amount, m.kind, m.transferGroupId, m.occurredAt, m.label])).toEqual([
      [cash.id, "-300.00", "TRANSFER", data.transferGroupId, yesterday.toISOString(), "Dépôt"],
      [bank.id, "300.00", "TRANSFER", data.transferGroupId, yesterday.toISOString(), "Dépôt"],
    ]);
    expect(await server.prisma.cashMovement.count({ where: { transferGroupId: data.transferGroupId } })).toBe(2);
  });

  it("« Répartir le non attribué » (source null) : le non attribué rangé dans la poche choisie", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    await createDocument(server, { origin: "DIRECT_SALE", received: [{ amount: "120", pocketId: null }] });
    const system = await server.prisma.pocket.findFirstOrThrow({ where: { isSystem: true } });

    expectOk(await server.treasury.transferAction({ fromPocketId: null, toPocketId: cash.id, amount: "120" }));
    expect(await balanceOf(server.prisma, system.id)).toBe("0.00");
    expect(await balanceOf(server.prisma, cash.id)).toBe("120.00");
  });

  it("« Non attribué » ne passe jamais sous zéro ⇒ CONFLICT, rien d'écrit (même avec confirm)", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    await seedSystemPocket(server.prisma, "50");
    const before = await moneyCounts(server.prisma);
    const refused = expectError(
      await server.treasury.transferAction({ fromPocketId: null, toPocketId: cash.id, amount: "50,01", confirm: true }),
      "CONFLICT",
    );
    expect(refused.message).toBe(
      "« Non attribué » ne contient que 50,00 € : il ne passe jamais sous zéro. Choisis une autre poche ou un montant plus petit.",
    );
    expect(await moneyCounts(server.prisma)).toEqual(before);
  });

  it("autre poche qui passerait en négatif ⇒ NEEDS_CONFIRMATION ; confirmée ⇒ écrit", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces", openingBalance: "280" });
    const bank = await seedPocket(server.prisma, { name: "Banque", kind: "BANK" });
    const input = { fromPocketId: cash.id, toPocketId: bank.id, amount: "300" };

    const reserve = expectError(await server.treasury.transferAction(input), "NEEDS_CONFIRMATION");
    expect(reserve.confirm).toEqual({
      title: "Mettre « Espèces » en négatif ?",
      reserves: ["« Espèces » contient 280,00 € : son solde passera à −20,00 €."],
      confirmLabel: "Transférer",
    });
    expect(await server.prisma.cashMovement.count()).toBe(0);

    expectOk(await server.treasury.transferAction({ ...input, confirm: true }));
    expect(await balanceOf(server.prisma, cash.id)).toBe("-20.00");
  });

  it("même poche ⇒ VALIDATION ; poche archivée ⇒ CONFLICT ; poche inconnue ⇒ NOT_FOUND ; date future ⇒ VALIDATION", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces", openingBalance: "100" });
    const archived = await seedPocket(server.prisma, { name: "Coffre", archived: true });
    const system = await seedSystemPocket(server.prisma, "10");

    expect(expectError(await server.treasury.transferAction({ fromPocketId: cash.id, toPocketId: cash.id, amount: "1" }), "VALIDATION").fields).toEqual({
      toPocketId: "Choisis deux poches différentes.",
    });
    expect(expectError(await server.treasury.transferAction({ fromPocketId: null, toPocketId: system.id, amount: "1" }), "VALIDATION").fields).toEqual({
      toPocketId: "Choisis deux poches différentes.",
    });
    expect(expectError(await server.treasury.transferAction({ fromPocketId: cash.id, toPocketId: archived.id, amount: "1" }), "CONFLICT").message).toBe(
      "La poche « Coffre » est archivée : aucun mouvement ne peut plus y entrer ni en sortir.",
    );
    expectError(await server.treasury.transferAction({ fromPocketId: cash.id, toPocketId: newId(), amount: "1" }), "NOT_FOUND");
    expectError(
      await server.treasury.transferAction({
        fromPocketId: cash.id,
        toPocketId: system.id,
        amount: "1",
        occurredAt: new Date(Date.now() + 2 * DAY).toISOString(),
      }),
      "VALIDATION",
    );
    expect(await server.prisma.cashMovement.count()).toBe(0);
  });

  it("renvoi du même identifiant : un transfert, deux succès", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces", openingBalance: "100" });
    const bank = await seedPocket(server.prisma, { name: "Banque" });
    const input = { id: newId(), fromPocketId: cash.id, toPocketId: bank.id, amount: "40" };
    const first = expectOk(await server.treasury.transferAction(input));
    expect(expectOk(await server.treasury.transferAction(input))).toEqual(first);
    expect(first.transferGroupId).toBe(input.id);
    expect(await server.prisma.cashMovement.count()).toBe(2);
    expect(await balanceOf(server.prisma, cash.id)).toBe("60.00");
  });

  it("erreur injectée après la première écriture ⇒ aucune jambe", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces", openingBalance: "100" });
    const bank = await seedPocket(server.prisma, { name: "Banque" });
    let written: string[] = [];
    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingAfterFirstWrite(tx);
        written = failing.written;
        return server.treasuryWriter.transfer(failing, transferInput.parse({ fromPocketId: cash.id, toPocketId: bank.id, amount: "40" }));
      }),
    ).rejects.toThrow(INJECTED);
    expect(written).toEqual(["cashMovement.createManyAndReturn"]);
    expect(await server.prisma.cashMovement.count()).toBe(0);
  });
});

describe("lectures de la trésorerie", () => {
  it("poches actives : soldes, ordre choisi, « Non attribué » en dernier, poche par défaut ; archivées absentes", async () => {
    const bank = await seedPocket(server.prisma, { name: "Banque", kind: "BANK", openingBalance: "200" });
    const cash = await seedPocket(server.prisma, { name: "Espèces", openingBalance: "0" });
    await seedPocket(server.prisma, { name: "Coffre", archived: true });
    await server.prisma.pocket.update({ where: { id: bank.id }, data: { sortOrder: 2 } });
    await createDocument(server, { origin: "DIRECT_SALE", received: [{ amount: "70", pocketId: cash.id }, { amount: "50", pocketId: null }] });

    const pockets = await server.treasuryQueries.activePockets();
    expect(pockets.map((p) => [p.name, p.balance, p.isDefault, p.isSystem])).toEqual([
      ["Espèces", "70.00", true, false],
      ["Banque", "200.00", false, false],
      ["Non attribué", "50.00", false, true],
    ]);
  });

  it("journal d'un mois : mouvements du mois seulement, plus récents d'abord, net du mois entier, pièces jointes", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces", openingBalance: "500" });
    const bank = await seedPocket(server.prisma, { name: "Banque" });
    const document = await createDocument(server, { origin: "DIRECT_SALE", received: [{ amount: "120", pocketId: cash.id }] });
    expectOk(await server.treasury.transferAction({ fromPocketId: cash.id, toPocketId: bank.id, amount: "100" }));
    // Un mouvement du mois précédent n'entre ni dans la liste ni dans le net.
    const now = new Date();
    const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15, 12));
    await server.prisma.cashMovement.create({ data: { pocketId: cash.id, amount: "-7.00", kind: "ADJUSTMENT", occurredAt: lastMonth, label: "Ancien" } });

    const month = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit" }).format(new Date());
    const journal = await server.treasuryQueries.movementJournal(month);
    expect(journal.month).toBe(month);
    expect(journal.net).toBe("120.00");
    expect(journal.entries).toHaveLength(3);
    const payment = journal.entries.find((entry) => entry.kind === "PAYMENT");
    expect(payment?.payment).toMatchObject({ documentId: document, kind: "BALANCE", customerName: "Fares" });
    expect(payment?.pocketName).toBe("Espèces");

    const bankOnly = await server.treasuryQueries.movementJournal(month, bank.id);
    expect(bankOnly.entries.map((entry) => entry.amount)).toEqual(["100.00"]);
    expect(bankOnly.net).toBe("100.00");
  });
});
