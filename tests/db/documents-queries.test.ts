import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateDocumentInput } from "@/contracts/documents";
import { catalogueLine, expectInvariants, loadMoneyServer, seedPocket, type MoneyServer } from "./transactions/support/argent";
import { expectOk, freshStart, newId, seedBatch, seedCustomer, seedPerfume } from "./transactions/support/harness";

/**
 * Lectures du module documents (07 J8) : liste Commandes (E10 : vues, sections d'urgence, filtres, chips,
 * recherche étendue qui traverse les repliés, pagination), fiche document (S01), « Vendus récemment » (N7),
 * lots ouverts (S07). Écrites par les actions, lues par les fonctions des écrans.
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
  queries: typeof import("@/server/documents/queries");
  sql: typeof import("@/server/documents/sql");
  batchQueries: typeof import("@/server/batches/queries");
  chiffres: typeof import("@/server/chiffres");
};

let server: Server;

beforeAll(async () => {
  const money = await loadMoneyServer();
  server = {
    ...money,
    queries: await import("@/server/documents/queries"),
    sql: await import("@/server/documents/sql"),
    batchQueries: await import("@/server/batches/queries"),
    chiffres: await import("@/server/chiffres"),
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

type LineInput = CreateDocumentInput["lines"][number];

const DAY = 24 * 60 * 60 * 1000;

async function order(options: {
  lines: LineInput[];
  customer?: CreateDocumentInput["customer"];
  expectedDeliveryAt?: Date | null;
  notes?: string;
  batchId?: string;
  received?: { amount: string; pocketId: string | null }[];
}): Promise<string> {
  const id = newId();
  expectOk(
    await server.documents.createDocumentAction({
      id,
      origin: "ORDER",
      customer: options.customer ?? { kind: "passing", name: "Client" },
      lines: options.lines,
      expectedDeliveryAt: options.expectedDeliveryAt ?? undefined,
      notes: options.notes,
      batchId: options.batchId,
      payments: (options.received ?? []).map((payment) => ({ id: newId(), ...payment })),
    }),
  );
  return id;
}

const ids = (list: Awaited<ReturnType<typeof server.queries.ordersList>>) => list.sections.flatMap((s) => s.rows.map((r) => r.id));

describe("E10 — vue « À livrer »", () => {
  it("sections d'urgence dans l'ordre, compteurs, chips, tri par livraison prévue puis date de commande", async () => {
    const perfume = await seedPerfume(server.prisma);
    const line = catalogueLine(perfume.id);
    const now = Date.now();
    const late = await order({ lines: [line], expectedDeliveryAt: new Date(now - 2 * DAY), received: [{ amount: "20", pocketId: null }] });
    const today = await order({ lines: [line], expectedDeliveryAt: new Date(now) });
    const tomorrow = await order({ lines: [line], expectedDeliveryAt: new Date(now + DAY) });
    const later = await order({ lines: [line], expectedDeliveryAt: new Date(now + 20 * DAY) });
    const undated = await order({ lines: [line] });
    // Hors de la vue : une commande livrée et une vente directe.
    const delivered = await order({ lines: [line] });
    expectOk(await server.documents.changeDocumentStatusAction({ documentId: delivered, to: "DELIVERED", confirm: true }));
    expectOk(
      await server.documents.createDocumentAction({ id: newId(), origin: "DIRECT_SALE", lines: [line], customer: { kind: "passing", name: "V" }, payments: [{ id: newId(), amount: "120", pocketId: null }] }),
    );

    const list = await server.queries.ordersList();
    expect(list.vue).toBe("a-livrer");
    expect(list.counts).toEqual({ aLivrer: 5, livrees: 1, annulees: 0, all: 6 });
    expect(list.chips).toEqual({ enAttente: 4, confirmees: 1 });
    const keys = list.sections.map((section) => section.key);
    expect(keys[0]).toBe("retard");
    expect(keys.at(-1)).toBe("sans-date");
    expect(keys).toContain("aujourdhui");
    expect(keys.slice(1, -1).every((key) => ["aujourdhui", "demain", "semaine", "plus-tard"].includes(key))).toBe(true);
    expect(ids(list)).toEqual([late, today, tomorrow, later, undated]);
    const retard = list.sections[0];
    expect(retard?.count).toBe(1);
    expect(retard?.rows[0]).toMatchObject({ id: late, status: "CONFIRMED", itemCount: 1, deliveredCount: 0, total: "120.00", paid: "20.00", due: "100.00" });
    expect(list.total).toBe(5);
    expect(list.hasMore).toBe(false);
  });

  it("filtres : en retard (ensemble compté par `enRetard`), en attente, confirmées ; un filtre inconnu est ignoré", async () => {
    const perfume = await seedPerfume(server.prisma);
    const line = catalogueLine(perfume.id);
    const late = await order({ lines: [line], expectedDeliveryAt: new Date(Date.now() - 3 * DAY) });
    const confirmed = await order({ lines: [line], received: [{ amount: "10", pocketId: null }] });

    expect(ids(await server.queries.ordersList("a-livrer", "retard"))).toEqual([late]);
    expect((await server.chiffres.enRetard()).documentIds).toEqual([late]);
    expect(ids(await server.queries.ordersList("a-livrer", "en-attente"))).toEqual([late]);
    expect(ids(await server.queries.ordersList("a-livrer", "confirmees"))).toEqual([confirmed]);
    const unknown = await server.queries.ordersList("a-livrer", "n-importe-quoi");
    expect(unknown.filtre).toBeNull();
    expect(ids(unknown)).toHaveLength(2);
    // Un filtre n'a pas de sens hors « À livrer ».
    expect((await server.queries.ordersList("livrees", "retard")).filtre).toBeNull();
  });
});

describe("E10 — vues « Livrées » et « Annulées »", () => {
  it("Livrées : section « À encaisser » d'abord (plus anciennes livraisons en tête), puis un mois par section, plus récents d'abord", async () => {
    const perfume = await seedPerfume(server.prisma);
    const line = catalogueLine(perfume.id);
    const paidOld = await order({ lines: [line], received: [{ amount: "120", pocketId: null }] });
    const paidRecent = await order({ lines: [line], received: [{ amount: "120", pocketId: null }] });
    const dueOld = await order({ lines: [line] });
    const dueRecent = await order({ lines: [line] });
    for (const id of [paidOld, paidRecent, dueOld, dueRecent]) {
      expectOk(await server.documents.changeDocumentStatusAction({ documentId: id, to: "DELIVERED", confirm: true }));
    }
    await backdate(paidOld, 95);
    await backdate(dueOld, 60);

    const list = await server.queries.ordersList("livrees");
    expect(list.sections[0]).toMatchObject({ key: "a-encaisser", kind: "receivable", count: 2 });
    expect(list.sections[0]?.rows.map((row) => row.id)).toEqual([dueOld, dueRecent]);
    expect(list.sections.slice(1).every((section) => section.kind === "month" && /^\d{4}-\d{2}$/.test(section.key))).toBe(true);
    expect(ids(list).slice(2)).toEqual([paidRecent, paidOld]);
  });

  it("Annulées : par mois d'annulation ; le payé conservé est rendu", async () => {
    const perfume = await seedPerfume(server.prisma);
    const cancelled = await order({ lines: [catalogueLine(perfume.id)], received: [{ amount: "40", pocketId: null }] });
    expectOk(await server.documents.cancelDocumentAction({ documentId: cancelled, confirm: true }));
    const list = await server.queries.ordersList("annulees");
    expect(list.counts.annulees).toBe(1);
    expect(list.sections).toHaveLength(1);
    expect(list.sections[0]?.rows[0]).toMatchObject({ id: cancelled, status: "CANCELLED", paid: "40.00", due: "80.00" });
  });

  it("pagination : fenêtres calculées avant la limite, « Afficher plus » quand il reste des documents", async () => {
    const perfume = await seedPerfume(server.prisma);
    for (let i = 0; i < 3; i += 1) await order({ lines: [catalogueLine(perfume.id)] });
    const rows = await server.prisma.$queryRaw<{ id: string; sectionCount: number; totalCount: number }[]>(
      server.sql.ordersListSql({ view: "a-livrer", filter: null, search: { terms: [], phone: null }, limit: 2, now: new Date() }),
    );
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.totalCount === 3 && row.sectionCount === 3)).toBe(true);
    expect(server.queries.ordersList).toBeTypeOf("function");
  });
});

/** Recule un document livré de `days` jours (commande, engagement, livraison) : SQL brut de test. */
async function backdate(id: string, days: number) {
  await server.prisma.$executeRawUnsafe(
    `UPDATE "SaleDocument" SET "orderedAt" = now() - $1::int * interval '1 day', "confirmedAt" = now() - $1::int * interval '1 day',
            "deliveredAt" = now() - $1::int * interval '1 day' WHERE id = $2`,
    days,
    id,
  );
}

