import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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
 * T12 (03 §4.3, §4.4 ; 06 S18 « Annuler ce transfert ? », PC-10 ; 07 J6) : `reverseMovementAction` — les deux
 * jambes d'un transfert contre-passées (nouveau groupe, mêmes dates), ajustement et paiement fournisseur,
 * unicité de la contre-passation, paiements et dépenses renvoyés à leur fiche, « Non attribué » jamais
 * négatif, atomicité. Et les écritures d'une ligne : ajustement, paiement fournisseur.
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
const reverse = (movementId: string) => server.treasury.reverseMovementAction({ movementId });

describe("écritures d'une ligne : ajustement, paiement fournisseur", () => {
  it("ajustement « Ajouter » et « Retirer » : signe porté par le serveur, raison en libellé ; « Non attribué » jamais négatif", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces", openingBalance: "10" });
    const added = expectOk(await server.treasury.adjustAction({ pocketId: cash.id, direction: "in", amount: "25,50", reason: "Oubli de caisse" }));
    expect(added).toMatchObject({ movement: { kind: "ADJUSTMENT", amount: "25.50", label: "Oubli de caisse" }, pocket: { balance: "35.50" } });
    const removed = expectOk(await server.treasury.adjustAction({ pocketId: cash.id, direction: "out", amount: "40", reason: "Écart de caisse" }));
    expect(removed.movement.amount).toBe("-40.00");
    expect(removed.pocket.balance).toBe("-4.50");

    await seedSystemPocket(server.prisma);
    expectError(await server.treasury.adjustAction({ pocketId: null, direction: "out", amount: "1", reason: "Écart" }), "CONFLICT");
    expect(expectError(await server.treasury.adjustAction({ pocketId: cash.id, direction: "out", amount: "1", reason: "" }), "VALIDATION").fields).toEqual({
      reason: "Indique la raison de l'ajustement.",
    });
  });

  it("setMovementLabel : seul le libellé change (écriture seule respectée) ; mouvement inconnu ⇒ NOT_FOUND", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces", openingBalance: "10" });
    const added = expectOk(await server.treasury.adjustAction({ pocketId: cash.id, direction: "in", amount: "5", reason: "Oubli" }));
    const movements = await import("@/server/treasury/movements");
    const relabelled = await server.inTransaction((tx) => movements.setMovementLabel(tx, added.movement.id, "Fond de caisse retrouvé"));
    expect(relabelled).toMatchObject({ id: added.movement.id, label: "Fond de caisse retrouvé", pocketId: cash.id });
    const stored = await server.prisma.cashMovement.findUniqueOrThrow({ where: { id: added.movement.id } });
    expect([stored.label, stored.amount.toFixed(2)]).toEqual(["Fond de caisse retrouvé", "5.00"]);
    await expect(server.inTransaction((tx) => movements.setMovementLabel(tx, newId(), "x"))).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("paiement fournisseur : sortie SUPPLIER négative, note en libellé ; renvoi du même identifiant : un mouvement", async () => {
    const bank = await seedPocket(server.prisma, { name: "Banque", kind: "BANK", openingBalance: "800" });
    const input = { id: newId(), pocketId: bank.id, amount: "500", note: "Avance Lattafa" };
    const data = expectOk(await server.treasury.recordSupplierPaymentAction(input));
    expect(data).toMatchObject({ movement: { id: input.id, kind: "SUPPLIER", amount: "-500.00", label: "Avance Lattafa" }, pocket: { balance: "300.00" } });
    expect(expectOk(await server.treasury.recordSupplierPaymentAction(input))).toEqual(data);
    expect(await server.prisma.cashMovement.count()).toBe(1);
  });
});

