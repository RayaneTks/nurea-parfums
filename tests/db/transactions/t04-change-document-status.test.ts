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
  seedPayment,
  seedPerfume,
  stockOf,
  type Server,
} from "./support/harness";

/**
 * T4 (03 §2.3, §4.3 ; 07 J5) : `changeDocumentStatusAction` — réserves confirmables (PENDING → CONFIRMED
 * sans acompte, bug haute 01 §4.1), entrée en DELIVERED qui complète les quantités et décrémente le stock
 * (réserves jointes), sortie sans toucher aux quantités, horodatages cohérents, réactivation selon
 * l'origine, lot conservé, atomicité.
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

async function createDocument(origin: "ORDER" | "DIRECT_SALE", lines: CreateLine[], batchId?: string) {
  const id = newId();
  expectOk(
    await server.documents.createDocumentAction({
      id,
      origin,
      customer: { kind: "passing", name: "Fares" },
      lines,
      batchId,
      confirm: true,
    }),
  );
  return id;
}

const change = (documentId: string, to: "PENDING" | "CONFIRMED" | "DELIVERED", confirm = false) =>
  server.documents.changeDocumentStatusAction({ documentId, to, confirm });

const documentOf = (id: string) =>
  server.prisma.saleDocument.findUniqueOrThrow({ where: { id }, include: { lines: { orderBy: { position: "asc" } } } });

/** L'état qu'une annulation (T5, J6) laisse : quantités à 0, stock restitué, horodatage d'annulation. */
async function simulateCancellation(id: string, perfumeId: number, restoredStock: number) {
  await server.prisma.saleLine.updateMany({ where: { documentId: id }, data: { deliveredQuantity: 0 } });
  await server.prisma.saleDocument.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date(), confirmedAt: null, deliveredAt: null },
  });
  await server.prisma.perfume.update({ where: { id: perfumeId }, data: { stock: restoredStock } });
}

describe("T4 — confirmer (bug haute 01 §4.1)", () => {
  it("PENDING → CONFIRMED sans acompte ⇒ NEEDS_CONFIRMATION sans rien écrire ; confirm: true ⇒ appliqué", async () => {
    const sauvage = await seedPerfume(server.prisma);
    const id = await createDocument("ORDER", [catalogueLine(sauvage.id)]);

    const reserve = expectError(await change(id, "CONFIRMED"), "NEEDS_CONFIRMATION");
    expect(reserve.confirm).toEqual({
      title: "Confirmer cette commande ?",
      reserves: ["Aucun acompte n'a été encaissé."],
      confirmLabel: "Confirmer",
    });
    expect((await documentOf(id)).status).toBe("PENDING");

    const data = expectOk(await change(id, "CONFIRMED", true));
    expect(data).toMatchObject({ id, status: "CONFIRMED", deliveredAt: null, cancelledAt: null, due: "360.00" });
    const doc = await documentOf(id);
    expect(doc.status).toBe("CONFIRMED");
    expect(doc.confirmedAt?.toISOString()).toBe(data.confirmedAt);
  });

  it("une commande offerte à 0 € se confirme", async () => {
    const sauvage = await seedPerfume(server.prisma);
    const id = await createDocument("ORDER", [catalogueLine(sauvage.id, { isGift: true, unitPriceEur: "0" })]);
    expectError(await change(id, "CONFIRMED"), "NEEDS_CONFIRMATION");
    expect(expectOk(await change(id, "CONFIRMED", true))).toMatchObject({ status: "CONFIRMED", total: "0.00" });
  });

  it("avec un acompte déjà encaissé, confirmer ne porte aucune réserve", async () => {
    const sauvage = await seedPerfume(server.prisma);
    const id = await createDocument("ORDER", [catalogueLine(sauvage.id)]);
    await seedPayment(server.prisma, id, "60.00");
    expect(expectOk(await change(id, "CONFIRMED"))).toMatchObject({ status: "CONFIRMED", paid: "60.00", due: "300.00" });
  });
});