describe("E10 — recherche étendue (écart du 17/09/2026)", () => {
  async function scenario() {
    const dior = await seedPerfume(server.prisma, { name: "Sauvage", brand: "Dior" });
    const fahrenheit = await seedPerfume(server.prisma, { name: "Fahrenheit", brand: "Dior" });
    const bleu = await seedPerfume(server.prisma, { name: "Bleu de Chanel", brand: "Chanel" });
    const fares = await seedCustomer(server.prisma, { fullName: "Fares Benali", phoneE164: "+33612345678" });
    const batch = await seedBatch(server.prisma, { name: "Commande de mars" });
    const both = await order({ lines: [catalogueLine(dior.id)], customer: { kind: "linked", customerId: fares.id } });
    const brandOnly = await order({
      lines: [catalogueLine(fahrenheit.id), catalogueLine(bleu.id, { note: "coffret cadeau" })],
      customer: { kind: "passing", name: "Nadia", contact: "@nadia.snap" },
      batchId: batch.id,
    });
    const offCatalog = await order({
      lines: [{ item: { kind: "offCatalog", name: "Sauvage", brandName: null }, volumeMl: 50, quantity: 1, unitPriceEur: "90" }],
      customer: { kind: "passing", name: "Élysée" },
      notes: "Livrer au magasin",
    });
    return { both, brandOnly, offCatalog, fares };
  }

  it("« dior sauvage » : tous les mots, chacun dans n'importe quel champ — pas celle qui n'a que l'un des deux", async () => {
    const { both, offCatalog, brandOnly } = await scenario();
    expect(ids(await server.queries.ordersList("a-livrer", null, "dior sauvage"))).toEqual([both]);
    // Un article hors catalogue se trouve par son nom de ligne.
    expect(new Set(ids(await server.queries.ordersList("a-livrer", null, "sauvage")))).toEqual(new Set([both, offCatalog]));
    expect(ids(await server.queries.ordersList("a-livrer", null, "DIOR"))).toEqual(expect.arrayContaining([both, brandOnly]));
  });

  it("insensible aux accents dans les deux sens, contact, notes de document et de ligne, lot, téléphone", async () => {
    const { both, brandOnly, offCatalog } = await scenario();
    expect(ids(await server.queries.ordersList("a-livrer", null, "elysee"))).toEqual([offCatalog]);
    expect(ids(await server.queries.ordersList("a-livrer", null, "ÉLYSÉE"))).toEqual([offCatalog]);
    expect(ids(await server.queries.ordersList("a-livrer", null, "magasin"))).toEqual([offCatalog]);
    expect(ids(await server.queries.ordersList("a-livrer", null, "coffret"))).toEqual([brandOnly]);
    expect(ids(await server.queries.ordersList("a-livrer", null, "nadia.snap"))).toEqual([brandOnly]);
    expect(ids(await server.queries.ordersList("a-livrer", null, "mars"))).toEqual([brandOnly]);
    expect(ids(await server.queries.ordersList("a-livrer", null, "06 12"))).toEqual([both]);
    expect(ids(await server.queries.ordersList("a-livrer", null, "+33 6 12 34"))).toEqual([both]);
    // Un mot d'une lettre est ignoré ; un caractère joker n'élargit rien.
    expect(ids(await server.queries.ordersList("a-livrer", null, "x dior sauvage"))).toEqual([both]);
    expect(ids(await server.queries.ordersList("a-livrer", null, "%%"))).toEqual([]);
    // Vide de filtre.
    const none = await server.queries.ordersList("a-livrer", null, "introuvable");
    expect(none.sections).toEqual([]);
    expect(none.counts.aLivrer).toBe(3);
  });

  it("dans « Livrées », une commande livrée il y a quatre mois se trouve si on la nomme", async () => {
    const perfume = await seedPerfume(server.prisma, { name: "Shalimar", brand: "Guerlain" });
    const old = await order({ lines: [catalogueLine(perfume.id)], customer: { kind: "passing", name: "Hortense" } });
    expectOk(await server.documents.changeDocumentStatusAction({ documentId: old, to: "DELIVERED", confirm: true }));
    await backdate(old, 122);
    expect(ids(await server.queries.ordersList("livrees", null, "hortense shalimar"))).toEqual([old]);
  });
});

