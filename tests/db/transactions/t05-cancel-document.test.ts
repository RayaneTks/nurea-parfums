import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelDocumentInput } from "@/contracts/documents";
import {
  balanceOf,
  catalogueLine,
  createDocument,
  expectInvariants,
  loadMoneyServer,
  moneyCounts,
  paymentsOf,
  seedPocket,
  viewBalance,
  type MoneyServer,
} from "./support/argent";
import {
  INJECTED,
  expectError,
  expectOk,
  failingAfterFirstWrite,
  freshStart,
  newId,
  seedPerfume,
  stockOf,
} from "./support/harness";

/**
 * T5 (03 §2.3, §4.3, §4.4 ; 07 J6) : `cancelDocumentAction` — quantités livrées à 0 et stock restitué,
 * remboursements datés du jour plafonnés au payé, « Non attribué » jamais négatif, vente directe annulée puis
 * réactivée (T4), garde des lignes reprises hors règles, renvoi, atomicité.
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

beforeAll(async () => {
  server = await loadMoneyServer();
});

afterAll(async () => {
  // La fixture « ligne reprise » recrée line_volume_ck NOT VALID : la base de test la retrouve validée.
  await server?.prisma.$executeRawUnsafe(`ALTER TABLE "SaleLine" VALIDATE CONSTRAINT line_volume_ck`).catch(() => undefined);
  await server?.prisma.$disconnect();
});

beforeEach(async () => {
  cookieJar.current = await freshStart(server);
});

afterEach(async () => {
  await expectInvariants(server.prisma);
});

const documentOf = (id: string) =>
  server.prisma.saleDocument.findUniqueOrThrow({ where: { id }, include: { lines: { orderBy: { position: "asc" } } } });

const cancel = (documentId: string, refunds: { amount: string; pocketId: string | null }[] = [], confirm = false) =>
  server.documents.cancelDocumentAction({
    documentId,
    refunds: refunds.map((refund) => ({ id: newId(), ...refund })),
    confirm,
  });

describe("T5 — nominal", () => {
  it("commande confirmée avec acompte, annulée et remboursée : CANCELLED, horodatages, REFUND daté du jour, stock restitué", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const sauvage = await seedPerfume(server.prisma, { stock: 10 });
    const id = await createDocument(server, {
      origin: "ORDER",
      lines: [catalogueLine(sauvage.id, { quantity: 3 })],
      received: [{ amount: "60", pocketId: cash.id }],
    });
    const [line] = (await documentOf(id)).lines;
    expectOk(await server.documents.setLineDeliveredAction({ documentId: id, lineId: line!.id, deliveredQuantity: 2 }));
    expect(await stockOf(server.prisma, sauvage.id)).toBe(8);

    const before = Date.now();
    const data = expectOk(await cancel(id, [{ amount: "60", pocketId: cash.id }]));

    expect(data.document).toMatchObject({ status: "CANCELLED", confirmedAt: null, deliveredAt: null, paid: "0.00" });
    expect(data.refunds).toEqual([expect.objectContaining({ kind: "REFUND", amount: "-60.00", pocketId: cash.id })]);
    expect(new Date(data.refunds[0]!.occurredAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
    const doc = await documentOf(id);
    expect(doc.cancelledAt).not.toBeNull();
    expect(doc.lines.map((l) => l.deliveredQuantity)).toEqual([0]);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(10);
    expect(await balanceOf(server.prisma, cash.id)).toBe("0.00");
  });

  it("sans remboursement : l'acompte reste encaissé ; renvoi du même geste ⇒ succès sans écriture", async () => {
    const id = await createDocument(server, { origin: "ORDER", received: [{ amount: "40", pocketId: null }] });
    const data = expectOk(await cancel(id));
    expect(data).toMatchObject({ document: { status: "CANCELLED", paid: "40.00" }, refunds: [] });
    const counts = await moneyCounts(server.prisma);
    const cancelledAt = (await documentOf(id)).cancelledAt;

    expect(expectOk(await cancel(id)).document.status).toBe("CANCELLED");
    expect(await moneyCounts(server.prisma)).toEqual(counts);
    expect((await documentOf(id)).cancelledAt).toEqual(cancelledAt);
  });

  it("renvoi avec les mêmes remboursements ⇒ succès, un seul remboursement ; nouveaux remboursements sur un annulé ⇒ CONFLICT", async () => {
    const id = await createDocument(server, { origin: "ORDER", received: [{ amount: "40", pocketId: null }] });
    const input = { documentId: id, refunds: [{ id: newId(), amount: "40", pocketId: null }], confirm: false };
    expectOk(await server.documents.cancelDocumentAction(input));
    expect(expectOk(await server.documents.cancelDocumentAction(input)).refunds).toHaveLength(1);
    expect((await paymentsOf(server.prisma, id)).length).toBe(2);
    expect(expectError(await cancel(id, [{ amount: "10", pocketId: null }]), "CONFLICT").message).toBe(
      "Cette commande est déjà annulée : rembourse depuis sa fiche.",
    );
  });
});

describe("T5 — vente directe annulée puis réactivée (T4)", () => {
  it("annulation : réserve « livrée » confirmée, stock restitué ; réactivation : livrée, quantités complètes, stock re-décrémenté, horodatages", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 5 });
    const id = await createDocument(server, {
      origin: "DIRECT_SALE",
      lines: [catalogueLine(sauvage.id, { quantity: 2 })],
      received: [{ amount: "240", pocketId: null }],
    });
    expect(await stockOf(server.prisma, sauvage.id)).toBe(3);

    const reserve = expectError(await cancel(id), "NEEDS_CONFIRMATION");
    expect(reserve.confirm).toEqual({
      title: "Annuler cette vente ?",
      reserves: ["Cette vente était livrée : le stock est restitué."],
      confirmLabel: "Confirmer",
    });
    expect((await documentOf(id)).status).toBe("DELIVERED");

    expectOk(await cancel(id, [], true));
    let doc = await documentOf(id);
    expect([doc.status, doc.confirmedAt, doc.deliveredAt]).toEqual(["CANCELLED", null, null]);
    expect(doc.lines[0]?.deliveredQuantity).toBe(0);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(5);

    const reactivated = expectOk(await server.documents.changeDocumentStatusAction({ documentId: id, to: "DELIVERED", confirm: true }));
    doc = await documentOf(id);
    expect(doc.status).toBe("DELIVERED");
    expect(doc.lines[0]?.deliveredQuantity).toBe(2);
    expect(doc.cancelledAt).toBeNull();
    expect(doc.confirmedAt).not.toBeNull();
    expect(doc.deliveredAt).not.toBeNull();
    expect(reactivated).toMatchObject({ confirmedAt: doc.confirmedAt?.toISOString(), deliveredAt: doc.deliveredAt?.toISOString() });
    expect(await stockOf(server.prisma, sauvage.id)).toBe(3);
    expect(await viewBalance(server.prisma, id)).toMatchObject({ paid: "240.00", due: "0.00" });
  });

  it("réactivation sur un stock devenu insuffisant : réserve de stock, puis fiche à 0", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 5 });
    const id = await createDocument(server, { origin: "DIRECT_SALE", lines: [catalogueLine(sauvage.id, { quantity: 2 })] });
    expectOk(await cancel(id, [], true));
    await server.prisma.perfume.update({ where: { id: sauvage.id }, data: { stock: 1 } });

    expect(
      expectError(await server.documents.changeDocumentStatusAction({ documentId: id, to: "DELIVERED" }), "NEEDS_CONFIRMATION").confirm
        ?.reserves,
    ).toContain("Stock de Sauvage à 1 : la fiche passera à 0.");
    expectOk(await server.documents.changeDocumentStatusAction({ documentId: id, to: "DELIVERED", confirm: true }));
    expect(await stockOf(server.prisma, sauvage.id)).toBe(0);
  });
});

describe("T5 — gardes", () => {
  it("remboursement au-delà du payé ⇒ CONFLICT, rien d'écrit", async () => {
    const id = await createDocument(server, { origin: "ORDER", received: [{ amount: "60", pocketId: null }] });
    const before = await moneyCounts(server.prisma);
    expect(expectError(await cancel(id, [{ amount: "40", pocketId: null }, { amount: "30", pocketId: null }]), "CONFLICT").message).toBe(
      "Le remboursement dépasse ce qui a été payé (60,00 €).",
    );
    expect(await moneyCounts(server.prisma)).toEqual(before);
    expect((await documentOf(id)).status).toBe("CONFIRMED");
  });

  it("remboursement qui rendrait « Non attribué » négatif ⇒ CONFLICT, document intact", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const id = await createDocument(server, { origin: "ORDER", received: [{ amount: "50", pocketId: null }] });
    expectOk(await server.treasury.transferAction({ fromPocketId: null, toPocketId: cash.id, amount: "30" }));
    const before = await moneyCounts(server.prisma);

    expect(expectError(await cancel(id, [{ amount: "50", pocketId: null }]), "CONFLICT").message).toBe(
      "« Non attribué » ne contient que 20,00 € : il ne passe jamais sous zéro. Choisis une autre poche ou un montant plus petit.",
    );
    expect(await moneyCounts(server.prisma)).toEqual(before);
    expect((await documentOf(id)).status).toBe("CONFIRMED");

    // Réparti sur deux poches, le même remboursement passe.
    expectOk(await cancel(id, [{ amount: "20", pocketId: null }, { amount: "30", pocketId: cash.id }]));
    const system = await server.prisma.pocket.findFirstOrThrow({ where: { isSystem: true } });
    expect(await balanceOf(server.prisma, system.id)).toBe("0.00");
  });

  it("ligne reprise au volume nul ⇒ VALIDATION « Choisis le volume de … » sans rien écrire ; volume choisi (T2) ⇒ annulation acceptée", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 4 });
    const id = await createDocument(server, { origin: "DIRECT_SALE", lines: [catalogueLine(sauvage.id, { quantity: 1 })] });
    const [line] = (await documentOf(id)).lines;
    // Fixture de reprise (07 J2) : ligne sans volume, contrainte recréée NOT VALID après l'insertion SQL.
    await server.prisma.$executeRawUnsafe(`ALTER TABLE "SaleLine" DROP CONSTRAINT line_volume_ck`);
    await server.prisma.$executeRawUnsafe(`UPDATE "SaleLine" SET "volumeMl" = NULL WHERE id = '${line!.id}'`);
    await server.prisma.$executeRawUnsafe(
      `ALTER TABLE "SaleLine" ADD CONSTRAINT line_volume_ck CHECK ("volumeMl" IS NOT NULL AND "volumeMl" IN (10, 50, 80)) NOT VALID`,
    );
    const before = await documentOf(id);

    const refused = expectError(await cancel(id, [], true), "VALIDATION");
    expect(refused.message).toBe("Choisis le volume de Sauvage (ligne reprise sans volume) pour continuer.");
    expect(refused.fields).toEqual({ [`lines.${line!.id}.volumeMl`]: refused.message });
    expect(await documentOf(id)).toEqual(before);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(3);

    expectOk(
      await server.documents.updateDocumentAction({
        documentId: id,
        lines: [{ id: line!.id, volumeMl: 50, quantity: 1, unitPriceEur: "120" }],
      }),
    );
    expectOk(await cancel(id, [], true));
    expect((await documentOf(id)).status).toBe("CANCELLED");
    expect(await stockOf(server.prisma, sauvage.id)).toBe(4);
    await server.prisma.$executeRawUnsafe(`ALTER TABLE "SaleLine" VALIDATE CONSTRAINT line_volume_ck`);
  });

  it("document disparu ⇒ NOT_FOUND", async () => {
    expectError(await cancel(newId()), "NOT_FOUND");
  });
});

describe("T5 — atomicité", () => {
  it("erreur injectée après la première écriture ⇒ statut, livré, stock, remboursements inchangés", async () => {
    const sauvage = await seedPerfume(server.prisma, { stock: 5 });
    const id = await createDocument(server, {
      origin: "DIRECT_SALE",
      lines: [catalogueLine(sauvage.id, { quantity: 2 })],
      received: [{ amount: "240", pocketId: null }],
    });
    const before = await documentOf(id);
    const counts = await moneyCounts(server.prisma);
    let written: string[] = [];

    await expect(
      server.inTransaction(async (tx) => {
        const failing = failingAfterFirstWrite(tx);
        written = failing.written;
        return server.documentsWriter.cancelDocument(
          failing,
          cancelDocumentInput.parse({ documentId: id, refunds: [{ id: newId(), amount: "240", pocketId: null }], confirm: true }),
        );
      }),
    ).rejects.toThrow(INJECTED);

    expect(written).toEqual(["saleLine.update"]);
    expect(await documentOf(id)).toEqual(before);
    expect(await moneyCounts(server.prisma)).toEqual(counts);
    expect(await stockOf(server.prisma, sauvage.id)).toBe(3);
  });
});
