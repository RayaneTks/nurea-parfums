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
import { expectError, expectOk, freshStart, newId } from "./support/harness";

/**
 * Poches (S14, S16, S21) et réglages (E08, N2, N3) : écritures d'une ligne du module trésorerie et du module
 * réglages (03 §4.3 « atomiques par nature »), poche proposée par défaut, lecture des réglages.
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

describe("poches", () => {
  it("créer : nature, solde d'ouverture, rang en fin de liste, proposée par défaut sur demande ; renvoi sans doublon", async () => {
    const id = newId();
    const cash = expectOk(await server.treasury.createPocketAction({ id, name: " Espèces ", kind: "CASH", makeDefault: true }));
    expect(cash).toMatchObject({ id, name: "Espèces", kind: "CASH", openingBalance: "0.00", balance: "0.00", sortOrder: 0, isDefault: true, isSystem: false });
    expect(expectOk(await server.treasury.createPocketAction({ id, name: "Espèces", kind: "CASH" }))).toEqual(cash);

    const bank = expectOk(await server.treasury.createPocketAction({ name: "Banque", kind: "BANK", openingBalance: "1 200,50" }));
    expect(bank).toMatchObject({ openingBalance: "1200.50", balance: "1200.50", sortOrder: 1, isDefault: false });
    expect(await defaultPocketId(server.prisma)).toBe(id);
    expect(await server.prisma.pocket.count()).toBe(2);
  });

  it("créer : nom trop court, nature système ou solde illisible ⇒ VALIDATION", async () => {
    const error = expectError(
      await server.treasury.createPocketAction({ name: "E", kind: "UNASSIGNED" as never, openingBalance: "beaucoup" }),
      "VALIDATION",
    );
    expect(Object.keys(error.fields ?? {}).sort()).toEqual(["kind", "name", "openingBalance"]);
  });

  it("renommer, changer de nature, réordonner (rangs renumérotés) ; « Non attribué » intouchable", async () => {
    const a = await seedPocket(server.prisma, { name: "Espèces" });
    const b = await seedPocket(server.prisma, { name: "Banque" });
    const c = await seedPocket(server.prisma, { name: "Coffre" });
    for (const [index, pocket] of [a, b, c].entries()) {
      await server.prisma.pocket.update({ where: { id: pocket.id }, data: { sortOrder: index } });
    }

    expect(expectOk(await server.treasury.updatePocketAction({ id: b.id, name: "Banque postale", kind: "BANK" }))).toMatchObject({
      name: "Banque postale",
      kind: "BANK",
    });
    expectOk(await server.treasury.updatePocketAction({ id: c.id, position: 0 }));
    const ordered = await server.treasuryQueries.activePockets();
    expect(ordered.map((pocket) => [pocket.name, pocket.sortOrder])).toEqual([
      ["Coffre", 0],
      ["Espèces", 1],
      ["Banque postale", 2],
    ]);

    const system = await seedSystemPocket(server.prisma);
    expect(expectError(await server.treasury.updatePocketAction({ id: system.id, name: "Divers" }), "CONFLICT").message).toBe(
      "La poche « Non attribué » ne se renomme pas et reste en dernier.",
    );
    expectError(await server.treasury.updatePocketAction({ id: a.id }), "VALIDATION");
    expectError(await server.treasury.updatePocketAction({ id: newId(), name: "Fantôme" }), "NOT_FOUND");
  });
});

describe("réglages", () => {
  it("base neuve : valeurs par défaut (277, « Non attribué ») ; taux et poche par défaut modifiables", async () => {
    expect(await server.settingsQueries.getSettings()).toEqual({ defaultExchangeRate: "277.00", defaultPocketId: null });
    const bank = await seedPocket(server.prisma, { name: "Banque" });

    expect(expectOk(await server.settings.updateSettingsAction({ defaultExchangeRate: "245,5", defaultPocketId: bank.id }))).toEqual({
      defaultExchangeRate: "245.50",
      defaultPocketId: bank.id,
    });
    expect(await server.settingsQueries.getSettings()).toEqual({ defaultExchangeRate: "245.50", defaultPocketId: bank.id });

    // Un champ absent n'est pas touché ; la poche système se mémorise en NULL.
    const system = await seedSystemPocket(server.prisma);
    expect(expectOk(await server.settings.updateSettingsAction({ defaultPocketId: system.id }))).toEqual({
      defaultExchangeRate: "245.50",
      defaultPocketId: null,
    });
  });

  it("taux nul ou illisible ⇒ VALIDATION ; poche archivée ⇒ CONFLICT ; poche inconnue ⇒ NOT_FOUND ; rien à changer ⇒ VALIDATION", async () => {
    expect(expectError(await server.settings.updateSettingsAction({ defaultExchangeRate: "0" }), "VALIDATION").fields).toEqual({
      defaultExchangeRate: "Saisis un taux supérieur à 0 (ex. 277).",
    });
    const archived = await seedPocket(server.prisma, { name: "Coffre", archived: true });
    expect(expectError(await server.settings.updateSettingsAction({ defaultPocketId: archived.id }), "CONFLICT").message).toBe(
      "La poche « Coffre » est archivée : choisis une poche active.",
    );
    expectError(await server.settings.updateSettingsAction({ defaultPocketId: newId() }), "NOT_FOUND");
    expectError(await server.settings.updateSettingsAction({}), "VALIDATION");
    expect(await server.prisma.setting.count()).toBe(0);
  });

  it("N2 : le dernier choix d'encaissement devient la poche proposée ; « Non attribué » choisi la remet à NULL", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const bank = await seedPocket(server.prisma, { name: "Banque" });
    const id = await createDocument(server, { origin: "DIRECT_SALE", received: [{ amount: "20", pocketId: cash.id }] });
    expect(await defaultPocketId(server.prisma)).toBe(cash.id);
    expectOk(await server.payments.recordPaymentAction({ id: newId(), documentId: id, amount: "20", pocketId: bank.id }));
    expect(await defaultPocketId(server.prisma)).toBe(bank.id);
    expectOk(await server.payments.recordPaymentAction({ id: newId(), documentId: id, amount: "20", pocketId: null }));
    expect(await defaultPocketId(server.prisma)).toBeNull();
    expect((await server.treasuryQueries.activePockets()).find((pocket) => pocket.isSystem)?.isDefault).toBe(true);
  });
});
