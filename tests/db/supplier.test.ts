import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createDocument, expectInvariants, loadMoneyServer, type MoneyServer } from "./transactions/support/argent";
import { expectError, expectOk, freshStart, newId, seedBatch } from "./transactions/support/harness";

/**
 * Carnet fournisseur (docs/admin/dettes-fournisseur.md) : dettes et versements en dinars, Reste à payer
 * dérivé, taux de lecture mémorisé à part, éléments cochés qui suivent leur document ou leur lot.
 *
 * Ce que ces tests protègent avant tout : le carnet n'écrit RIEN dans l'argent de la gestion (aucun
 * mouvement, aucune poche, aucun taux de vente), et ne bloque jamais un geste de la gestion.
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

type Server = MoneyServer & {
  supplier: typeof import("@/server/supplier/actions");
  supplierQueries: typeof import("@/server/supplier/queries");
};

let server: Server;

beforeAll(async () => {
  const money = await loadMoneyServer();
  server = {
    ...money,
    supplier: await import("@/server/supplier/actions"),
    supplierQueries: await import("@/server/supplier/queries"),
  };
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

const DAY = 24 * 60 * 60 * 1000;

describe("noter une dette, un versement", () => {
  it("le Reste à payer suit dettes et versements, et le carnet ne touche jamais l'argent de la gestion", async () => {
    const lot = expectOk(
      await server.supplier.recordSupplierEntryAction({
        id: newId(),
        kind: "DEBT",
        amountDzd: "92 700",
        label: " Lot d'octobre ",
        occurredAt: new Date(Date.now() - 2 * DAY),
      }),
    );
    expect(lot).toMatchObject({ kind: "DEBT", amountDzd: "92700.00", label: "Lot d'octobre", note: null });
    expectOk(await server.supplier.recordSupplierEntryAction({ id: newId(), kind: "PAYMENT", amountDzd: "60000", note: "En main propre" }));

    const ledger = await server.supplierQueries.getSupplierLedger();
    expect(ledger).toMatchObject({ remainingDzd: "32700.00", state: "due", rate: "277.00" });
    expect(ledger.entries.map((entry) => [entry.kind, entry.amountDzd, entry.itemCount])).toEqual([
      ["PAYMENT", "60000.00", 0],
      ["DEBT", "92700.00", 0],
    ]);
    expect(await server.supplierQueries.getSupplierBalance()).toEqual({ remainingDzd: "32700.00", state: "due", rate: "277.00" });

    expect(await server.prisma.cashMovement.count()).toBe(0);
    expect(await server.prisma.pocket.count()).toBe(0);
    expect(await server.prisma.setting.count()).toBe(0);
  });

  it("double tap : même identifiant, une seule ligne", async () => {
    const id = newId();
    const first = expectOk(await server.supplier.recordSupplierEntryAction({ id, kind: "PAYMENT", amountDzd: "1000" }));
    const again = expectOk(await server.supplier.recordSupplierEntryAction({ id, kind: "PAYMENT", amountDzd: "1000" }));
    expect(again).toEqual(first);
    expect(await server.prisma.supplierEntry.count()).toBe(1);
  });

  it("versé plus que dû : avance, négative ; carnet vide : rien à payer", async () => {
    expect(await server.supplierQueries.getSupplierBalance()).toMatchObject({ remainingDzd: "0.00", state: "settled" });
    expectOk(await server.supplier.recordSupplierEntryAction({ id: newId(), kind: "DEBT", amountDzd: "1000" }));
    expectOk(await server.supplier.recordSupplierEntryAction({ id: newId(), kind: "PAYMENT", amountDzd: "1500,50" }));
    expect(await server.supplierQueries.getSupplierBalance()).toMatchObject({ remainingDzd: "-500.50", state: "advance" });
  });

  it("refus lisibles : montant nul ou illisible, date future, versement avec éléments, élément en double", async () => {
    for (const amountDzd of ["0", "beaucoup", "-10"]) {
      const error = expectError(await server.supplier.recordSupplierEntryAction({ id: newId(), kind: "DEBT", amountDzd }), "VALIDATION");
      expect(Object.keys(error.fields ?? {})).toEqual(["amountDzd"]);
    }
    const future = expectError(
      await server.supplier.recordSupplierEntryAction({ id: newId(), kind: "DEBT", amountDzd: "10", occurredAt: new Date(Date.now() + 3 * DAY) }),
      "VALIDATION",
    );
    expect(future.fields).toHaveProperty("occurredAt");

    const batch = await seedBatch(server.prisma, { name: "Lot" });
    const item = { kind: "batch" as const, batchId: batch.id, amountDzd: "10" };
    for (const input of [
      { kind: "PAYMENT" as const, items: [item] },
      { kind: "DEBT" as const, items: [item, item] },
    ]) {
      const error = expectError(await server.supplier.recordSupplierEntryAction({ id: newId(), amountDzd: "10", ...input }), "VALIDATION");
      expect(Object.keys(error.fields ?? {})).toEqual(["items"]);
    }
    expect(await server.prisma.supplierEntry.count()).toBe(0);
  });
});

describe("éléments cochés (sélecteur)", () => {
  it("une dette garde ses documents et lots ; supprimer l'un d'eux ne bloque rien et ne touche pas la dette", async () => {
    const documentId = await createDocument(server, { customer: { kind: "passing", name: "Farès" } });
    const batch = await seedBatch(server.prisma, { name: "Lot d'octobre" });
    const entryId = newId();
    expectOk(
      await server.supplier.recordSupplierEntryAction({
        id: entryId,
        kind: "DEBT",
        amountDzd: "40000",
        items: [
          { kind: "document", documentId, amountDzd: "9000" },
          { kind: "batch", batchId: batch.id, amountDzd: "0" },
        ],
      }),
    );

    const sheet = await server.supplierQueries.getSupplierEntry(entryId);
    expect(sheet?.items).toEqual([
      expect.objectContaining({ kind: "document", documentId, origin: "ORDER", customerName: "Farès", amountDzd: "9000.00" }),
      expect.objectContaining({ kind: "batch", batchId: batch.id, name: "Lot d'octobre", amountDzd: "0.00" }),
    ]);
    expect((await server.supplierQueries.getSupplierLedger()).entries[0]?.itemCount).toBe(2);

    expectOk(await server.documents.deleteDocumentAction({ documentId }));
    expectOk(await server.batches.deleteBatchAction({ id: batch.id }));
    const after = await server.supplierQueries.getSupplierEntry(entryId);
    expect(after).toMatchObject({ amountDzd: "40000.00", items: [] });
  });

  it("un élément qui n'existe plus : NOT_FOUND, rien d'écrit", async () => {
    const error = expectError(
      await server.supplier.recordSupplierEntryAction({
        id: newId(),
        kind: "DEBT",
        amountDzd: "10",
        items: [{ kind: "document", documentId: newId(), amountDzd: "10" }],
      }),
      "NOT_FOUND",
    );
    expect(error.message).toContain("n'existe plus");
    expect(await server.prisma.supplierEntry.count()).toBe(0);
  });
});

describe("corriger, supprimer", () => {
  it("corriger montant, nom et date ; un appel sans changement rend la ligne telle quelle", async () => {
    const id = newId();
    const created = expectOk(await server.supplier.recordSupplierEntryAction({ id, kind: "DEBT", amountDzd: "1000", label: "Transport" }));
    expect(expectOk(await server.supplier.updateSupplierEntryAction({ id }))).toEqual(created);

    const day = new Date(Date.now() - 5 * DAY);
    const updated = expectOk(await server.supplier.updateSupplierEntryAction({ id, amountDzd: "1 250,50", label: "", occurredAt: day }));
    expect(updated).toMatchObject({ kind: "DEBT", amountDzd: "1250.50", label: null, occurredAt: day.toISOString() });
    expect(await server.supplierQueries.getSupplierBalance()).toMatchObject({ remainingDzd: "1250.50" });

    expectError(await server.supplier.updateSupplierEntryAction({ id: newId(), amountDzd: "1" }), "NOT_FOUND");
    expectError(await server.supplier.updateSupplierEntryAction({ id, amountDzd: "0" }), "VALIDATION");
  });

  it("supprimer emporte les éléments cochés ; un second envoi est un succès sans effet", async () => {
    const batch = await seedBatch(server.prisma, { name: "Lot" });
    const id = newId();
    expectOk(
      await server.supplier.recordSupplierEntryAction({ id, kind: "DEBT", amountDzd: "10", items: [{ kind: "batch", batchId: batch.id, amountDzd: "10" }] }),
    );
    expect(expectOk(await server.supplier.deleteSupplierEntryAction({ id }))).toEqual({ id, deleted: true });
    expect(expectOk(await server.supplier.deleteSupplierEntryAction({ id }))).toEqual({ id, deleted: false });
    expect(await server.prisma.supplierEntryItem.count()).toBe(0);
    expect(await server.prisma.batch.count()).toBe(1);
    expect(await server.supplierQueries.getSupplierEntry(id)).toBeNull();
    expect(await server.supplierQueries.getSupplierEntry("../fabrique")).toBeNull();
  });
});

describe("taux du carnet", () => {
  it("pris aux Réglages tant qu'aucun n'est choisi, puis mémorisé sans changer le taux proposé à la vente", async () => {
    expectOk(await server.settings.updateSettingsAction({ defaultExchangeRate: "250" }));
    expect((await server.supplierQueries.getSupplierBalance()).rate).toBe("250.00");

    expect(expectOk(await server.supplier.setSupplierRateAction({ rate: "280,5" }))).toBe("280.50");
    expect((await server.supplierQueries.getSupplierLedger()).rate).toBe("280.50");
    expect((await server.settingsQueries.getSettings()).defaultExchangeRate).toBe("250.00");

    // Choisi égal au taux des Réglages : mémorisé quand même, il ne suit plus les Réglages.
    expectOk(await server.supplier.setSupplierRateAction({ rate: "250" }));
    expectOk(await server.settings.updateSettingsAction({ defaultExchangeRate: "260" }));
    expect((await server.supplierQueries.getSupplierBalance()).rate).toBe("250.00");

    expectError(await server.supplier.setSupplierRateAction({ rate: "0" }), "VALIDATION");
  });
});
