import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createDocumentInput, type CreateDocumentInput } from "@/contracts/documents";
import { NOW, insert } from "../support/database";
import {
  INJECTED,
  counts,
  expectError,
  expectOk,
  failingAfterFirstWrite,
  freshStart,
  loadServer,
  newId,
  seedBatch,
  seedCustomer,
  seedPerfume,
  stockOf,
  type Server,
} from "./support/harness";

/**
 * T1 sans paiement (03 §4.3, 07 J5) : `createDocumentAction` — commande née PENDING, vente directe née
 * DELIVERED, snapshots typés complets, coût en euros figé par LA conversion, client lié ou créé en ligne,
 * lot ouvert exigé, stock et réserve, idempotence, mémoire de prix (N8), atomicité.
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

beforeAll(async () => {
  server = await loadServer();
});

afterAll(async () => {
  await server?.prisma.$disconnect();
});

beforeEach(async () => {
  cookieJar.current = await freshStart(server);
  cache.calls.length = 0;
});

type LineInput = CreateDocumentInput["lines"][number];

// 50 ml : seule contenance valide avant comme après l'intégration des contenances réelles (30/50/100 → 10/50/80).
const catalogueLine = (perfumeId: number, overrides: Partial<LineInput> = {}): LineInput => ({
  item: { kind: "catalogue", perfumeId },
  volumeMl: 50,
  quantity: 1,
  unitPriceEur: "120",
  ...overrides,
});

const sale = (lines: LineInput[], overrides: Partial<CreateDocumentInput> = {}): CreateDocumentInput => ({
  id: newId(),
  origin: "DIRECT_SALE",
  customer: { kind: "passing", name: "Fares" },
  lines,
  ...overrides,
});

const order = (lines: LineInput[], overrides: Partial<CreateDocumentInput> = {}): CreateDocumentInput =>
  sale(lines, { origin: "ORDER", ...overrides });

describe("T1 — nominal", () => {
  it("commande : née PENDING, sans horodatage d'engagement, lignes en snapshot typé complet, stock intact", async () => {
    const perfume = await seedPerfume(server.prisma, { stock: 5 });
    const input = order(
      [
        catalogueLine(perfume.id, {
          quantity: 2,
          unitCostDzd: "30 000",
          exchangeRate: "277",
          note: "Emballage cadeau",
        }),
        { item: { kind: "offCatalog", name: "Khamrah", brandName: "Lattafa" }, volumeMl: 50, quantity: 1, unitPriceEur: "45,50" },
      ],
      {
        customer: { kind: "passing", name: "Fares", contact: "@fares" },
        expectedDeliveryAt: "2026-09-18T14:30:00+02:00",
        expectedDeliveryHasTime: true,
        notes: "Appeler avant",
      },
    );

    const data = expectOk(await server.documents.createDocumentAction(input));

    expect(data).toEqual({ id: input.id, origin: "ORDER", status: "PENDING", total: "285.50", paid: "0.00", due: "285.50" });
    const doc = await server.prisma.saleDocument.findUniqueOrThrow({
      where: { id: input.id },
      include: { lines: { orderBy: { position: "asc" } } },
    });
    expect(doc).toMatchObject({
      origin: "ORDER",
      status: "PENDING",
      confirmedAt: null,
      deliveredAt: null,
      cancelledAt: null,
      customerId: null,
      customerName: "Fares",
      customerContact: "@fares",
      batchId: null,
      notes: "Appeler avant",
      expectedDeliveryHasTime: true,
    });
    expect(doc.expectedDeliveryAt?.toISOString()).toBe("2026-09-18T12:30:00.000Z");
    expect(
      doc.lines.map((line) => ({
        position: line.position,
        perfumeId: line.perfumeId,
        isOffCatalog: line.isOffCatalog,
        perfumeName: line.perfumeName,
        brandName: line.brandName,
        imageUrl: line.imageUrl,
        volumeMl: line.volumeMl,
        quantity: line.quantity,
        deliveredQuantity: line.deliveredQuantity,
        unitPriceEur: line.unitPriceEur.toFixed(2),
        isGift: line.isGift,
        unitCostDzd: line.unitCostDzd?.toFixed(2) ?? null,
        exchangeRate: line.exchangeRate?.toFixed(4) ?? null,
        unitCostEur: line.unitCostEur?.toFixed(2) ?? null,
        note: line.note,
      })),
    ).toEqual([
      {
        position: 0,
        perfumeId: perfume.id,
        isOffCatalog: false,
        perfumeName: "Sauvage",
        brandName: "Dior",
        imageUrl: "https://cdn.example/sauvage.webp",
        volumeMl: 50,
        quantity: 2,
        deliveredQuantity: 0,
        unitPriceEur: "120.00",
        isGift: false,
        unitCostDzd: "30000.00",
        exchangeRate: "277.0000",
        unitCostEur: "108.30",
        note: "Emballage cadeau",
      },
      {
        position: 1,
        perfumeId: null,
        isOffCatalog: true,
        perfumeName: "Khamrah",
        brandName: "Lattafa",
        imageUrl: null,
        volumeMl: 50,
        quantity: 1,
        deliveredQuantity: 0,
        unitPriceEur: "45.50",
        isGift: false,
        unitCostDzd: null,
        exchangeRate: null,
        unitCostEur: null,
        note: null,
      },
    ]);
    expect(await stockOf(server.prisma, perfume.id)).toBe(5);
  });

  it("livraison prévue sans heure : le jour à 00:00 Europe/Paris", async () => {
    const perfume = await seedPerfume(server.prisma);
    const input = order([catalogueLine(perfume.id)], { expectedDeliveryAt: "2026-09-18T15:00:00+02:00" });
    expectOk(await server.documents.createDocumentAction(input));
    const doc = await server.prisma.saleDocument.findUniqueOrThrow({ where: { id: input.id } });
    expect(doc.expectedDeliveryAt?.toISOString()).toBe("2026-09-17T22:00:00.000Z");
    expect(doc.expectedDeliveryHasTime).toBe(false);
  });

  it("vente directe : née DELIVERED, engagée et livrée à l'instant, livré complet ; stock suivi 5 ⇒ 4, non suivi intact", async () => {
    const tracked = await seedPerfume(server.prisma, { name: "Sauvage", stock: 5 });
    const untracked = await seedPerfume(server.prisma, { name: "Eau Sauvage", stock: null });
    const input = sale([catalogueLine(tracked.id), catalogueLine(untracked.id, { quantity: 3, unitPriceEur: "90" })]);

    const data = expectOk(await server.documents.createDocumentAction(input));

    expect(data).toMatchObject({ status: "DELIVERED", total: "390.00", due: "390.00" });
    const doc = await server.prisma.saleDocument.findUniqueOrThrow({ where: { id: input.id }, include: { lines: true } });
    expect(doc.confirmedAt).not.toBeNull();
    expect(doc.deliveredAt?.getTime()).toBe(doc.confirmedAt?.getTime());
    expect(doc.cancelledAt).toBeNull();
    expect(doc.lines.map((line) => [line.quantity, line.deliveredQuantity])).toEqual(
      expect.arrayContaining([
        [1, 1],
        [3, 3],
      ]),
    );
    expect(await stockOf(server.prisma, tracked.id)).toBe(4);
    expect(await stockOf(server.prisma, untracked.id)).toBeNull();
    // Stock écrit ⇒ contrat vitrine (04 §10.2, §12).
    expect(cache.calls).toContain("revalidateTag:public-catalogue");
  });

  it("coût 30 000 DZD au taux 277 ⇒ unitCostEur 108,30 ; coût DZD absent ⇒ NULL (même avec un taux)", async () => {
    const perfume = await seedPerfume(server.prisma);
    const input = order([
      catalogueLine(perfume.id, { unitCostDzd: "30000", exchangeRate: "277" }),
      catalogueLine(perfume.id, { volumeMl: 50, exchangeRate: "277" }),
    ]);
    expectOk(await server.documents.createDocumentAction(input));
    const lines = await server.prisma.saleLine.findMany({ where: { documentId: input.id }, orderBy: { position: "asc" } });
    expect(lines.map((line) => line.unitCostEur?.toFixed(2) ?? null)).toEqual(["108.30", null]);
    expect(lines[1]?.exchangeRate?.toFixed(0)).toBe("277");
  });
});

describe("T1 — gardes", () => {
  it("ligne offerte à prix non nul ⇒ VALIDATION, rien d'écrit ; le CHECK line_gift_ck refuse un contournement SQL", async () => {
    const perfume = await seedPerfume(server.prisma);
    const refused = expectError(
      await server.documents.createDocumentAction(order([catalogueLine(perfume.id, { isGift: true, unitPriceEur: "10" })])),
      "VALIDATION",
    );
    expect(refused.fields).toEqual({ "lines.0.unitPriceEur": "Mets le prix de la ligne offerte à 0 € ou décoche Offert." });
    expect(await counts(server.prisma)).toMatchObject({ documents: 0, lines: 0 });

    const documentId = newId();
    await insert(server.prisma, "SaleDocument", { id: documentId, origin: "ORDER", status: "PENDING", updatedAt: NOW });
    await expect(
      insert(server.prisma, "SaleLine", {
        id: newId(),
        documentId,
        perfumeName: "Sauvage",
        volumeMl: 50,
        quantity: 1,
        unitPriceEur: "10.00",
        isGift: true,
        updatedAt: NOW,
      }),
    ).rejects.toThrow(/line_gift_ck/);
  });

  it("une ligne offerte à 0 € passe et n'apprend aucun prix", async () => {
    const perfume = await seedPerfume(server.prisma);
    const input = order([catalogueLine(perfume.id, { isGift: true, unitPriceEur: "" })]);
    expect(expectOk(await server.documents.createDocumentAction(input))).toMatchObject({ total: "0.00" });
    expect(await server.prisma.perfumePricing.count()).toBe(0);
  });

  it("client : fiche liée (snapshot du nom), fiche créée en ligne, numéro déjà pris ⇒ CONFLICT sans rien écrire", async () => {
    const perfume = await seedPerfume(server.prisma);
    const lina = await seedCustomer(server.prisma, { fullName: "Lina", phoneE164: "+33612345678" });

    const linked = order([catalogueLine(perfume.id)], { customer: { kind: "linked", customerId: lina.id } });
    expectOk(await server.documents.createDocumentAction(linked));
    expect(await server.prisma.saleDocument.findUniqueOrThrow({ where: { id: linked.id } })).toMatchObject({
      customerId: lina.id,
      customerName: "Lina",
      customerContact: null,
    });

    const created = order([catalogueLine(perfume.id)], {
      customer: { kind: "new", customer: { fullName: "Samir", phone: "07 11 22 33 44" } },
    });
    expectOk(await server.documents.createDocumentAction(created));
    const samir = await server.prisma.customer.findUniqueOrThrow({ where: { phoneE164: "+33711223344" } });
    expect(await server.prisma.saleDocument.findUniqueOrThrow({ where: { id: created.id } })).toMatchObject({
      customerId: samir.id,
      customerName: "Samir",
    });

    const before = await counts(server.prisma);
    const taken = order([catalogueLine(perfume.id)], {
      customer: { kind: "new", customer: { fullName: "Autre", phone: "06 12 34 56 78" } },
    });
    const error = expectError(await server.documents.createDocumentAction(taken), "CONFLICT");
    expect(error.message).toBe("Ce numéro est déjà celui de Lina.");
    expect(await counts(server.prisma)).toEqual(before);
  });

  it("fiche liée disparue ⇒ NOT_FOUND ; commande sans nom ⇒ VALIDATION sous le client", async () => {
    const perfume = await seedPerfume(server.prisma);
    expectError(
      await server.documents.createDocumentAction(
        order([catalogueLine(perfume.id)], { customer: { kind: "linked", customerId: newId() } }),
      ),
      "NOT_FOUND",
    );
    const nameless = expectError(
      await server.documents.createDocumentAction(order([catalogueLine(perfume.id)], { customer: { kind: "passing" } })),
      "VALIDATION",
    );
    expect(nameless.fields).toEqual({ customer: "Choisis le client : une commande se suit sous un nom." });
    expect(await counts(server.prisma)).toMatchObject({ documents: 0 });
  });

  it("lot : ouvert ⇒ rattaché dès la création (N9) ; clos ⇒ CONFLICT ; disparu ⇒ NOT_FOUND", async () => {
    const perfume = await seedPerfume(server.prisma);
    const open = await seedBatch(server.prisma, { name: "Avril" });
    const closed = await seedBatch(server.prisma, { name: "Mars", status: "CLOSED" });

    const attached = sale([catalogueLine(perfume.id)], { batchId: open.id });
    expectOk(await server.documents.createDocumentAction(attached));
    expect((await server.prisma.saleDocument.findUniqueOrThrow({ where: { id: attached.id } })).batchId).toBe(open.id);

    const refused = expectError(
      await server.documents.createDocumentAction(sale([catalogueLine(perfume.id)], { batchId: closed.id })),
      "CONFLICT",
    );
    expect(refused.message).toBe("Le lot « Mars » est clos : rouvre-le pour y rattacher cette vente.");

    expectError(
      await server.documents.createDocumentAction(sale([catalogueLine(perfume.id)], { batchId: newId() })),
      "NOT_FOUND",
    );
    expect(await counts(server.prisma)).toMatchObject({ documents: 1 });
  });

  it("parfum disparu du catalogue ⇒ NOT_FOUND, rien d'écrit", async () => {
    const error = expectError(await server.documents.createDocumentAction(sale([catalogueLine(424242)])), "NOT_FOUND");
    expect(error.message).toBe("Ce parfum n'existe plus dans le catalogue : choisis-en un autre.");
    expect(await counts(server.prisma)).toMatchObject({ documents: 0 });
  });

  it("vente au-delà du stock ⇒ NEEDS_CONFIRMATION sans rien écrire ; confirmée ⇒ fiche à 0", async () => {
    const perfume = await seedPerfume(server.prisma, { stock: 1 });
    const input = sale([catalogueLine(perfume.id, { quantity: 3 })]);

    const reserve = expectError(await server.documents.createDocumentAction(input), "NEEDS_CONFIRMATION");
    expect(reserve.confirm).toEqual({
      title: "Stock insuffisant",
      reserves: ["Stock de Sauvage à 1 : la fiche passera à 0."],
      confirmLabel: "Continuer",
    });
    expect(await counts(server.prisma)).toMatchObject({ documents: 0, lines: 0, pricings: 0 });
    expect(await stockOf(server.prisma, perfume.id)).toBe(1);

    expectOk(await server.documents.createDocumentAction({ ...input, confirm: true }));
    expect(await stockOf(server.prisma, perfume.id)).toBe(0);
  });
});

describe("T1 — idempotence (04 §3.6)", () => {
  it("renvoi du même identifiant : un document, deux succès identiques, stock décrémenté une fois", async () => {
    const perfume = await seedPerfume(server.prisma, { stock: 5 });
    const input = sale([catalogueLine(perfume.id, { quantity: 2 })]);
    const first = expectOk(await server.documents.createDocumentAction(input));
    const again = expectOk(await server.documents.createDocumentAction({ ...input, lines: [catalogueLine(perfume.id)] }));
    expect(again).toEqual(first);
    expect(await counts(server.prisma)).toMatchObject({ documents: 1, lines: 1 });
    expect(await stockOf(server.prisma, perfume.id)).toBe(3);
  });

  it("deux envois croisés : une ligne en base, deux succès", async () => {
    const perfume = await seedPerfume(server.prisma, { stock: 5 });
    const input = sale([catalogueLine(perfume.id)]);
    const results = await Promise.all([
      server.documents.createDocumentAction(input),
      server.documents.createDocumentAction(input),
    ]);
    expect(results.map((result) => result.ok)).toEqual([true, true]);
    expect(await counts(server.prisma)).toMatchObject({ documents: 1, lines: 1 });
    expect(await stockOf(server.prisma, perfume.id)).toBe(4);
  });
});

describe("T1 — mémoire de prix apprenante (N8)", () => {
  it("le dernier prix pratiqué remplace le précédent ; un coût absent garde le coût mémorisé", async () => {
    const perfume = await seedPerfume(server.prisma);
    const pricing = () =>
      server.prisma.perfumePricing.findUniqueOrThrow({ where: { perfumeId_volumeMl: { perfumeId: perfume.id, volumeMl: 50 } } });

    expectOk(
      await server.documents.createDocumentAction(
        order([catalogueLine(perfume.id, { unitPriceEur: "110", unitCostDzd: "9000", exchangeRate: "270" })]),
      ),
    );
    let memory = await pricing();
    expect([memory.defaultUnitPriceEur.toFixed(2), memory.defaultUnitCostDzd?.toFixed(2), memory.defaultExchangeRate?.toFixed(0)]).toEqual([
      "110.00",
      "9000.00",
      "270",
    ]);

    expectOk(await server.documents.createDocumentAction(order([catalogueLine(perfume.id, { unitPriceEur: "125" })])));
    memory = await pricing();
    expect([memory.defaultUnitPriceEur.toFixed(2), memory.defaultUnitCostDzd?.toFixed(2), memory.defaultExchangeRate?.toFixed(0)]).toEqual([
      "125.00",
      "9000.00",
      "270",
    ]);
  });
});

describe("T1 — atomicité", () => {
  it.each([
    ["fiche créée en ligne", { kind: "new", customer: { fullName: "Samir", phone: "07 11 22 33 44" } }, "customer.create"],
    ["client de passage", { kind: "passing", name: "Fares" }, "saleDocument.create"],
  ] as const)("erreur injectée après la première écriture (%s) ⇒ aucune ligne en base, stock intact", async (_, customer, firstWrite) => {
    const perfume = await seedPerfume(server.prisma, { stock: 5 });
    const input = createDocumentInput.parse(sale([catalogueLine(perfume.id, { unitCostDzd: "9000", exchangeRate: "277" })], { customer }));
    let written: string[] = [];

    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingAfterFirstWrite(tx);
        written = failing.written;
        return server.documentsWriter.createDocument(failing, input);
      }),
    ).rejects.toThrow(INJECTED);

    expect(written).toEqual([firstWrite]);
    expect(await counts(server.prisma)).toEqual({ documents: 0, lines: 0, customers: 0, pricings: 0 });
    expect(await stockOf(server.prisma, perfume.id)).toBe(5);
  });
});
