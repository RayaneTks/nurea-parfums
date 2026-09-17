import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { CreateDocumentInput } from "@/contracts/documents";
import {
  expectError,
  expectOk,
  freshStart,
  loadServer,
  newId,
  seedPerfume,
  stockOf,
  type Server,
} from "./transactions/support/harness";

/**
 * Stock (03 §4.7, 04 §11, 07 J5) : `Perfume.stock` ne bouge que du delta des quantités livrées (T1, T2,
 * T3, T4, T4b, T5, T6) ou par réglage absolu ; `NULL` = non suivi, jamais écrit ; jamais négatif en
 * silence ; lecture et écriture sous verrou de ligne ; toute écriture déclenche le contrat vitrine.
 * L'annulation (T5) et le filet « Annuler » (T4b) sont éprouvés dans `t05-cancel-document` et
 * `t04b-revert-document-change`.
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

let server: Server;
let defineAction: typeof import("@/server/core/define-action").defineAction;

beforeAll(async () => {
  server = await loadServer();
  defineAction = (await import("@/server/core/define-action")).defineAction;
});

afterAll(async () => {
  await server?.prisma.$disconnect();
});

beforeEach(async () => {
  cookieJar.current = await freshStart(server);
  cache.calls.length = 0;
});

/** `revalidateAdminCatalogue()` et les tags d'une écriture du catalogue (04 §10.2, §12). */
const CATALOGUE_INVALIDATION = [
  "updateTag:gestion",
  "updateTag:admin-catalogue",
  "revalidateTag:public-catalogue",
  "revalidateTag:admin-catalogue",
  "revalidatePath:/admin/catalogue",
  "revalidatePath:/",
];

type CreateLine = CreateDocumentInput["lines"][number];

// 50 ml : seule contenance valide avant comme après l'intégration des contenances réelles (30/50/100 → 10/50/80).
const catalogueLine = (perfumeId: number, overrides: Partial<CreateLine> = {}): CreateLine => ({
  item: { kind: "catalogue", perfumeId },
  volumeMl: 50,
  quantity: 1,
  unitPriceEur: "120",
  ...overrides,
});

async function createDocument(origin: "ORDER" | "DIRECT_SALE", lines: CreateLine[], confirm = true) {
  const id = newId();
  expectOk(
    await server.documents.createDocumentAction({ id, origin, customer: { kind: "passing", name: "Fares" }, lines, confirm }),
  );
  const created = await server.prisma.saleLine.findMany({ where: { documentId: id }, orderBy: { position: "asc" } });
  return { id, lines: created };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => (open = resolve));
  return { open, opened };
}

describe("stock — deltas des quantités livrées", () => {
  it("vente directe : un parfum suivi à 5 passe à 4 ; un parfum non suivi (NULL) reste NULL", async () => {
    const tracked = await seedPerfume(server.prisma, { stock: 5 });
    const untracked = await seedPerfume(server.prisma, { name: "Bleu", stock: null });
    await createDocument("DIRECT_SALE", [catalogueLine(tracked.id), catalogueLine(untracked.id, { quantity: 4 })]);
    expect(await stockOf(server.prisma, tracked.id)).toBe(4);
    expect(await stockOf(server.prisma, untracked.id)).toBeNull();
  });

  it("pointage partiel puis retour arrière : le stock suit chaque delta", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 10 });
    const { id, lines } = await createDocument("ORDER", [catalogueLine(sauvage.id, { quantity: 4 })]);
    const lineId = lines[0]!.id;
    for (const [delivered, stock] of [
      [3, 7],
      [1, 9],
      [0, 10],
      [4, 6],
    ] as const) {
      expectOk(await server.documents.setLineDeliveredAction({ documentId: id, lineId, deliveredQuantity: delivered }));
      expect(await stockOf(server.prisma, sauvage.id)).toBe(stock);
    }
  });

  it("suppression (T6) et retrait d'une ligne livrée (T2) restituent (l'annulation T5 : t05-cancel-document)", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 5 });
    const first = await createDocument("DIRECT_SALE", [catalogueLine(sauvage.id, { quantity: 2 })]);
    const second = await createDocument("DIRECT_SALE", [
      catalogueLine(sauvage.id),
      { item: { kind: "offCatalog", name: "Khamrah" }, volumeMl: 50, quantity: 1, unitPriceEur: "40" },
    ]);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(2);

    expectOk(await server.documents.deleteDocumentAction({ documentId: first.id }));
    expect(await stockOf(server.prisma, sauvage.id)).toBe(4);

    const kept = second.lines[1]!;
    expectOk(
      await server.documents.updateDocumentAction({
        documentId: second.id,
        lines: [{ id: kept.id, volumeMl: 50, quantity: 1, unitPriceEur: "40" }],
      }),
    );
    expect(await stockOf(server.prisma, sauvage.id)).toBe(5);
  });

  it("changement de parfum sur une ligne livrée : −livré sur l'ancien, +livré sur le nouveau", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 5 });
    const bleu = await seedPerfume(server.prisma, { name: "Bleu", stock: 5 });
    const { id, lines } = await createDocument("DIRECT_SALE", [catalogueLine(sauvage.id, { quantity: 3 })]);
    expectOk(
      await server.documents.updateDocumentAction({
        documentId: id,
        lines: [{ id: lines[0]!.id, item: { kind: "catalogue", perfumeId: bleu.id }, volumeMl: 50, quantity: 3, unitPriceEur: "120" }],
      }),
    );
    expect([await stockOf(server.prisma, sauvage.id), await stockOf(server.prisma, bleu.id)]).toEqual([5, 2]);
  });

  it("deux lignes du même parfum dont les deltas s'annulent : aucune écriture du stock", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 5 });
    await server.inTransaction(async (tx) => {
      await server.stock.applyDeliveredDeltas(
        tx,
        [
          { perfumeId: sauvage.id, delta: 2 },
          { perfumeId: sauvage.id, delta: -2 },
        ],
        { confirm: false },
      );
    });
    const perfume = await server.prisma.perfume.findUniqueOrThrow({ where: { id: sauvage.id } });
    expect([perfume.stock, perfume.updatedAt.getTime()]).toEqual([5, sauvage.updatedAt.getTime()]);
  });
});

