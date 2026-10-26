import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  balanceOf,
  catalogueLine,
  createDocument,
  expectInvariants,
  loadMoneyServer,
  paymentsOf,
  seedPocket,
  viewBalance,
  type MoneyServer,
} from "./support/argent";
import { expectError, expectOk, freshStart, newId, seedPerfume } from "./support/harness";

/**
 * « Le client se désiste » (docs/admin/desistements.md) : annulation motivée d'une commande pas livrée ;
 * acompte gardé sauf remboursement choisi ; flacons d'une confirmée passés en stock, un par unité ;
 * réactivation qui les retire (refusée s'ils ont été revendus) ; « Retirer du stock ».
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
let stock: typeof import("@/server/stock/actions");
let stockQueries: typeof import("@/server/stock/queries");

beforeAll(async () => {
  server = await loadMoneyServer();
  stock = await import("@/server/stock/actions");
  stockQueries = await import("@/server/stock/queries");
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

const withdraw = (documentId: string, refunds: { amount: string; pocketId: string | null }[] = []) =>
  server.documents.withdrawDocumentAction({
    documentId,
    refunds: refunds.map((refund) => ({ id: newId(), ...refund })),
    confirm: false,
  });

const bottlesOf = (documentId: string) =>
  server.prisma.stockBottle.findMany({ where: { sourceDocumentId: documentId }, orderBy: { id: "asc" } });

describe("désistement d'une commande confirmée", () => {
  it("acompte gardé : CANCELLED + WITHDRAWN, payé intact, un flacon par unité non offerte, coût et prix copiés", async () => {
    const yara = await seedPerfume(server.prisma, { name: "Yara" });
    const id = await createDocument(server, {
      origin: "ORDER",
      customer: { kind: "passing", name: "Faycal" },
      lines: [
        catalogueLine(yara.id, { quantity: 2, volumeMl: 80, unitPriceEur: "45", unitCostDzd: "2770", exchangeRate: "277" }),
        catalogueLine(yara.id, { quantity: 1, volumeMl: 10, unitPriceEur: "0", isGift: true }),
      ],
      received: [{ amount: "20", pocketId: null }],
    });
    expect((await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } })).status).toBe("CONFIRMED");

    const data = expectOk(await withdraw(id));

    expect(data).toMatchObject({ document: { status: "CANCELLED", paid: "20.00" }, refunds: [], bottles: 2 });
    const doc = await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } });
    expect(doc.cancelReason).toBe("WITHDRAWN");
    expect(doc.customerName).toBe("Faycal");
    const bottles = await bottlesOf(id);
    expect(bottles).toHaveLength(2);
    expect(bottles[0]).toMatchObject({ perfumeId: yara.id, volumeMl: 80, sourceCustomer: "Faycal", soldLineId: null });
    expect(bottles[0]!.plannedPriceEur.toString()).toBe("45");
    expect(bottles[0]!.unitCostEur?.toString()).toBe("10");
    expect((await viewBalance(server.prisma, id))?.paid).toBe("20.00");
  });

  it("acompte rendu en partie : un REFUND ordinaire, le reste gardé", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const id = await createDocument(server, { origin: "ORDER", received: [{ amount: "30", pocketId: cash.id }] });
    const data = expectOk(await withdraw(id, [{ amount: "10", pocketId: cash.id }]));
    expect(data.document).toMatchObject({ status: "CANCELLED", paid: "20.00" });
    expect(data.refunds).toEqual([expect.objectContaining({ kind: "REFUND", amount: "-10.00" })]);
    expect(await balanceOf(server.prisma, cash.id)).toBe("20.00");
    expect((await paymentsOf(server.prisma, id)).length).toBe(2);
  });

  it("commande En attente : désistée, aucun flacon en stock", async () => {
    const id = await createDocument(server, { origin: "ORDER" });
    expect((await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } })).status).toBe("PENDING");
    expect(expectOk(await withdraw(id)).bottles).toBe(0);
    expect(await bottlesOf(id)).toEqual([]);
  });
});

describe("refus", () => {
  it("vente directe, commande livrée ou déjà annulée ⇒ CONFLICT, rien d'écrit", async () => {
    const sale = await createDocument(server, { origin: "DIRECT_SALE", received: [{ amount: "120", pocketId: null }] });
    expect(expectError(await withdraw(sale), "CONFLICT").message).toBe(
      "Seule une commande peut être désistée : annule plutôt cette vente.",
    );

    const order = await createDocument(server, { origin: "ORDER", received: [{ amount: "20", pocketId: null }] });
    const [line] = await server.prisma.saleLine.findMany({ where: { documentId: order } });
    expectOk(await server.documents.setLineDeliveredAction({ documentId: order, lineId: line!.id, deliveredQuantity: 1 }));
    expect(expectError(await withdraw(order), "CONFLICT").message).toBe(
      "Cette commande est déjà livrée, en tout ou en partie : annule-la plutôt.",
    );

    const cancelled = await createDocument(server, { origin: "ORDER" });
    expectOk(await server.documents.cancelDocumentAction({ documentId: cancelled, refunds: [], confirm: false }));
    expectError(await withdraw(cancelled), "CONFLICT");
    expect(await server.prisma.stockBottle.count()).toBe(0);
  });
});

describe("réactivation et stock", () => {
  it("réactiver une désistée retire ses flacons et efface le motif ; sans filet « Annuler »", async () => {
    const id = await createDocument(server, { origin: "ORDER", received: [{ amount: "20", pocketId: null }] });
    expectOk(await withdraw(id));
    expect(await bottlesOf(id)).toHaveLength(1);

    const data = expectOk(await server.documents.changeDocumentStatusAction({ documentId: id, to: "PENDING", confirm: true }));
    expect(data.undo).toBeNull();
    const doc = await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } });
    expect(doc).toMatchObject({ status: "PENDING", cancelReason: null });
    expect(await bottlesOf(id)).toEqual([]);
  });

  it("un flacon revendu bloque la réactivation", async () => {
    const id = await createDocument(server, { origin: "ORDER", received: [{ amount: "20", pocketId: null }] });
    expectOk(await withdraw(id));
    const sale = await createDocument(server, { origin: "DIRECT_SALE", received: [{ amount: "120", pocketId: null }] });
    const [saleLine] = await server.prisma.saleLine.findMany({ where: { documentId: sale } });
    const [bottle] = await bottlesOf(id);
    // La revente arrive en phase 3 : on simule le lien posé par son writer.
    await server.prisma.stockBottle.update({ where: { id: bottle!.id }, data: { soldLineId: saleLine!.id } });

    expect(
      expectError(await server.documents.changeDocumentStatusAction({ documentId: id, to: "PENDING", confirm: true }), "CONFLICT")
        .message,
    ).toBe("Un flacon de cette commande a déjà été revendu : elle ne peut plus être réactivée. Crée plutôt une nouvelle commande.");
    expect((await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } })).cancelReason).toBe("WITHDRAWN");
    expect(await stockQueries.availableBottles()).toEqual([]);
  });

  it("liste En stock puis « Retirer du stock » ; un second retrait ne fait rien", async () => {
    const id = await createDocument(server, {
      origin: "ORDER",
      customer: { kind: "passing", name: "François" },
      received: [{ amount: "20", pocketId: null }],
    });
    expectOk(await withdraw(id));
    const [listed] = await stockQueries.availableBottles();
    expect(listed).toMatchObject({ sourceCustomer: "François", sourceDocumentId: id, plannedPriceEur: "120.00" });

    expect(expectOk(await stock.removeStockBottleAction({ id: listed!.id }))).toEqual({ id: listed!.id, removed: true });
    expect(expectOk(await stock.removeStockBottleAction({ id: listed!.id }))).toEqual({ id: listed!.id, removed: false });
    expect(await stockQueries.availableBottles()).toEqual([]);
  });

  it("les articles d'une désistée ne se modifient plus", async () => {
    const perfume = await seedPerfume(server.prisma, { name: "Libre" });
    const id = await createDocument(server, { origin: "ORDER", perfumeId: perfume.id, received: [{ amount: "20", pocketId: null }] });
    expectOk(await withdraw(id));
    const [line] = await server.prisma.saleLine.findMany({ where: { documentId: id } });
    const result = await server.documents.updateDocumentAction({
      documentId: id,
      lines: [{ id: line!.id, volumeMl: 50, quantity: 2, unitPriceEur: "120" }],
    });
    expect(expectError(result, "CONFLICT").message).toBe(
      "Cette commande est désistée : ses articles ne se modifient plus. Réactive-la d'abord si c'était une erreur.",
    );
  });

  it("supprimer la commande d'origine garde le flacon et sa provenance copiée", async () => {
    const id = await createDocument(server, { origin: "ORDER", customer: { kind: "passing", name: "khali.khali" } });
    expectOk(await server.documents.changeDocumentStatusAction({ documentId: id, to: "CONFIRMED", confirm: true }));
    expectOk(await withdraw(id));
    expectOk(await server.documents.deleteDocumentAction({ documentId: id }));
    const [bottle] = await stockQueries.availableBottles();
    expect(bottle).toMatchObject({ sourceCustomer: "khali.khali", sourceDocumentId: null, sourceOrderedAt: null });
  });
});

describe("revendre un flacon en stock (Vendre)", () => {
  const stockedBottle = async () => {
    const perfume = await seedPerfume(server.prisma, { name: "Yara" });
    const order = await createDocument(server, {
      origin: "ORDER",
      customer: { kind: "passing", name: "Faycal" },
      lines: [catalogueLine(perfume.id, { volumeMl: 80, unitPriceEur: "45", unitCostDzd: "2770", exchangeRate: "277" })],
      received: [{ amount: "20", pocketId: null }],
    });
    expectOk(await withdraw(order));
    const [bottle] = await stockQueries.availableBottles();
    return { perfume, bottle: bottle!, order };
  };

  const sellBottle = (perfumeId: number, bottleId: string, quantity = 1) =>
    server.documents.createDocumentAction({
      id: newId(),
      origin: "DIRECT_SALE",
      customer: { kind: "passing", name: "Sarah" },
      lines: [{ ...catalogueLine(perfumeId, { volumeMl: 80, unitPriceEur: "45", unitCostDzd: "2770", exchangeRate: "277", quantity }), bottleId }],
      payments: [{ id: newId(), amount: "45", pocketId: null }],
      confirm: true,
    });

  it("la vente reprend le flacon : il quitte le stock, la commande d'origine dit à qui il a été revendu", async () => {
    const { perfume, bottle, order } = await stockedBottle();
    const sale = expectOk(await sellBottle(perfume.id, bottle.id));
    expect(await stockQueries.availableBottles()).toEqual([]);
    const { documentSheet } = await import("@/server/documents/queries");
    const sheet = await documentSheet(order);
    expect(sheet?.bottles).toEqual([expect.objectContaining({ id: bottle.id, soldTo: "Sarah" })]);
    expect(sale.id).toBeTruthy();
  });

  it("un flacon déjà revendu refuse une seconde vente, sans rien écrire", async () => {
    const { perfume, bottle } = await stockedBottle();
    expectOk(await sellBottle(perfume.id, bottle.id));
    const before = await server.prisma.saleDocument.count();
    expect(expectError(await sellBottle(perfume.id, bottle.id), "CONFLICT").message).toBe(
      "Ce flacon vient d'être vendu ou retiré du stock : retire-le de la vente, puis choisis-en un autre dans « Déjà en stock ».",
    );
    expect(await server.prisma.saleDocument.count()).toBe(before);
  });

  it("une ligne de flacon compte une seule unité", async () => {
    const { perfume, bottle } = await stockedBottle();
    expectError(await sellBottle(perfume.id, bottle.id, 2), "VALIDATION");
  });

  it("annuler la vente rend le flacon au stock", async () => {
    const { perfume, bottle } = await stockedBottle();
    const sale = expectOk(await sellBottle(perfume.id, bottle.id));
    expectOk(await server.documents.cancelDocumentAction({ documentId: sale.id, refunds: [], confirm: true }));
    expect((await stockQueries.availableBottles()).map((b) => b.id)).toEqual([bottle.id]);
  });
});

describe("acompte laissé (fiche client, Vendre)", () => {
  it("le payé net d'une désistée liée à une fiche est son acompte laissé ; la fiche le liste et l'historique dit « Désistée »", async () => {
    const faycal = await server.prisma.customer.create({ data: { fullName: "Faycal" } });
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const id = await createDocument(server, {
      origin: "ORDER",
      customer: { kind: "linked", customerId: faycal.id },
      received: [{ amount: "20", pocketId: cash.id }],
    });
    expectOk(await withdraw(id, [{ amount: "5", pocketId: cash.id }]));

    const { keptDeposits, customerSheet } = await import("@/server/customers/queries");
    expect(await keptDeposits()).toEqual([expect.objectContaining({ documentId: id, customerId: faycal.id, fullName: "Faycal", amount: "15.00" })]);
    const sheet = await customerSheet(faycal.id);
    expect(sheet?.keptDeposits.map((deposit) => deposit.amount)).toEqual(["15.00"]);
    expect(sheet?.history.rows[0]).toMatchObject({ id, status: "CANCELLED", cancelReason: "WITHDRAWN", paid: "15.00", due: null });
  });

  it("une désistée sans rien de payé ne laisse aucun acompte", async () => {
    const khali = await server.prisma.customer.create({ data: { fullName: "khali.khali" } });
    const id = await createDocument(server, { origin: "ORDER", customer: { kind: "linked", customerId: khali.id } });
    expectOk(await withdraw(id));
    const { keptDeposits } = await import("@/server/customers/queries");
    expect(await keptDeposits()).toEqual([]);
  });
});
