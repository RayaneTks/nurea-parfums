import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateDocumentInput } from "@/contracts/documents";
import {
  INJECTED,
  expectError,
  expectOk,
  failingAfterFirstWrite,
  freshStart,
  loadServer,
  newId,
  seedBatch,
  seedPerfume,
  type Server,
} from "./support/harness";

/**
 * T13 (03 §4.3 ; 07 J5) : `assignDocumentsToBatchAction` — rattacher, retirer, déplacer (unitaire ou en
 * masse), lot ouvert exigé des deux côtés, refus d'un document qui a changé de lot entre-temps, tout ou
 * rien, atomicité. Et le lot lui-même : `createBatchAction`, `updateBatchAction`, `setBatchStatusAction`,
 * `deleteBatchAction`.
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

// 50 ml : seule contenance valide avant comme après l'intégration des contenances réelles (30/50/100 → 10/50/80).
const line = (perfumeId: number): CreateDocumentInput["lines"][number] => ({
  item: { kind: "catalogue", perfumeId },
  volumeMl: 50,
  quantity: 1,
  unitPriceEur: "120",
});

async function createDocument(origin: "ORDER" | "DIRECT_SALE", batchId?: string) {
  const perfume = await seedPerfume(server.prisma, { name: `Parfum ${newId().slice(0, 8)}` });
  const id = newId();
  expectOk(
    await server.documents.createDocumentAction({
      id,
      origin,
      customer: { kind: "passing", name: "Fares" },
      lines: [line(perfume.id)],
      batchId,
    }),
  );
  return id;
}

const batchOf = async (id: string) => (await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } })).batchId;

const assign = (changes: { documentId: string; from: string | null; to: string | null }[]) =>
  server.documents.assignDocumentsToBatchAction({ changes });

describe("T13 — nominal", () => {
  it("rattacher, déplacer entre lots ouverts, retirer ; déjà à destination ⇒ sans effet", async () => {
    const mars = await seedBatch(server.prisma, { name: "Mars" });
    const avril = await seedBatch(server.prisma, { name: "Avril" });
    const id = await createDocument("DIRECT_SALE");

    expect(expectOk(await assign([{ documentId: id, from: null, to: mars.id }]))).toEqual({ changed: 1 });
    expect(await batchOf(id)).toBe(mars.id);

    expect(expectOk(await assign([{ documentId: id, from: mars.id, to: avril.id }]))).toEqual({ changed: 1 });
    expect(await batchOf(id)).toBe(avril.id);

    // Double envoi du même geste : le document est déjà dans Avril.
    expect(expectOk(await assign([{ documentId: id, from: mars.id, to: avril.id }]))).toEqual({ changed: 0 });

    expect(expectOk(await assign([{ documentId: id, from: avril.id, to: null }]))).toEqual({ changed: 1 });
    expect(await batchOf(id)).toBeNull();
  });

  it("en masse (S13) : seul le différentiel s'écrit", async () => {
    const mars = await seedBatch(server.prisma, { name: "Mars" });
    const [a, b, c] = [await createDocument("ORDER"), await createDocument("DIRECT_SALE"), await createDocument("ORDER", mars.id)];
    expect(
      expectOk(
        await assign([
          { documentId: a, from: null, to: mars.id },
          { documentId: b, from: null, to: mars.id },
          { documentId: c, from: mars.id, to: null },
        ]),
      ),
    ).toEqual({ changed: 3 });
    expect([await batchOf(a), await batchOf(b), await batchOf(c)]).toEqual([mars.id, mars.id, null]);
  });
});

describe("T13 — gardes", () => {
  it("lot clos ⇒ CONFLICT « Le lot « Mars » est clos : rouvre-le pour y rattacher cette vente. »", async () => {
    const closed = await seedBatch(server.prisma, { name: "Mars", status: "CLOSED" });
    const sale = await createDocument("DIRECT_SALE");
    const order = await createDocument("ORDER");

    expect(expectError(await assign([{ documentId: sale, from: null, to: closed.id }]), "CONFLICT").message).toBe(
      "Le lot « Mars » est clos : rouvre-le pour y rattacher cette vente.",
    );
    expect(expectError(await assign([{ documentId: order, from: null, to: closed.id }]), "CONFLICT").message).toBe(
      "Le lot « Mars » est clos : rouvre-le pour y rattacher cette commande.",
    );
    expect([await batchOf(sale), await batchOf(order)]).toEqual([null, null]);
  });

  it("un document ne sort pas d'un lot clos", async () => {
    const mars = await seedBatch(server.prisma, { name: "Mars" });
    const avril = await seedBatch(server.prisma, { name: "Avril" });
    const id = await createDocument("DIRECT_SALE", mars.id);
    expectOk(await server.batches.setBatchStatusAction({ id: mars.id, status: "CLOSED" }));

    for (const to of [null, avril.id]) {
      expect(expectError(await assign([{ documentId: id, from: mars.id, to }]), "CONFLICT").message).toBe(
        "Le lot « Mars » est clos : rouvre-le pour en retirer cette vente.",
      );
    }
    expect(await batchOf(id)).toBe(mars.id);
  });

  it("document qui a changé de lot entre-temps ⇒ CONFLICT, jamais déplacé en silence (01 §4.4)", async () => {
    const mars = await seedBatch(server.prisma, { name: "Mars" });
    const avril = await seedBatch(server.prisma, { name: "Avril" });
    const id = await createDocument("ORDER", avril.id);
    expect(expectError(await assign([{ documentId: id, from: null, to: mars.id }]), "CONFLICT").message).toBe(
      "Cette commande a changé de lot entre-temps : recharge pour voir sa version à jour.",
    );
    expect(await batchOf(id)).toBe(avril.id);
  });

  it("lot ou document disparu ⇒ NOT_FOUND", async () => {
    const mars = await seedBatch(server.prisma, { name: "Mars" });
    const id = await createDocument("ORDER");
    expectError(await assign([{ documentId: id, from: null, to: newId() }]), "NOT_FOUND");
    expectError(await assign([{ documentId: newId(), from: null, to: mars.id }]), "NOT_FOUND");
  });

  it("tout ou rien : un refus sur un document n'écrit aucun des autres", async () => {
    const open = await seedBatch(server.prisma, { name: "Avril" });
    const closed = await seedBatch(server.prisma, { name: "Mars" });
    const [a, b, c] = [await createDocument("ORDER"), await createDocument("ORDER"), await createDocument("ORDER", closed.id)];
    await server.prisma.batch.update({ where: { id: closed.id }, data: { status: "CLOSED" } });
    expectError(
      await assign([
        { documentId: a, from: null, to: open.id },
        { documentId: b, from: null, to: open.id },
        { documentId: c, from: closed.id, to: open.id },
      ]),
      "CONFLICT",
    );
    expect([await batchOf(a), await batchOf(b), await batchOf(c)]).toEqual([null, null, closed.id]);
  });
});

describe("T13 — atomicité", () => {
  it("erreur injectée après la première écriture ⇒ aucun rattachement", async () => {
    const mars = await seedBatch(server.prisma, { name: "Mars" });
    const avril = await seedBatch(server.prisma, { name: "Avril" });
    const [a, b] = [await createDocument("ORDER"), await createDocument("DIRECT_SALE", avril.id)];
    let written: string[] = [];

    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingAfterFirstWrite(tx);
        written = failing.written;
        return server.documentsWriter.assignDocumentsToBatch(failing, {
          changes: [
            { documentId: a, from: null, to: mars.id },
            { documentId: b, from: avril.id, to: null },
          ],
        });
      }),
    ).rejects.toThrow(INJECTED);

    expect(written).toEqual(["saleDocument.updateMany"]);
    expect([await batchOf(a), await batchOf(b)]).toEqual([null, avril.id]);
  });
});

describe("Lots — créer, modifier, clôturer, supprimer", () => {
  it("créer (idempotent par id), renommer, dater, annoter, effacer la date", async () => {
    const id = newId();
    const created = expectOk(
      await server.batches.createBatchAction({ id, name: " Commande de mars ", expectedAt: "2026-10-03T00:00:00+02:00" }),
    );
    expect(created).toEqual({ id, name: "Commande de mars", status: "OPEN", expectedAt: "2026-10-02T22:00:00.000Z", notes: null });
    expect(expectOk(await server.batches.createBatchAction({ id, name: "Doublon" }))).toEqual(created);
    expect(await server.prisma.batch.count()).toBe(1);

    expect(
      expectOk(await server.batches.updateBatchAction({ id, name: "Mars 2026", notes: "Transport inclus" })),
    ).toMatchObject({ name: "Mars 2026", notes: "Transport inclus", expectedAt: "2026-10-02T22:00:00.000Z" });
    expect(expectOk(await server.batches.updateBatchAction({ id, expectedAt: null, notes: "" }))).toMatchObject({
      name: "Mars 2026",
      expectedAt: null,
      notes: null,
    });
    expect(expectError(await server.batches.updateBatchAction({ id, name: "M" }), "VALIDATION").fields).toEqual({
      name: "Donne un nom au lot (2 caractères au moins).",
    });
    expectError(await server.batches.updateBatchAction({ id: newId(), name: "Avril" }), "NOT_FOUND");
  });

  it("clôturer puis rouvrir : valeur cible idempotente ; un lot rouvert reçoit à nouveau des documents", async () => {
    const mars = await seedBatch(server.prisma, { name: "Mars" });
    const doc = await createDocument("ORDER");
    expect(expectOk(await server.batches.setBatchStatusAction({ id: mars.id, status: "CLOSED" })).status).toBe("CLOSED");
    expect(expectOk(await server.batches.setBatchStatusAction({ id: mars.id, status: "CLOSED" })).status).toBe("CLOSED");
    expectError(await assign([{ documentId: doc, from: null, to: mars.id }]), "CONFLICT");
    expectOk(await server.batches.setBatchStatusAction({ id: mars.id, status: "OPEN" }));
    expectOk(await assign([{ documentId: doc, from: null, to: mars.id }]));
    expectError(await server.batches.setBatchStatusAction({ id: newId(), status: "OPEN" }), "NOT_FOUND");
  });

  it("supprimer : lot vide ⇒ supprimé ; document rattaché ⇒ CONFLICT avec le décompte ; lot absent ⇒ succès", async () => {
    const empty = await seedBatch(server.prisma, { name: "Erreur" });
    expect(expectOk(await server.batches.deleteBatchAction({ id: empty.id }))).toEqual({ id: empty.id, deleted: true });
    expect(expectOk(await server.batches.deleteBatchAction({ id: empty.id }))).toEqual({ id: empty.id, deleted: false });

    const mars = await seedBatch(server.prisma, { name: "Mars" });
    await createDocument("ORDER", mars.id);
    expect(expectError(await server.batches.deleteBatchAction({ id: mars.id }), "CONFLICT").message).toBe(
      "Impossible : 1 document rattaché. Clôture-le plutôt.",
    );
    await createDocument("DIRECT_SALE", mars.id);
    expect(expectError(await server.batches.deleteBatchAction({ id: mars.id }), "CONFLICT").message).toBe(
      "Impossible : 2 documents rattachés. Clôture-le plutôt.",
    );
    expect(await server.prisma.batch.count({ where: { id: mars.id } })).toBe(1);
  });

  it("supprimer : une dépense, même supprimée depuis, garde le lot (son historique reste au journal)", async () => {
    const pocket = await server.prisma.pocket.create({ data: { name: "Banque", kind: "BANK" } });
    const batch = await seedBatch(server.prisma, { name: "Mars" });
    const occurredAt = new Date("2026-09-01T10:00:00Z");
    const expense = await server.prisma.$transaction(async (t) => {
      const movement = await t.cashMovement.create({ data: { pocketId: pocket.id, amount: "-45.00", kind: "EXPENSE", occurredAt } });
      await t.batchExpense.create({ data: { batchId: batch.id, label: "Transport", movementId: movement.id } });
      return movement;
    });

    expect(expectError(await server.batches.deleteBatchAction({ id: batch.id }), "CONFLICT").message).toBe(
      "Impossible : 1 dépense rattachée. Clôture-le plutôt.",
    );

    await server.prisma.cashMovement.create({
      data: { pocketId: pocket.id, amount: "45.00", kind: "EXPENSE", occurredAt, reversesId: expense.id },
    });
    expect(expectError(await server.batches.deleteBatchAction({ id: batch.id }), "CONFLICT").message).toBe(
      "Impossible : ce lot a un historique de dépenses. Clôture-le plutôt.",
    );
  });
});
