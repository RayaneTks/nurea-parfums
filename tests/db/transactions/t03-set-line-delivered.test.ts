import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateDocumentInput } from "@/contracts/documents";
import { NOW, insert } from "../support/database";
import {
  INJECTED,
  expectError,
  expectOk,
  failingAfterFirstWrite,
  freshStart,
  loadServer,
  newId,
  seedPerfume,
  stockOf,
  type Server,
} from "./support/harness";

/**
 * T3 (03 §4.3, 07 J5) : `setLineDeliveredAction` — pointage absolu borné à 0..quantité, stock suivi ajusté
 * du delta, réserve de plancher, statut inchangé, gardes (vente directe, annulée, ligne étrangère, ligne
 * reprise hors règles), atomicité.
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
  const created = await server.prisma.saleLine.findMany({ where: { documentId: id }, orderBy: { position: "asc" } });
  return { id, lineIds: created.map((line) => line.id) };
}

const point = (documentId: string, lineId: string, deliveredQuantity: number, confirm = false) =>
  server.documents.setLineDeliveredAction({ documentId, lineId, deliveredQuantity, confirm });

const lineState = async (lineId: string) =>
  (await server.prisma.saleLine.findUniqueOrThrow({ where: { id: lineId } })).deliveredQuantity;

describe("T3 — nominal", () => {
  it("pointer 2, revenir à 1, tout pointer : stock suivi au delta, statut inchangé", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 5 });
    const bleu = await seedPerfume(server.prisma, { name: "Bleu", brand: "Chanel", stock: null });
    const { id, lineIds } = await createDocument("ORDER", [catalogueLine(sauvage.id), catalogueLine(bleu.id, { quantity: 1 })]);
    const [sauvageLine, bleuLine] = lineIds as [string, string];

    expect(expectOk(await point(id, sauvageLine, 2))).toEqual({
      documentId: id,
      lineId: sauvageLine,
      quantity: 3,
      deliveredQuantity: 2,
      fulfillment: "partial",
    });
    expect(await stockOf(server.prisma, sauvage.id)).toBe(3);

    expectOk(await point(id, sauvageLine, 1));
    expect(await stockOf(server.prisma, sauvage.id)).toBe(4);

    expectOk(await point(id, sauvageLine, 3));
    expect(expectOk(await point(id, bleuLine, 1)).fulfillment).toBe("full");
    expect(await stockOf(server.prisma, sauvage.id)).toBe(2);
    expect(await stockOf(server.prisma, bleu.id)).toBeNull();
    expect((await server.prisma.saleDocument.findUniqueOrThrow({ where: { id } })).status).toBe("PENDING");
  });

  it("valeur absolue bornée : au-delà de la quantité ⇒ quantité, négatif ⇒ 0", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 10 });
    const { id, lineIds } = await createDocument("ORDER", [catalogueLine(sauvage.id)]);
    const lineId = lineIds[0] as string;

    expect(expectOk(await point(id, lineId, 12)).deliveredQuantity).toBe(3);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(7);
    expect(expectOk(await point(id, lineId, -4)).deliveredQuantity).toBe(0);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(10);
  });

  it("renvoi de la même valeur : aucune écriture, aucune invalidation", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 10 });
    const { id, lineIds } = await createDocument("ORDER", [catalogueLine(sauvage.id)]);
    const lineId = lineIds[0] as string;
    expectOk(await point(id, lineId, 2));
    const updatedAt = (await server.prisma.saleLine.findUniqueOrThrow({ where: { id: lineId } })).updatedAt;
    cache.calls.length = 0;

    expectOk(await point(id, lineId, 2));

    expect(cache.calls).toEqual([]);
    expect((await server.prisma.saleLine.findUniqueOrThrow({ where: { id: lineId } })).updatedAt).toEqual(updatedAt);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(8);
  });

  it("stock écrit ⇒ contrat vitrine revalidé ; parfum non suivi ⇒ tag de gestion seulement", async () => {
    const tracked = await seedPerfume(server.prisma, { stock: 10 });
    const untracked = await seedPerfume(server.prisma, { name: "Bleu", stock: null });
    const { id, lineIds } = await createDocument("ORDER", [catalogueLine(tracked.id), catalogueLine(untracked.id)]);

    cache.calls.length = 0;
    expectOk(await point(id, lineIds[1] as string, 1));
    expect(cache.calls).toEqual(["updateTag:gestion"]);

    cache.calls.length = 0;
    expectOk(await point(id, lineIds[0] as string, 1));
    expect(cache.calls).toEqual([
      "updateTag:gestion",
      "updateTag:admin-catalogue",
      "revalidateTag:public-catalogue",
      "revalidateTag:admin-catalogue",
      "revalidatePath:/admin/catalogue",
      "revalidatePath:/",
    ]);
  });
});

describe("T3 — gardes", () => {
  it("livraison au-delà du stock ⇒ NEEDS_CONFIRMATION sans rien écrire ; confirmée ⇒ fiche à 0", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 1 });
    const { id, lineIds } = await createDocument("ORDER", [catalogueLine(sauvage.id)]);
    const lineId = lineIds[0] as string;

    const reserve = expectError(await point(id, lineId, 3), "NEEDS_CONFIRMATION");
    expect(reserve.confirm).toEqual({
      title: "Stock insuffisant",
      reserves: ["Stock de Sauvage à 1 : la fiche passera à 0."],
      confirmLabel: "Continuer",
    });
    expect([await lineState(lineId), await stockOf(server.prisma, sauvage.id)]).toEqual([0, 1]);

    expectOk(await point(id, lineId, 3, true));
    expect([await lineState(lineId), await stockOf(server.prisma, sauvage.id)]).toEqual([3, 0]);
  });

  it("vente directe, commande annulée ⇒ CONFLICT ; ligne d'un autre document ou document disparu ⇒ NOT_FOUND", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 10 });
    const sale = await createDocument("DIRECT_SALE", [catalogueLine(sauvage.id)]);
    expect(expectError(await point(sale.id, sale.lineIds[0] as string, 1), "CONFLICT").message).toBe(
      "Une vente directe est livrée en entier : modifie plutôt ses articles.",
    );

    const cancelled = await createDocument("ORDER", [catalogueLine(sauvage.id)]);
    await server.prisma.saleDocument.update({ where: { id: cancelled.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    expect(expectError(await point(cancelled.id, cancelled.lineIds[0] as string, 1), "CONFLICT").message).toBe(
      "Cette commande est annulée : réactive-la pour pointer une livraison.",
    );

    const order = await createDocument("ORDER", [catalogueLine(sauvage.id)]);
    expectError(await point(order.id, sale.lineIds[0] as string, 1), "NOT_FOUND");
    expectError(await point(newId(), order.lineIds[0] as string, 1), "NOT_FOUND");
    expect(await stockOf(server.prisma, sauvage.id)).toBe(7);
  });

  it("ligne reprise sans volume ⇒ VALIDATION qui la nomme, rien d'écrit ; volume choisi (T2) ⇒ pointage accepté", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 10 });
    const documentId = newId();
    const lineId = newId();
    await insert(server.prisma, "SaleDocument", { id: documentId, origin: "ORDER", status: "PENDING", customerName: "Fares", updatedAt: NOW });
    // Fixture de reprise : line_volume_ck recréée NOT VALID après l'insertion d'une ligne sans volume (07 J2, V8).
    // Sa définition est relue en base : la fixture la rend telle quelle, quelles que soient les contenances.
    const [constraint] = await server.prisma.$queryRawUnsafe<{ definition: string }[]>(
      `SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname = 'line_volume_ck'`,
    );
    const definition = (constraint?.definition ?? "").replace(/\s+NOT VALID$/, "");
    expect(definition).toMatch(/^CHECK /);
    await server.prisma.$executeRawUnsafe(`ALTER TABLE "SaleLine" DROP CONSTRAINT line_volume_ck`);
    try {
      await insert(server.prisma, "SaleLine", {
        id: lineId,
        documentId,
        perfumeId: sauvage.id,
        perfumeName: "Sauvage",
        volumeMl: null,
        quantity: 2,
        unitPriceEur: "120.00",
        updatedAt: NOW,
      });
      await server.prisma.$executeRawUnsafe(`ALTER TABLE "SaleLine" ADD CONSTRAINT line_volume_ck ${definition} NOT VALID`);

      const refused = expectError(await point(documentId, lineId, 1), "VALIDATION");
      expect(refused.message).toBe("Choisis le volume de Sauvage (ligne reprise sans volume) pour continuer.");
      expect(refused.fields).toEqual({ [`lines.${lineId}.volumeMl`]: refused.message });
      expect([await lineState(lineId), await stockOf(server.prisma, sauvage.id)]).toEqual([0, 10]);

      expectOk(
        await server.documents.updateDocumentAction({
          documentId,
          lines: [{ id: lineId, volumeMl: 50, quantity: 2, unitPriceEur: "120" }],
        }),
      );
      expectOk(await point(documentId, lineId, 1));
      expect([await lineState(lineId), await stockOf(server.prisma, sauvage.id)]).toEqual([1, 9]);
    } finally {
      await server.prisma.$executeRawUnsafe(`DELETE FROM "SaleLine" WHERE "documentId" = '${documentId}'`);
      await server.prisma.$executeRawUnsafe(`ALTER TABLE "SaleLine" DROP CONSTRAINT IF EXISTS line_volume_ck`);
      await server.prisma.$executeRawUnsafe(`ALTER TABLE "SaleLine" ADD CONSTRAINT line_volume_ck ${definition}`);
    }
  });
});

describe("T3 — atomicité", () => {
  it("erreur injectée après la première écriture (le stock) ⇒ ligne et stock inchangés", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 5 });
    const { id, lineIds } = await createDocument("ORDER", [catalogueLine(sauvage.id)]);
    const lineId = lineIds[0] as string;
    let written: string[] = [];

    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingAfterFirstWrite(tx);
        written = failing.written;
        return server.documentsWriter.setLineDelivered(failing, { documentId: id, lineId, deliveredQuantity: 2, confirm: false });
      }),
    ).rejects.toThrow(INJECTED);

    expect(written).toEqual(["perfume.update"]);
    expect([await lineState(lineId), await stockOf(server.prisma, sauvage.id)]).toEqual([0, 5]);
  });
});