describe("S01 — fiche document", () => {
  it("document, lignes, paiements appariés à leur contre-passation, montants de la vue et marge avant dépenses", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const perfume = await seedPerfume(server.prisma, { name: "Sauvage" });
    const customer = await seedCustomer(server.prisma, { fullName: "Lina Haddad" });
    const batch = await seedBatch(server.prisma, { name: "Lot de mai" });
    const id = await order({
      lines: [
        catalogueLine(perfume.id, { quantity: 2, unitPriceEur: "100", unitCostDzd: "13850", exchangeRate: "277", note: "Emballage" }),
        catalogueLine(perfume.id, { volumeMl: 10, unitPriceEur: "0", isGift: true, unitCostDzd: "2770", exchangeRate: "277" }),
      ],
      customer: { kind: "linked", customerId: customer.id },
      batchId: batch.id,
      received: [{ amount: "80", pocketId: cash.id }],
    });
    const deposit = (await server.prisma.payment.findFirstOrThrow({ where: { documentId: id } })).id;
    expectOk(await server.payments.voidPaymentAction({ paymentId: deposit }));
    expectOk(await server.payments.recordPaymentAction({ id: newId(), documentId: id, amount: "50", pocketId: cash.id }));

    const sheet = await server.queries.documentSheet(id);
    expect(sheet).toMatchObject({
      id,
      origin: "ORDER",
      status: "CONFIRMED",
      customer: { id: customer.id, fullName: "Lina Haddad" },
      batch: { id: batch.id, name: "Lot de mai", status: "OPEN" },
      balance: { total: "200.00", paid: "50.00", due: "150.00", overpaid: "0.00", hasUnknownCost: false, marginBeforeExpenses: "90.00", marginPercent: "45,0" },
    });
    expect(sheet?.lines.map((line) => [line.volumeMl, line.quantity, line.unitPriceEur, line.isGift, line.unitCostEur, line.note])).toEqual([
      [50, 2, "100.00", false, "50.00", "Emballage"],
      [10, 1, "0.00", true, "10.00", null],
    ]);
    const [original, reversal, second] = sheet?.payments ?? [];
    expect(original).toMatchObject({ id: deposit, kind: "DEPOSIT", amount: "80.00", pocketName: "Espèces", reversedByPaymentId: reversal?.id, reversesPaymentId: null });
    expect(reversal).toMatchObject({ kind: "REFUND", amount: "-80.00", reversesPaymentId: deposit });
    expect(second).toMatchObject({ kind: "DEPOSIT", amount: "50.00", reversesPaymentId: null, reversedByPaymentId: null });
  });

  it("coût inconnu : marge non calculée ; trop-perçu rendu ; identifiant illisible ou supprimé : null", async () => {
    const perfume = await seedPerfume(server.prisma);
    const id = newId();
    expectOk(
      await server.documents.createDocumentAction({
        id,
        origin: "DIRECT_SALE",
        customer: { kind: "passing", name: "Hugo" },
        lines: [catalogueLine(perfume.id, { unitPriceEur: "60" })],
        payments: [{ id: newId(), amount: "60", pocketId: null }],
      }),
    );
    const sheet = await server.queries.documentSheet(id);
    expect(sheet?.balance).toMatchObject({ hasUnknownCost: true, marginBeforeExpenses: null, marginPercent: null, due: "0.00" });
    expect(await server.queries.documentSheet("pas-un-identifiant")).toBeNull();
    expect(await server.queries.documentSheet(newId())).toBeNull();
  });
});