describe("stock — plancher et réserve", () => {
  it("livraison au-delà du stock ⇒ NEEDS_CONFIRMATION, puis 0 ; déjà en rupture ⇒ « la fiche restera à 0 »", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 2 });
    const { id, lines } = await createDocument("ORDER", [catalogueLine(sauvage.id, { quantity: 5 })]);
    const lineId = lines[0]!.id;

    expect(
      expectError(await server.documents.setLineDeliveredAction({ documentId: id, lineId, deliveredQuantity: 3 }), "NEEDS_CONFIRMATION")
        .confirm?.reserves,
    ).toEqual(["Stock de Sauvage à 2 : la fiche passera à 0."]);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(2);
    expectOk(await server.documents.setLineDeliveredAction({ documentId: id, lineId, deliveredQuantity: 3, confirm: true }));
    expect(await stockOf(server.prisma, sauvage.id)).toBe(0);

    expect(
      expectError(await server.documents.setLineDeliveredAction({ documentId: id, lineId, deliveredQuantity: 4 }), "NEEDS_CONFIRMATION")
        .confirm?.reserves,
    ).toEqual(["Sauvage est en rupture : la fiche restera à 0."]);
  });

  it("le CHECK perfume_stock_ck refuse un stock négatif écrit en contournement", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 1 });
    await expect(
      server.prisma.$executeRawUnsafe(`UPDATE "Perfume" SET stock = -1 WHERE id = ${sauvage.id}`),
    ).rejects.toThrow(/perfume_stock_ck/);
  });
});