describe("T4 — livrer et revenir", () => {
  it("CONFIRMED → DELIVERED : réserve du reste dû ; confirmée ⇒ livré complet, stock du reste seulement, confirmedAt conservé", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 10 });
    const id = await createDocument("ORDER", [catalogueLine(sauvage.id)]);
    expectOk(await change(id, "CONFIRMED", true));
    const [line] = (await documentOf(id)).lines;
    expectOk(await server.documents.setLineDeliveredAction({ documentId: id, lineId: line!.id, deliveredQuantity: 1 }));
    const confirmedAt = (await documentOf(id)).confirmedAt;

    const reserve = expectError(await change(id, "DELIVERED"), "NEEDS_CONFIRMATION");
    expect(reserve.confirm).toEqual({
      title: "Livrer cette commande ?",
      reserves: ["Il reste 360,00 € à encaisser."],
      confirmLabel: "Confirmer",
    });
    expect((await documentOf(id)).lines[0]?.deliveredQuantity).toBe(1);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(9);

    expectOk(await change(id, "DELIVERED", true));
    const doc = await documentOf(id);
    expect(doc.status).toBe("DELIVERED");
    expect(doc.lines.map((l) => l.deliveredQuantity)).toEqual([3]);
    expect(doc.deliveredAt).not.toBeNull();
    expect(doc.confirmedAt).toEqual(confirmedAt);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(7);
  });

  it("livrer au-delà du stock : réserve de stock jointe à celle de la transition, un seul dialogue ; confirmée ⇒ 0", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 1 });
    const id = await createDocument("ORDER", [catalogueLine(sauvage.id)]);
    expectOk(await change(id, "CONFIRMED", true));

    const reserve = expectError(await change(id, "DELIVERED"), "NEEDS_CONFIRMATION");
    expect(reserve.confirm?.reserves).toEqual([
      "Il reste 360,00 € à encaisser.",
      "Stock de Sauvage à 1 : la fiche passera à 0.",
    ]);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(1);

    expectOk(await change(id, "DELIVERED", true));
    expect(await stockOf(server.prisma, sauvage.id)).toBe(0);
  });

  it("PENDING → DELIVERED directement (réserve), puis DELIVERED → CONFIRMED et → PENDING : quantités et stock intacts", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 10 });
    const id = await createDocument("ORDER", [catalogueLine(sauvage.id, { quantity: 2 })]);

    expect(expectError(await change(id, "DELIVERED"), "NEEDS_CONFIRMATION").confirm?.reserves).toContain(
      "La commande passe directement de « En attente » à « Livrée ».",
    );
    expectOk(await change(id, "DELIVERED", true));
    let doc = await documentOf(id);
    expect([doc.confirmedAt, doc.deliveredAt].every((at) => at !== null)).toBe(true);
    const confirmedAt = doc.confirmedAt;
    expect(await stockOf(server.prisma, sauvage.id)).toBe(8);

    expect(expectError(await change(id, "CONFIRMED"), "NEEDS_CONFIRMATION").confirm?.reserves).toEqual([
      "Les articles restent pointés comme livrés : le stock ne bouge pas.",
    ]);
    expectOk(await change(id, "CONFIRMED", true));
    doc = await documentOf(id);
    expect([doc.status, doc.deliveredAt, doc.confirmedAt]).toEqual(["CONFIRMED", null, confirmedAt]);
    expect(doc.lines[0]?.deliveredQuantity).toBe(2);

    expectOk(await change(id, "PENDING", true));
    doc = await documentOf(id);
    expect([doc.status, doc.confirmedAt, doc.deliveredAt, doc.cancelledAt]).toEqual(["PENDING", null, null, null]);
    expect(doc.lines[0]?.deliveredQuantity).toBe(2);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(8);
  });

  it("même statut : succès sans écriture ni invalidation", async () => {
    const sauvage = await seedPerfume(server.prisma);
    const id = await createDocument("ORDER", [catalogueLine(sauvage.id)]);
    const before = await documentOf(id);
    cache.calls.length = 0;
    expect(expectOk(await change(id, "PENDING"))).toMatchObject({ status: "PENDING", confirmedAt: null });
    expect(cache.calls).toEqual([]);
    expect((await documentOf(id)).updatedAt).toEqual(before.updatedAt);
  });

  it("le lot est conservé en changeant d'état (bug haute 01 §4.4)", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 10 });
    const batch = await seedBatch(server.prisma, { name: "Mars" });
    const id = await createDocument("ORDER", [catalogueLine(sauvage.id)], batch.id);
    expectOk(await change(id, "DELIVERED", true));
    expectOk(await change(id, "PENDING", true));
    expect((await documentOf(id)).batchId).toBe(batch.id);
  });
});

