import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  updateDocumentInput,
  type CreateDocumentInput,
  type UpdateDocumentInput,
} from "@/contracts/documents";
import { NOW, insert } from "../support/database";
import {
  INJECTED,
  expectError,
  expectOk,
  failingAfterFirstWrite,
  freshStart,
  loadServer,
  newId,
  seedCustomer,
  seedPerfume,
  stockOf,
  type Server,
} from "./support/harness";

/**
 * T2 (03 §4.3, 07 J5) : `updateDocumentAction` modifie EN PLACE — mise à jour, ajout, retrait de lignes —
 * sans jamais remettre la livraison à zéro (bug haute 01 §4.1), réserve quand une quantité passe sous le
 * livré, stock ajusté du delta livré, client et livraison prévue, mémoire de prix, atomicité.
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

type CreateLine = CreateDocumentInput["lines"][number];
type UpdateLine = NonNullable<UpdateDocumentInput["lines"]>[number];

// 50 ml : seule contenance valide avant comme après l'intégration des contenances réelles (30/50/100 → 10/50/80).
const catalogueLine = (perfumeId: number, overrides: Partial<CreateLine> = {}): CreateLine => ({
  item: { kind: "catalogue", perfumeId },
  volumeMl: 50,
  quantity: 1,
  unitPriceEur: "120",
  ...overrides,
});

async function createDocument(origin: "ORDER" | "DIRECT_SALE", lines: CreateLine[]) {
  const id = newId();
  expectOk(
    await server.documents.createDocumentAction({ id, origin, customer: { kind: "passing", name: "Fares" }, lines }),
  );
  return id;
}

const linesOf = (documentId: string) =>
  server.prisma.saleLine.findMany({ where: { documentId }, orderBy: { position: "asc" } });

type StoredLine = Awaited<ReturnType<typeof linesOf>>[number];

/** L'état d'une ligne tel que la fiche en édition le renvoie. */
const asInput = (line: StoredLine, overrides: Partial<UpdateLine> = {}): UpdateLine => ({
  id: line.id,
  volumeMl: 50,
  quantity: line.quantity,
  unitPriceEur: line.unitPriceEur.toFixed(2),
  isGift: line.isGift,
  unitCostDzd: line.unitCostDzd?.toFixed(2) ?? null,
  exchangeRate: line.exchangeRate?.toFixed(4) ?? null,
  note: line.note,
  ...overrides,
});

/** Commande confirmée, livrée en partie : Sauvage 1/3, Bleu 2/2. */
async function partiallyDeliveredOrder() {
  const sauvage = await seedPerfume(server.prisma, { name: "Sauvage", stock: 10 });
  const bleu = await seedPerfume(server.prisma, { name: "Bleu", brand: "Chanel", stock: 10 });
  const id = await createDocument("ORDER", [
    catalogueLine(sauvage.id, { quantity: 3, unitCostDzd: "30000", exchangeRate: "277" }),
    catalogueLine(bleu.id, { quantity: 2, unitPriceEur: "95" }),
  ]);
  expectOk(await server.documents.changeDocumentStatusAction({ documentId: id, to: "CONFIRMED", confirm: true }));
  const [first, second] = await linesOf(id);
  expectOk(await server.documents.setLineDeliveredAction({ documentId: id, lineId: first!.id, deliveredQuantity: 1 }));
  expectOk(await server.documents.setLineDeliveredAction({ documentId: id, lineId: second!.id, deliveredQuantity: 2 }));
  return { id, sauvage, bleu, lines: await linesOf(id) };
}

describe("T2 — la livraison survit à l'édition (bug haute 01 §4.1)", () => {
  it("ne changer qu'une note laisse deliveredQuantity intacte sur toutes les lignes, en place", async () => {
    const { id, sauvage, bleu, lines } = await partiallyDeliveredOrder();
    expect(lines.map((line) => line.deliveredQuantity)).toEqual([1, 2]);

    expectOk(
      await server.documents.updateDocumentAction({
        documentId: id,
        lines: [asInput(lines[0]!, { note: "Coffret" }), asInput(lines[1]!)],
      }),
    );
    let after = await linesOf(id);
    expect(after.map((line) => line.deliveredQuantity)).toEqual([1, 2]);
    expect(after.map((line) => line.id)).toEqual(lines.map((line) => line.id));
    expect(after.map((line) => line.createdAt.getTime())).toEqual(lines.map((line) => line.createdAt.getTime()));
    expect(after[0]?.note).toBe("Coffret");

    expectOk(await server.documents.updateDocumentAction({ documentId: id, notes: "Livrer le reste samedi" }));
    after = await linesOf(id);
    expect(after.map((line) => line.deliveredQuantity)).toEqual([1, 2]);
    expect([await stockOf(server.prisma, sauvage.id), await stockOf(server.prisma, bleu.id)]).toEqual([9, 8]);
  });
});