describe("stock — réglage absolu (setStock)", () => {
  it("valeur absolue, NULL = non suivi, négatif ou non entier ⇒ VALIDATION, parfum disparu ⇒ NOT_FOUND", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 5 });
    await server.inTransaction((tx) => server.stock.setStock(tx, sauvage.id, 12));
    expect(await stockOf(server.prisma, sauvage.id)).toBe(12);
    await server.inTransaction((tx) => server.stock.setStock(tx, sauvage.id, null));
    expect(await stockOf(server.prisma, sauvage.id)).toBeNull();

    for (const value of [-1, 2.5]) {
      await expect(server.inTransaction((tx) => server.stock.setStock(tx, sauvage.id, value))).rejects.toMatchObject({
        code: "VALIDATION",
        message: server.stock.STOCK_VALUE_MESSAGE,
      });
    }
    await expect(server.inTransaction((tx) => server.stock.setStock(tx, 424242, 1))).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("réglage absolu et livraison concurrents : sérialisés par le verrou de ligne, aucune écriture perdue", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 5 });
    const { id, lines } = await createDocument("ORDER", [catalogueLine(sauvage.id, { quantity: 3 })]);
    const lineId = lines[0]!.id;

    // 1. La livraison tient le verrou : le réglage attend, puis s'applique après elle.
    const deliveryHolds = gate();
    const deliveryWrote = gate();
    const delivery = server.inTransaction(async (tx) => {
      await server.documentsWriter.setLineDelivered(tx, { documentId: id, lineId, deliveredQuantity: 2, confirm: false });
      deliveryWrote.open();
      await deliveryHolds.opened;
    });
    await deliveryWrote.opened;
    let settingDone = false;
    const setting = server.inTransaction((tx) => server.stock.setStock(tx, sauvage.id, 10)).then(() => (settingDone = true));
    await sleep(250);
    expect(settingDone).toBe(false);
    deliveryHolds.open();
    await Promise.all([delivery, setting]);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(10);

    // 2. Le réglage tient le verrou : la livraison attend et relit le stock réglé (jamais une valeur périmée).
    const settingHolds = gate();
    const settingWrote = gate();
    const reset = server.inTransaction(async (tx) => {
      await server.stock.setStock(tx, sauvage.id, 4);
      settingWrote.open();
      await settingHolds.opened;
    });
    await settingWrote.opened;
    let deliveryDone = false;
    const more = server.inTransaction((tx) =>
      server.documentsWriter.setLineDelivered(tx, { documentId: id, lineId, deliveredQuantity: 3, confirm: false }),
    ).then(() => (deliveryDone = true));
    await sleep(250);
    expect(deliveryDone).toBe(false);
    settingHolds.open();
    await Promise.all([reset, more]);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(3);
  });
});

describe("stock — contrat vitrine (04 §10.2, §12)", () => {
  it("toute écriture de stock déclenche revalidateAdminCatalogue()", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 20 });

    // T1 : vente directe (ligne offerte : aucune mémoire de prix, seul le stock écrit le catalogue).
    cache.calls.length = 0;
    const sale = await createDocument("DIRECT_SALE", [catalogueLine(sauvage.id, { isGift: true, unitPriceEur: "0" })]);
    expect(cache.calls).toEqual(CATALOGUE_INVALIDATION);

    // T2 : quantité d'une ligne livrée.
    cache.calls.length = 0;
    expectOk(
      await server.documents.updateDocumentAction({
        documentId: sale.id,
        lines: [{ id: sale.lines[0]!.id, volumeMl: 50, quantity: 2, isGift: true, unitPriceEur: "0" }],
      }),
    );
    expect(cache.calls).toEqual(CATALOGUE_INVALIDATION);

    // T3 et T4 : pointer, puis livrer le reste.
    const order = await createDocument("ORDER", [catalogueLine(sauvage.id, { quantity: 3, isGift: true, unitPriceEur: "0" })]);
    cache.calls.length = 0;
    expectOk(await server.documents.setLineDeliveredAction({ documentId: order.id, lineId: order.lines[0]!.id, deliveredQuantity: 1 }));
    expect(cache.calls).toEqual(CATALOGUE_INVALIDATION);
    cache.calls.length = 0;
    expectOk(await server.documents.changeDocumentStatusAction({ documentId: order.id, to: "DELIVERED", confirm: true }));
    expect(cache.calls).toEqual(CATALOGUE_INVALIDATION);

    // T6 : suppression qui restitue.
    cache.calls.length = 0;
    expectOk(await server.documents.deleteDocumentAction({ documentId: order.id }));
    expect(cache.calls).toEqual(CATALOGUE_INVALIDATION);

    // Réglage absolu, par une action (setPerfumeStockAction arrive à J11).
    const setStockAction = defineAction("tests.setStock", z.object({ value: z.number().int().nullable() }), ({ value }) =>
      server.inTransaction((tx) => server.stock.setStock(tx, sauvage.id, value)),
    );
    cache.calls.length = 0;
    expectOk(await setStockAction({ value: 7 }));
    expect(cache.calls).toEqual(CATALOGUE_INVALIDATION);
  });

  it("sans écriture de stock ni de tarif (parfum non suivi, ligne offerte) : le catalogue n'est pas invalidé", async () => {
    const untracked = await seedPerfume(server.prisma, { stock: null });
    cache.calls.length = 0;
    await createDocument("DIRECT_SALE", [catalogueLine(untracked.id, { isGift: true, unitPriceEur: "0" })]);
    expect(cache.calls).toEqual(["updateTag:gestion"]);
  });
});