describe("N7 et S07 — vendus récemment, lots ouverts", () => {
  it("derniers parfums distincts, dernière contenance et dernier prix ; ni offert ni annulé", async () => {
    const a = await seedPerfume(server.prisma, { name: "Libre", brand: "YSL" });
    const b = await seedPerfume(server.prisma, { name: "Y", brand: "YSL" });
    const c = await seedPerfume(server.prisma, { name: "Opium", brand: "YSL" });
    const sale = async (lines: LineInput[], received: string) =>
      expectOk(
        await server.documents.createDocumentAction({
          id: newId(),
          origin: "DIRECT_SALE",
          customer: { kind: "passing", name: "V" },
          lines,
          payments: [{ id: newId(), amount: received, pocketId: null }],
        }),
      );
    await sale([catalogueLine(a.id, { volumeMl: 80, unitPriceEur: "110" })], "110");
    await new Promise((resolve) => setTimeout(resolve, 5));
    await sale([catalogueLine(a.id, { volumeMl: 50, unitPriceEur: "85" }), catalogueLine(b.id, { unitPriceEur: "0", isGift: true })], "85");
    const cancelled = await order({ lines: [catalogueLine(c.id)] });
    expectOk(await server.documents.cancelDocumentAction({ documentId: cancelled, confirm: true }));

    const recent = await server.queries.recentlySold();
    expect(recent.map((item) => [item.name, item.volumeMl, item.unitPriceEur])).toEqual([["Libre", 50, "85.00"]]);
  });

  it("lots ouverts, le plus récent en tête", async () => {
    await seedBatch(server.prisma, { name: "Ancien" });
    await seedBatch(server.prisma, { name: "Clos", status: "CLOSED" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await seedBatch(server.prisma, { name: "Récent" });
    expect((await server.batchQueries.openBatches()).map((batch) => batch.name)).toEqual(["Récent", "Ancien"]);
  });
});