describe("T12 — annuler un mouvement manuel", () => {
  it("transfert : les deux jambes contre-passées, même date, nouveau groupe commun ; soldes rétablis", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces", openingBalance: "300" });
    const bank = await seedPocket(server.prisma, { name: "Banque" });
    const lastWeek = new Date(Date.now() - 7 * DAY);
    const transfer = expectOk(
      await server.treasury.transferAction({ fromPocketId: cash.id, toPocketId: bank.id, amount: "300", occurredAt: lastWeek.toISOString() }),
    );

    const data = expectOk(await reverse(transfer.movements[1].id));

    expect(new Set(data.reversedIds)).toEqual(new Set(transfer.movements.map((m) => m.id)));
    expect(data.movements).toHaveLength(2);
    const group = data.movements[0]?.transferGroupId;
    expect(group).not.toBeNull();
    expect(group).not.toBe(transfer.transferGroupId);
    expect(data.movements.every((m) => m.transferGroupId === group && m.occurredAt === lastWeek.toISOString() && m.kind === "TRANSFER")).toBe(true);
    expect(new Set(data.movements.map((m) => m.reversesId))).toEqual(new Set(transfer.movements.map((m) => m.id)));
    expect(await balanceOf(server.prisma, cash.id)).toBe("300.00");
    expect(await balanceOf(server.prisma, bank.id)).toBe("0.00");
  });

  it("seconde annulation ⇒ CONFLICT « Ce mouvement a déjà été annulé. » ; annuler une contre-passation ⇒ CONFLICT", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces", openingBalance: "100" });
    const adjustment = expectOk(await server.treasury.adjustAction({ pocketId: cash.id, direction: "out", amount: "30", reason: "Écart" }));
    const reversal = expectOk(await reverse(adjustment.movement.id));
    expect(reversal.movements[0]).toMatchObject({ kind: "ADJUSTMENT", amount: "30.00", reversesId: adjustment.movement.id });
    const counts = await moneyCounts(server.prisma);

    expect(expectError(await reverse(adjustment.movement.id), "CONFLICT").message).toBe("Ce mouvement a déjà été annulé.");
    expect(expectError(await reverse(reversal.movements[0]!.id), "CONFLICT").message).toBe(
      "Ce mouvement est lui-même une annulation : il ne s'annule pas.",
    );
    expect(await moneyCounts(server.prisma)).toEqual(counts);
  });

  it("paiement fournisseur annulé : l'argent revient (SUPPLIER positif, reversesId)", async () => {
    const bank = await seedPocket(server.prisma, { name: "Banque", openingBalance: "500" });
    const supplier = expectOk(await server.treasury.recordSupplierPaymentAction({ pocketId: bank.id, amount: "500" }));
    const data = expectOk(await reverse(supplier.movement.id));
    expect(data.movements[0]).toMatchObject({ kind: "SUPPLIER", amount: "500.00" });
    expect(data.pockets).toEqual([{ pocketId: bank.id, balance: "500.00" }]);
  });

  it("contre-passation qui viderait « Non attribué » sous zéro ⇒ CONFLICT, rien d'écrit", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    await seedSystemPocket(server.prisma);
    const added = expectOk(await server.treasury.adjustAction({ pocketId: null, direction: "in", amount: "80", reason: "Trouvé" }));
    expectOk(await server.treasury.transferAction({ fromPocketId: null, toPocketId: cash.id, amount: "50" }));
    const counts = await moneyCounts(server.prisma);
    expectError(await reverse(added.movement.id), "CONFLICT");
    expect(await moneyCounts(server.prisma)).toEqual(counts);
  });

  it("mouvement d'un paiement ⇒ CONFLICT (se corrige depuis la fiche) ; mouvement inconnu ⇒ NOT_FOUND", async () => {
    await createDocument(server, { origin: "DIRECT_SALE", received: [{ amount: "120", pocketId: null }] });
    const movement = await server.prisma.cashMovement.findFirstOrThrow({ where: { kind: "PAYMENT" } });
    expect(expectError(await reverse(movement.id), "CONFLICT").message).toBe(
      "Ce mouvement vient d'un paiement : annule le paiement depuis la fiche du document.",
    );
    expectError(await reverse(newId()), "NOT_FOUND");
  });

  it("erreur injectée après la première écriture ⇒ aucune jambe contre-passée", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces", openingBalance: "300" });
    const bank = await seedPocket(server.prisma, { name: "Banque" });
    const transfer = expectOk(await server.treasury.transferAction({ fromPocketId: cash.id, toPocketId: bank.id, amount: "100" }));
    const counts = await moneyCounts(server.prisma);
    let written: string[] = [];
    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingAfterFirstWrite(tx);
        written = failing.written;
        return server.treasuryWriter.reverseMovement(failing, transfer.movements[0].id);
      }),
    ).rejects.toThrow(INJECTED);
    expect(written).toEqual(["cashMovement.create"]);
    expect(await moneyCounts(server.prisma)).toEqual(counts);
  });
});