describe("T2 — nominal", () => {
  it("quantité et prix changés en place, ligne ajoutée sous l'id du formulaire, ligne retirée qui restitue son livré", async () => {
    const { id, sauvage, bleu, lines } = await partiallyDeliveredOrder();
    const khamrah = await seedPerfume(server.prisma, { name: "Khamrah", brand: "Lattafa", stock: 4 });
    const addedId = newId();

    const data = expectOk(
      await server.documents.updateDocumentAction({
        documentId: id,
        lines: [
          asInput(lines[0]!, { quantity: 5, unitPriceEur: "110" }),
          { id: addedId, item: { kind: "catalogue", perfumeId: khamrah.id }, volumeMl: 50, quantity: 2, unitPriceEur: "45" },
        ],
      }),
    );

    expect(data).toMatchObject({ status: "CONFIRMED", total: "640.00", due: "640.00" });
    const after = await linesOf(id);
    expect(after.map((line) => [line.id, line.perfumeName, line.quantity, line.deliveredQuantity, line.unitPriceEur.toFixed(2)])).toEqual([
      [lines[0]!.id, "Sauvage", 5, 1, "110.00"],
      [addedId, "Khamrah", 2, 0, "45.00"],
    ]);
    expect(after[1]).toMatchObject({ brandName: "Lattafa", position: 1, isOffCatalog: false });
    expect(await stockOf(server.prisma, sauvage.id)).toBe(9);
    expect(await stockOf(server.prisma, bleu.id)).toBe(10);
    expect(await stockOf(server.prisma, khamrah.id)).toBe(4);
  });

  it("quantité passée sous le livré ⇒ NEEDS_CONFIRMATION sans rien écrire ; confirmée ⇒ livré borné, stock restitué", async () => {
    const sauvage = await seedPerfume(server.prisma, { name: "Sauvage", stock: 10 });
    const id = await createDocument("ORDER", [catalogueLine(sauvage.id, { quantity: 3 })]);
    const [line] = await linesOf(id);
    expectOk(await server.documents.setLineDeliveredAction({ documentId: id, lineId: line!.id, deliveredQuantity: 2 }));
    expect(await stockOf(server.prisma, sauvage.id)).toBe(8);

    const input = { documentId: id, lines: [asInput(line!, { quantity: 1 })] };
    const reserve = expectError(await server.documents.updateDocumentAction(input), "NEEDS_CONFIRMATION");
    expect(reserve.confirm).toEqual({
      title: "Enregistrer les modifications ?",
      reserves: ["Sauvage 50 ml — 2 déjà livrés : le livré passera à 1."],
      confirmLabel: "Enregistrer",
    });
    expect((await linesOf(id))[0]).toMatchObject({ quantity: 3, deliveredQuantity: 2 });

    expectOk(await server.documents.updateDocumentAction({ ...input, confirm: true }));
    expect((await linesOf(id))[0]).toMatchObject({ quantity: 1, deliveredQuantity: 1 });
    expect(await stockOf(server.prisma, sauvage.id)).toBe(9);
  });

  it("vente directe : les lignes restent entièrement livrées (quantité, ajout, retrait) et le stock suit", async () => {
    const sauvage = await seedPerfume(server.prisma, { name: "Sauvage", stock: 5 });
    const bleu = await seedPerfume(server.prisma, { name: "Bleu", brand: "Chanel", stock: 5 });
    const id = await createDocument("DIRECT_SALE", [catalogueLine(sauvage.id), catalogueLine(bleu.id)]);
    expect([await stockOf(server.prisma, sauvage.id), await stockOf(server.prisma, bleu.id)]).toEqual([4, 4]);
    const [first] = await linesOf(id);
    const addedId = newId();

    expectOk(
      await server.documents.updateDocumentAction({
        documentId: id,
        lines: [
          asInput(first!, { quantity: 2 }),
          { id: addedId, item: { kind: "offCatalog", name: "Khamrah", brandName: "Lattafa" }, volumeMl: 50, quantity: 1, unitPriceEur: "40" },
        ],
      }),
    );

    const after = await linesOf(id);
    expect(after.map((line) => [line.perfumeName, line.quantity, line.deliveredQuantity])).toEqual([
      ["Sauvage", 2, 2],
      ["Khamrah", 1, 1],
    ]);
    expect([await stockOf(server.prisma, sauvage.id), await stockOf(server.prisma, bleu.id)]).toEqual([3, 5]);
  });

  it("changement de parfum sur une ligne livrée : l'ancien récupère son livré, le nouveau le décompte", async () => {
    const sauvage = await seedPerfume(server.prisma, { name: "Sauvage", stock: 5 });
    const bleu = await seedPerfume(server.prisma, { name: "Bleu", brand: "Chanel", stock: 5 });
    const id = await createDocument("DIRECT_SALE", [catalogueLine(sauvage.id, { quantity: 2 })]);
    const [line] = await linesOf(id);

    expectOk(
      await server.documents.updateDocumentAction({
        documentId: id,
        lines: [asInput(line!, { item: { kind: "catalogue", perfumeId: bleu.id } })],
      }),
    );

    expect((await linesOf(id))[0]).toMatchObject({ id: line!.id, perfumeId: bleu.id, perfumeName: "Bleu", brandName: "Chanel", deliveredQuantity: 2 });
    expect([await stockOf(server.prisma, sauvage.id), await stockOf(server.prisma, bleu.id)]).toEqual([5, 3]);
  });

  it("nouveau parfum au-delà du stock ⇒ « Stock insuffisant » ; confirmé ⇒ 0", async () => {
    const sauvage = await seedPerfume(server.prisma, { name: "Sauvage", stock: 5 });
    const rare = await seedPerfume(server.prisma, { name: "Rare", stock: 1 });
    const id = await createDocument("DIRECT_SALE", [catalogueLine(sauvage.id)]);
    const [line] = await linesOf(id);
    const input = { documentId: id, lines: [asInput(line!, { item: { kind: "catalogue", perfumeId: rare.id }, quantity: 2 })] };

    const reserve = expectError(await server.documents.updateDocumentAction(input), "NEEDS_CONFIRMATION");
    expect(reserve.confirm).toMatchObject({ title: "Stock insuffisant", reserves: ["Stock de Rare à 1 : la fiche passera à 0."] });
    expectOk(await server.documents.updateDocumentAction({ ...input, confirm: true }));
    expect([await stockOf(server.prisma, sauvage.id), await stockOf(server.prisma, rare.id)]).toEqual([5, 0]);
  });

  it("client : lier une fiche (snapshot), créer en ligne, commande sans nom ⇒ VALIDATION", async () => {
    const sauvage = await seedPerfume(server.prisma);
    const id = await createDocument("ORDER", [catalogueLine(sauvage.id)]);
    const lina = await seedCustomer(server.prisma, { fullName: "Lina" });

    expectOk(await server.documents.updateDocumentAction({ documentId: id, customer: { kind: "linked", customerId: lina.id } }));
    expect(await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } })).toMatchObject({
      customerId: lina.id,
      customerName: "Lina",
      customerContact: null,
    });

    expectOk(
      await server.documents.updateDocumentAction({ documentId: id, customer: { kind: "new", customer: { fullName: "Samir" } } }),
    );
    const samir = await server.prisma.customer.findFirstOrThrow({ where: { fullName: "Samir" } });
    expect((await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } })).customerId).toBe(samir.id);

    const refused = expectError(
      await server.documents.updateDocumentAction({ documentId: id, customer: { kind: "passing", name: null } }),
      "VALIDATION",
    );
    expect(refused.fields).toEqual({ customer: "Choisis le client : une commande se suit sous un nom." });
    expect((await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } })).customerId).toBe(samir.id);
  });

  it("livraison prévue et notes : absentes = inchangées ; vidées = effacées ; vente directe ⇒ VALIDATION", async () => {
    const sauvage = await seedPerfume(server.prisma);
    const id = await createDocument("ORDER", [catalogueLine(sauvage.id)]);
    expectOk(
      await server.documents.updateDocumentAction({
        documentId: id,
        expectedDeliveryAt: "2026-09-20T18:00:00+02:00",
        expectedDeliveryHasTime: true,
        notes: "Sonner deux fois",
      }),
    );
    expectOk(await server.documents.updateDocumentAction({ documentId: id }));
    let doc = await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } });
    expect([doc.expectedDeliveryAt?.toISOString(), doc.expectedDeliveryHasTime, doc.notes]).toEqual([
      "2026-09-20T16:00:00.000Z",
      true,
      "Sonner deux fois",
    ]);
    expectOk(await server.documents.updateDocumentAction({ documentId: id, expectedDeliveryAt: null, notes: "" }));
    doc = await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } });
    expect([doc.expectedDeliveryAt, doc.expectedDeliveryHasTime, doc.notes]).toEqual([null, false, null]);

    const saleId = await createDocument("DIRECT_SALE", [catalogueLine(sauvage.id)]);
    expectError(
      await server.documents.updateDocumentAction({ documentId: saleId, expectedDeliveryAt: "2026-09-20" }),
      "VALIDATION",
    );
  });

  it("renvoi du même état, ligne ajoutée comprise : rien n'est dupliqué", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 5 });
    const id = await createDocument("DIRECT_SALE", [catalogueLine(sauvage.id)]);
    const [line] = await linesOf(id);
    const input: UpdateDocumentInput = {
      documentId: id,
      lines: [asInput(line!), { id: newId(), item: { kind: "catalogue", perfumeId: sauvage.id }, volumeMl: 50, quantity: 1, unitPriceEur: "100" }],
    };
    const first = expectOk(await server.documents.updateDocumentAction(input));
    const again = expectOk(await server.documents.updateDocumentAction(input));
    expect(again).toEqual(first);
    expect(await server.prisma.saleLine.count({ where: { documentId: id } })).toBe(2);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(3);
  });

  it("mémoire de prix : seules les lignes dont le tarif change apprennent", async () => {
    const sauvage = await seedPerfume(server.prisma);
    const id = await createDocument("ORDER", [catalogueLine(sauvage.id, { unitPriceEur: "120" })]);
    // Un prix pratiqué depuis, sur une autre commande.
    await createDocument("ORDER", [catalogueLine(sauvage.id, { unitPriceEur: "130" })]);
    const price = async () =>
      (
        await server.prisma.perfumePricing.findUniqueOrThrow({
          where: { perfumeId_volumeMl: { perfumeId: sauvage.id, volumeMl: 50 } },
        })
      ).defaultUnitPriceEur.toFixed(2);
    const [line] = await linesOf(id);

    expectOk(await server.documents.updateDocumentAction({ documentId: id, lines: [asInput(line!, { note: "Coffret" })] }));
    expect(await price()).toBe("130.00");

    expectOk(await server.documents.updateDocumentAction({ documentId: id, lines: [asInput(line!, { unitPriceEur: "125" })] }));
    expect(await price()).toBe("125.00");
  });

  it("un coût en euros repris sans coût en dinars survit à l'édition (coût figé à la saisie)", async () => {
    const documentId = newId();
    const lineId = newId();
    await insert(server.prisma, "SaleDocument", { id: documentId, origin: "ORDER", status: "PENDING", customerName: "Fares", updatedAt: NOW });
    await insert(server.prisma, "SaleLine", {
      id: lineId,
      documentId,
      isOffCatalog: true,
      perfumeName: "Sauvage",
      volumeMl: 50,
      quantity: 1,
      unitPriceEur: "120.00",
      unitCostEur: "41.50",
      updatedAt: NOW,
    });
    const [line] = await linesOf(documentId);

    expectOk(await server.documents.updateDocumentAction({ documentId, lines: [asInput(line!, { note: "Coffret", quantity: 2 })] }));
    expect((await linesOf(documentId))[0]?.unitCostEur?.toFixed(2)).toBe("41.50");

    expectOk(
      await server.documents.updateDocumentAction({
        documentId,
        lines: [asInput(line!, { quantity: 2, unitCostDzd: "9000", exchangeRate: "277" })],
      }),
    );
    expect((await linesOf(documentId))[0]?.unitCostEur?.toFixed(2)).toBe("32.49");
  });
});