describe("T4 — gardes et réactivation", () => {
  it("vente directe : ni en attente ni confirmée ⇒ CONFLICT", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 10 });
    const id = await createDocument("DIRECT_SALE", [catalogueLine(sauvage.id)]);
    for (const to of ["PENDING", "CONFIRMED"] as const) {
      expect(expectError(await change(id, to, true), "CONFLICT").message).toBe(
        "Une vente directe est livrée ou annulée : elle n'a pas d'autre statut.",
      );
    }
    expect((await documentOf(id)).status).toBe("DELIVERED");
  });

  it("commande annulée : « Réactiver » la ramène en attente (réserve) ; vers Livrée ⇒ CONFLICT", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 10 });
    const id = await createDocument("ORDER", [catalogueLine(sauvage.id)]);
    await simulateCancellation(id, sauvage.id, 10);

    expect(expectError(await change(id, "DELIVERED", true), "CONFLICT").message).toBe(
      "Réactive d'abord cette commande : elle revient « En attente ».",
    );
    expect(expectError(await change(id, "PENDING"), "NEEDS_CONFIRMATION").confirm).toMatchObject({
      title: "Réactiver cette commande ?",
      reserves: ["Cette commande était annulée : elle revient « En attente »."],
    });
    expectOk(await change(id, "PENDING", true));
    const doc = await documentOf(id);
    expect([doc.status, doc.cancelledAt, doc.confirmedAt, doc.deliveredAt]).toEqual(["PENDING", null, null, null]);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(10);
  });

  it("vente directe annulée : réactivée directement en livrée — quantités complètes, stock re-décrémenté, horodatages reposés", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 5 });
    const id = await createDocument("DIRECT_SALE", [catalogueLine(sauvage.id, { quantity: 2 })]);
    const born = await documentOf(id);
    await simulateCancellation(id, sauvage.id, 5);

    const reserve = expectError(await change(id, "DELIVERED"), "NEEDS_CONFIRMATION");
    expect(reserve.confirm).toEqual({
      title: "Réactiver cette vente ?",
      reserves: [
        "Cette vente était annulée : elle redevient livrée et ses articles sont décomptés du stock.",
        "Il reste 240,00 € à encaisser.",
      ],
      confirmLabel: "Confirmer",
    });

    const data = expectOk(await change(id, "DELIVERED", true));
    const doc = await documentOf(id);
    expect(doc.status).toBe("DELIVERED");
    expect(doc.lines[0]?.deliveredQuantity).toBe(2);
    expect(doc.cancelledAt).toBeNull();
    expect(doc.confirmedAt?.toISOString()).toBe(data.confirmedAt);
    expect(doc.deliveredAt?.toISOString()).toBe(data.deliveredAt);
    expect(doc.confirmedAt!.getTime()).toBeGreaterThan(born.confirmedAt!.getTime());
    expect(await stockOf(server.prisma, sauvage.id)).toBe(3);
  });

  it("vente directe réactivée sur un parfum en rupture : la réserve de stock s'ajoute au même dialogue", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 5 });
    const id = await createDocument("DIRECT_SALE", [catalogueLine(sauvage.id, { quantity: 1 })]);
    await simulateCancellation(id, sauvage.id, 0);
    expect(expectError(await change(id, "DELIVERED"), "NEEDS_CONFIRMATION").confirm?.reserves).toContain(
      "Sauvage est en rupture : la fiche restera à 0.",
    );
    expectOk(await change(id, "DELIVERED", true));
    expect(await stockOf(server.prisma, sauvage.id)).toBe(0);
  });

  it("document disparu ⇒ NOT_FOUND ; « Annuler » n'est pas un statut cible (T5) ⇒ VALIDATION", async () => {
    expectError(await change(newId(), "CONFIRMED", true), "NOT_FOUND");
    const sauvage = await seedPerfume(server.prisma);
    const id = await createDocument("ORDER", [catalogueLine(sauvage.id)]);
    expectError(
      await server.documents.changeDocumentStatusAction({ documentId: id, to: "CANCELLED" as "PENDING", confirm: true }),
      "VALIDATION",
    );
  });
});

describe("T4 — atomicité", () => {
  it("erreur injectée après la première écriture ⇒ statut, horodatages, livré et stock inchangés", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 10 });
    const id = await createDocument("ORDER", [catalogueLine(sauvage.id), catalogueLine(sauvage.id, { quantity: 1 })]);
    expectOk(await change(id, "CONFIRMED", true));
    const before = await documentOf(id);
    let written: string[] = [];

    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingAfterFirstWrite(tx);
        written = failing.written;
        return server.documentsWriter.changeDocumentStatus(failing, { documentId: id, to: "DELIVERED", confirm: true });
      }),
    ).rejects.toThrow(INJECTED);

    expect(written).toEqual(["saleLine.update"]);
    expect(await documentOf(id)).toEqual(before);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(10);
  });
});
