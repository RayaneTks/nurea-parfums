import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { catalogueLine, createDocument, expectInvariants, loadMoneyServer, type MoneyServer } from "./transactions/support/argent";
import { expectError, expectOk, freshStart, newId, seedBatch, seedPerfume } from "./transactions/support/harness";
import { dzd, dzdFromDb, toDb } from "@/domain/money";

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
  batchQueries: typeof import("@/server/batches/queries");
};

let server: Server;

beforeAll(async () => {
  const money = await loadMoneyServer();
  server = {
    ...money,
    supplier: await import("@/server/supplier/actions"),
    supplierQueries: await import("@/server/supplier/queries"),
    batchQueries: await import("@/server/batches/queries"),
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
    const item = { kind: "batch" as const, batchId: batch.id };
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
          { kind: "document", documentId },
          { kind: "batch", batchId: batch.id },
        ],
      }),
    );

    const sheet = await server.supplierQueries.getSupplierEntry(entryId);
    expect(sheet?.items).toEqual([
      // Coût recalculé par le serveur : la ligne de `createDocument` n'a pas de coût en dinars.
      expect.objectContaining({ kind: "document", documentId, origin: "ORDER", customerName: "Farès", amountDzd: "0.00" }),
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
        items: [{ kind: "document", documentId: newId() }],
      }),
      "NOT_FOUND",
    );
    expect(error.message).toContain("n'existe plus");
    expect(await server.prisma.supplierEntry.count()).toBe(0);
  });
});

describe("sélecteur S25 : coût d'achat en dinars", () => {
  /** Un document rattaché au lot, ses lignes avec ou sans coût en dinars. */
  async function documentOf(options: {
    batchId: string;
    customer: string;
    confirm?: boolean;
    lines: { quantity: number; unitCostDzd?: string }[];
  }) {
    const id = newId();
    const lines = [];
    for (const line of options.lines) {
      const perfume = await seedPerfume(server.prisma, { name: `Parfum ${newId().slice(0, 8)}` });
      lines.push(
        catalogueLine(perfume.id, {
          quantity: line.quantity,
          ...(line.unitCostDzd ? { unitCostDzd: line.unitCostDzd, exchangeRate: "277" } : {}),
        }),
      );
    }
    expectOk(
      await server.documents.createDocumentAction({
        id,
        // Une vente directe est engagée dès sa création ; une commande reste en attente.
        origin: options.confirm === false ? "ORDER" : "DIRECT_SALE",
        customer: { kind: "passing", name: options.customer },
        lines,
        batchId: options.batchId,
        payments: [],
        confirm: options.confirm ?? true,
      }),
    );
    return id;
  }

  it("Σ quantité × coût en DA au centime de la relecture d'achat de E06 ; attente comprise, annulé exclu, sans coût compté à part", async () => {
    const lot = await seedBatch(server.prisma, { name: "Lot de mars" });
    const fares = await documentOf({ batchId: lot.id, customer: "Farès", lines: [{ quantity: 2, unitCostDzd: "27700.55" }] });
    const lina = await documentOf({ batchId: lot.id, customer: "Lina", lines: [{ quantity: 1, unitCostDzd: "9000" }, { quantity: 3 }] });
    const nora = await documentOf({ batchId: lot.id, customer: "Nora", confirm: false, lines: [{ quantity: 1, unitCostDzd: "12000" }] });
    const sami = await documentOf({ batchId: lot.id, customer: "Sami", lines: [{ quantity: 1, unitCostDzd: "50000" }] });
    expectOk(await server.documents.cancelDocumentAction({ documentId: sami, confirm: true }));

    const picker = await server.supplierQueries.getSupplierPicker();
    const byId = new Map(picker.documents.map((doc) => [doc.id, doc]));
    expect([...byId.keys()].sort()).toEqual([fares, lina, nora].sort());
    expect(byId.get(fares)).toMatchObject({ costDzd: "55401.10", missingLines: 0, origin: "DIRECT_SALE", batchId: lot.id });
    expect(byId.get(lina)).toMatchObject({ costDzd: "9000.00", missingLines: 1, lineCount: 2 });
    expect(byId.get(nora)).toMatchObject({ costDzd: "12000.00", status: "PENDING" });
    expect(picker.batches).toEqual([
      expect.objectContaining({ id: lot.id, name: "Lot de mars", documentCount: 3, costDzd: "76401.10", missingLines: 1, noted: null }),
    ]);

    // Parité avec E06 (tuile « Achat des parfums ») sur son périmètre, les documents engagés.
    const sheet = await server.batchQueries.batchSheet(lot.id);
    const { purchaseDetail } = await import("@/features/batches/components/supplier-model");
    const detail = purchaseDetail(sheet!.lines);
    const engaged = [fares, lina].map((id) => dzdFromDb(byId.get(id)!.costDzd));
    expect(toDb(detail.totalDzd)).toBe(toDb(dzd.sum(engaged)));
    expect(detail.unknown).toBe(1);
  });

  it("le serveur recalcule le coût coché ; « déjà noté » remonte avec la dette, directement ou par le lot", async () => {
    const lot = await seedBatch(server.prisma, { name: "Lot d'avril" });
    const fares = await documentOf({ batchId: lot.id, customer: "Farès", lines: [{ quantity: 1, unitCostDzd: "27700" }] });
    const entryId = newId();
    expectOk(
      await server.supplier.recordSupplierEntryAction({
        id: entryId,
        kind: "DEBT",
        amountDzd: "30000",
        label: "Dette du lot d'avril",
        items: [{ kind: "batch", batchId: lot.id }],
      }),
    );
    const sheet = await server.supplierQueries.getSupplierEntry(entryId);
    expect(sheet).toMatchObject({ amountDzd: "30000.00", items: [expect.objectContaining({ kind: "batch", amountDzd: "27700.00" })] });

    const picker = await server.supplierQueries.getSupplierPicker();
    expect(picker.batches[0]?.noted).toMatchObject({ entryId, label: "Dette du lot d'avril" });
    expect(picker.documents.find((doc) => doc.id === fares)?.noted).toMatchObject({ entryId });

    // Déjà noté reste cochable : une seconde dette sur le même document s'écrit.
    expectOk(
      await server.supplier.recordSupplierEntryAction({ id: newId(), kind: "DEBT", amountDzd: "100", items: [{ kind: "document", documentId: fares }] }),
    );
    expect(await server.prisma.supplierEntryItem.count()).toBe(2);
  });

  it("un document annulé entre-temps : NOT_FOUND, rien d'écrit", async () => {
    const lot = await seedBatch(server.prisma, { name: "Lot" });
    const doc = await documentOf({ batchId: lot.id, customer: "Farès", lines: [{ quantity: 1, unitCostDzd: "100" }] });
    expectOk(await server.documents.cancelDocumentAction({ documentId: doc, confirm: true }));
    expectError(
      await server.supplier.recordSupplierEntryAction({ id: newId(), kind: "DEBT", amountDzd: "100", items: [{ kind: "document", documentId: doc }] }),
      "NOT_FOUND",
    );
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
      await server.supplier.recordSupplierEntryAction({ id, kind: "DEBT", amountDzd: "10", items: [{ kind: "batch", batchId: batch.id }] }),
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