describe("T2 — gardes", () => {
  it("document disparu ⇒ NOT_FOUND ; ligne d'un autre document ⇒ CONFLICT ; ligne neuve sans parfum ⇒ VALIDATION", async () => {
    const sauvage = await seedPerfume(server.prisma);
    const id = await createDocument("ORDER", [catalogueLine(sauvage.id)]);
    const other = await createDocument("ORDER", [catalogueLine(sauvage.id)]);
    const [line] = await linesOf(id);
    const [foreign] = await linesOf(other);

    expectError(await server.documents.updateDocumentAction({ documentId: newId(), notes: "x" }), "NOT_FOUND");
    const stolen = expectError(
      await server.documents.updateDocumentAction({ documentId: id, lines: [asInput(line!), asInput(foreign!)] }),
      "CONFLICT",
    );
    expect(stolen.message).toBe("Une des lignes appartient à un autre document : recharge la page et réessaie.");
    const missingItem = expectError(
      await server.documents.updateDocumentAction({
        documentId: id,
        lines: [asInput(line!), { id: newId(), volumeMl: 50, quantity: 1, unitPriceEur: "10" }],
      }),
      "VALIDATION",
    );
    expect(missingItem.fields).toEqual({ "lines.1.item": "Choisis le parfum de cette ligne." });
    expect(await linesOf(other)).toHaveLength(1);
  });

  it("une ligne ne passe ni du catalogue au hors-catalogue ni l'inverse", async () => {
    const sauvage = await seedPerfume(server.prisma);
    const id = await createDocument("ORDER", [
      catalogueLine(sauvage.id),
      { item: { kind: "offCatalog", name: "Khamrah" }, volumeMl: 50, quantity: 1, unitPriceEur: "40" },
    ]);
    const [catalogue, offCatalog] = await linesOf(id);
    const toOff = expectError(
      await server.documents.updateDocumentAction({
        documentId: id,
        lines: [asInput(catalogue!, { item: { kind: "offCatalog", name: "Sauvage" } }), asInput(offCatalog!)],
      }),
      "VALIDATION",
    );
    expect(toOff.fields).toEqual({ "lines.0.item": "Cette ligne vient du catalogue : retire-la puis ajoute l'article hors catalogue." });
    expectError(
      await server.documents.updateDocumentAction({
        documentId: id,
        lines: [asInput(catalogue!), asInput(offCatalog!, { item: { kind: "catalogue", perfumeId: sauvage.id } })],
      }),
      "VALIDATION",
    );
    // Corriger le nom d'un article hors catalogue reste possible.
    expectOk(
      await server.documents.updateDocumentAction({
        documentId: id,
        lines: [asInput(catalogue!), asInput(offCatalog!, { item: { kind: "offCatalog", name: "Khamrah Qahwa", brandName: "Lattafa" } })],
      }),
    );
    expect((await linesOf(id))[1]).toMatchObject({ perfumeName: "Khamrah Qahwa", brandName: "Lattafa", isOffCatalog: true });
  });
});

describe("T2 — atomicité", () => {
  it("erreur injectée après la première écriture ⇒ lignes, livré, client et stock inchangés", async () => {
    const { id, sauvage, bleu, lines } = await partiallyDeliveredOrder();
    const before = {
      doc: await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } }),
      lines: await linesOf(id),
      stocks: [await stockOf(server.prisma, sauvage.id), await stockOf(server.prisma, bleu.id)],
    };
    const input = updateDocumentInput.parse({
      documentId: id,
      customer: { kind: "passing", name: "Nouveau nom" },
      notes: "Modifié",
      lines: [asInput(lines[0]!, { quantity: 4 })],
    });
    let written: string[] = [];

    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingAfterFirstWrite(tx);
        written = failing.written;
        return server.documentsWriter.updateDocument(failing, input);
      }),
    ).rejects.toThrow(INJECTED);

    expect(written).toEqual(["saleDocument.update"]);
    expect(await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } })).toEqual(before.doc);
    expect(await linesOf(id)).toEqual(before.lines);
    expect([await stockOf(server.prisma, sauvage.id), await stockOf(server.prisma, bleu.id)]).toEqual(before.stocks);
  });
});
