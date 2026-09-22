import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateDocumentInput } from "@/contracts/documents";
import {
  INJECTED,
  counts,
  expectError,
  expectOk,
  failingAfterFirstWrite,
  freshStart,
  loadServer,
  newId,
  seedPayment,
  seedPerfume,
  stockOf,
  type Server,
} from "./support/harness";

/**
 * T6 (03 §4.3, §4.4 ; 07 J5) : `deleteDocumentAction` — un document SANS paiement se supprime (lignes en
 * cascade, livré restitué au stock suivi) ; avec un paiement il s'annule (T5, J6) ; renvoi sans erreur ;
 * atomicité.
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

// 50 ml : seule contenance valide avant comme après l'intégration des contenances réelles (30/50/100 → 10/50/80).
const catalogueLine = (perfumeId: number, overrides: Partial<CreateLine> = {}): CreateLine => ({
  item: { kind: "catalogue", perfumeId },
  volumeMl: 50,
  quantity: 3,
  unitPriceEur: "120",
  ...overrides,
});

async function createDocument(origin: "ORDER" | "DIRECT_SALE", lines: CreateLine[]) {
  const id = newId();
  expectOk(
    await server.documents.createDocumentAction({ id, origin, customer: { kind: "passing", name: "Fares" }, lines, confirm: true }),
  );
  return id;
}

const remove = (documentId: string) => server.documents.deleteDocumentAction({ documentId });

describe("T6 — nominal", () => {
  it("commande sans paiement : supprimée avec ses lignes, livré restitué au stock suivi", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 10 });
    const id = await createDocument("ORDER", [catalogueLine(sauvage.id), catalogueLine(sauvage.id, { quantity: 1 })]);
    const [line] = await server.prisma.saleLine.findMany({ where: { documentId: id }, orderBy: { position: "asc" } });
    expectOk(await server.documents.setLineDeliveredAction({ documentId: id, lineId: line!.id, deliveredQuantity: 2 }));
    expect(await stockOf(server.prisma, sauvage.id)).toBe(8);
    cache.calls.length = 0;

    expect(expectOk(await remove(id))).toEqual({ id, deleted: true });

    expect(await counts(server.prisma)).toMatchObject({ documents: 0, lines: 0 });
    expect(await stockOf(server.prisma, sauvage.id)).toBe(10);
    expect(cache.calls).toContain("revalidateTag:public-catalogue");
  });

  it("vente directe : stock suivi restitué, non suivi intact, ligne hors catalogue sans effet", async () => {
    const tracked = await seedPerfume(server.prisma, { stock: 5 });
    const untracked = await seedPerfume(server.prisma, { name: "Bleu", stock: null });
    const id = await createDocument("DIRECT_SALE", [
      catalogueLine(tracked.id, { quantity: 2 }),
      catalogueLine(untracked.id),
      { item: { kind: "offCatalog", name: "Khamrah" }, volumeMl: 50, quantity: 1, unitPriceEur: "40" },
    ]);
    expect(await stockOf(server.prisma, tracked.id)).toBe(3);

    expectOk(await remove(id));

    expect(await stockOf(server.prisma, tracked.id)).toBe(5);
    expect(await stockOf(server.prisma, untracked.id)).toBeNull();
    expect(await counts(server.prisma)).toMatchObject({ documents: 0, lines: 0 });
  });

  it("renvoi après suppression : succès sans rien à faire", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 5 });
    const id = await createDocument("DIRECT_SALE", [catalogueLine(sauvage.id, { quantity: 1 })]);
    expectOk(await remove(id));
    expect(expectOk(await remove(id))).toEqual({ id, deleted: false });
    expect(await stockOf(server.prisma, sauvage.id)).toBe(5);
  });
});

describe("T6 — gardes", () => {
  it("document avec un paiement ⇒ CONFLICT « annule-la plutôt », rien d'écrit", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 5 });
    const saleId = await createDocument("DIRECT_SALE", [catalogueLine(sauvage.id, { quantity: 1 })]);
    await seedPayment(server.prisma, saleId, "120.00");
    const orderId = await createDocument("ORDER", [catalogueLine(sauvage.id)]);
    await seedPayment(server.prisma, orderId, "50.00");

    expect(expectError(await remove(saleId), "CONFLICT").message).toBe("Cette vente a des paiements : annule-la plutôt.");
    expect(expectError(await remove(orderId), "CONFLICT").message).toBe("Cette commande a des paiements : annule-la plutôt.");
    expect(await counts(server.prisma)).toMatchObject({ documents: 2, lines: 2 });
    expect(await stockOf(server.prisma, sauvage.id)).toBe(4);
  });
});

describe("T6 — atomicité", () => {
  it("erreur injectée après la première écriture (restitution du stock) ⇒ document, lignes et stock intacts", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 5 });
    const id = await createDocument("DIRECT_SALE", [catalogueLine(sauvage.id, { quantity: 2 })]);
    let written: string[] = [];

    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingAfterFirstWrite(tx);
        written = failing.written;
        return server.documentsWriter.deleteDocument(failing, id);
      }),
    ).rejects.toThrow(INJECTED);

    expect(written).toEqual(["perfume.update"]);
    expect(await counts(server.prisma)).toMatchObject({ documents: 1, lines: 1 });
    expect(await stockOf(server.prisma, sauvage.id)).toBe(3);
  });

  it("erreur injectée après la suppression elle-même ⇒ document et lignes toujours là", async () => {
    const id = await createDocument("ORDER", [{ item: { kind: "offCatalog", name: "Khamrah" }, volumeMl: 50, quantity: 1, unitPriceEur: "40" }]);
    let written: string[] = [];

    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingAfterFirstWrite(tx);
        written = failing.written;
        return server.documentsWriter.deleteDocument(failing, id);
      }),
    ).rejects.toThrow(INJECTED);

    expect(written).toEqual(["saleDocument.delete"]);
    expect(await counts(server.prisma)).toMatchObject({ documents: 1, lines: 1 });
  });
});
