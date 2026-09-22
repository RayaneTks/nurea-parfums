import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDocument,
  defaultPocketId,
  expectInvariants,
  loadMoneyServer,
  seedPocket,
  seedSystemPocket,
  type MoneyServer,
} from "./support/argent";
import { INJECTED, expectError, expectOk, failingAfterFirstWrite, freshStart, newId } from "./support/harness";

/**
 * T15 (03 §4.3, §4.4 ; 06 S14 ; 07 J6) : `archivePocketAction` — solde nul exigé, poche système refusée, plus
 * aucun mouvement ensuite, poche par défaut oubliée ; et `deletePocketAction` — poche sans mouvement supprimée
 * (réglage remis à NULL), poche avec historique ou système refusées.
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

const archived = async (id: string) => (await server.prisma.pocket.findUniqueOrThrow({ where: { id } })).archived;

describe("T15 — archiver une poche", () => {
  it("solde ramené à 0 ⇒ archivée ; plus proposée par défaut ; plus aucun mouvement n'y entre ; renvoi ⇒ succès", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const bank = await seedPocket(server.prisma, { name: "Banque" });
    await createDocument(server, { origin: "DIRECT_SALE", received: [{ amount: "120", pocketId: cash.id }] });
    expect(await defaultPocketId(server.prisma)).toBe(cash.id);
    expectOk(await server.treasury.transferAction({ fromPocketId: cash.id, toPocketId: bank.id, amount: "120" }));

    const data = expectOk(await server.treasury.archivePocketAction({ id: cash.id }));
    expect(data).toMatchObject({ id: cash.id, archived: true, balance: "0.00", isDefault: false });
    expect(await defaultPocketId(server.prisma)).toBeNull();
    expect(expectOk(await server.treasury.archivePocketAction({ id: cash.id })).archived).toBe(true);

    const other = await createDocument(server, { origin: "DIRECT_SALE" });
    expect(
      expectError(await server.payments.recordPaymentAction({ id: newId(), documentId: other, amount: "10", pocketId: cash.id }), "CONFLICT")
        .message,
    ).toBe("La poche « Espèces » est archivée : aucun mouvement ne peut plus y entrer ni en sortir.");
    expect((await server.treasuryQueries.activePockets()).map((pocket) => pocket.name)).not.toContain("Espèces");
  });

  it("solde non nul ⇒ CONFLICT ; poche système ⇒ CONFLICT ; poche inconnue ⇒ NOT_FOUND", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces", openingBalance: "120" });
    expect(expectError(await server.treasury.archivePocketAction({ id: cash.id }), "CONFLICT").message).toBe(
      "Solde non nul : la poche « Espèces » contient 120,00 €. Transfère d'abord son solde, puis archive-la.",
    );
    expect(await archived(cash.id)).toBe(false);

    const system = await seedSystemPocket(server.prisma);
    expect(expectError(await server.treasury.archivePocketAction({ id: system.id }), "CONFLICT").message).toBe(
      "La poche « Non attribué » ne s'archive pas : elle reçoit ce qui n'est pas encore rangé.",
    );
    expect(await archived(system.id)).toBe(false);
    expectError(await server.treasury.archivePocketAction({ id: newId() }), "NOT_FOUND");
  });

  it("erreur injectée après la première écriture ⇒ la poche reste active", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    let written: string[] = [];
    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingAfterFirstWrite(tx);
        written = failing.written;
        return server.treasuryWriter.archivePocket(failing, cash.id);
      }),
    ).rejects.toThrow(INJECTED);
    expect(written).toEqual(["pocket.update"]);
    expect(await archived(cash.id)).toBe(false);
  });
});

describe("supprimer une poche (deletePocketAction)", () => {
  it("poche sans mouvement ⇒ supprimée, et Setting.defaultPocketId repasse à NULL si c'était la poche par défaut", async () => {
    const created = expectOk(
      await server.treasury.createPocketAction({ name: "Banque", kind: "BANK", openingBalance: "200", makeDefault: true }),
    );
    expect(await defaultPocketId(server.prisma)).toBe(created.id);

    expect(expectOk(await server.treasury.deletePocketAction({ id: created.id }))).toEqual({ id: created.id, deleted: true });
    expect(await server.prisma.pocket.count({ where: { id: created.id } })).toBe(0);
    expect(await defaultPocketId(server.prisma)).toBeNull();
    expect(expectOk(await server.treasury.deletePocketAction({ id: created.id }))).toEqual({ id: created.id, deleted: false });
  });

  it("poche avec un mouvement ⇒ CONFLICT « Cette poche a un historique : archive-la une fois son solde à 0. »", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const adjustment = expectOk(await server.treasury.adjustAction({ pocketId: cash.id, direction: "in", amount: "5", reason: "Fond de caisse" }));
    expectOk(await server.treasury.reverseMovementAction({ movementId: adjustment.movement.id }));
    expect(expectError(await server.treasury.deletePocketAction({ id: cash.id }), "CONFLICT").message).toBe(
      "Cette poche a un historique : archive-la une fois son solde à 0.",
    );
    expect(await server.prisma.pocket.count({ where: { id: cash.id } })).toBe(1);
  });

  it("poche système ⇒ CONFLICT", async () => {
    const system = await seedSystemPocket(server.prisma);
    expect(expectError(await server.treasury.deletePocketAction({ id: system.id }), "CONFLICT").message).toBe(
      "La poche « Non attribué » ne se supprime pas.",
    );
  });
});
