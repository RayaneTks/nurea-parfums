import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateDocumentInput } from "@/contracts/documents";
import { catalogueLine, expectInvariants, loadMoneyServer, type MoneyServer } from "./transactions/support/argent";
import { expectOk, freshStart, newId, seedCustomer, seedPerfume } from "./transactions/support/harness";

/**
 * Lectures du module clients (07 J10) : liste E12 (A–Z à initiales accentuées, tri total et fenêtres stables,
 * recherche nom / téléphone normalisé / Snap / WhatsApp qui repart de la première fiche, badge du dû), fiche E14
 * (tuiles, historique de TOUTES les opérations par pages, « Achète souvent », récap, garde de suppression) et
 * annuaire E20. Le dû d'une fiche est confronté à `aEncaisser(null, id)` et au groupe de l'écran À encaisser.
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
  queries: typeof import("@/server/customers/queries");
  chiffres: typeof import("@/server/chiffres");
};

let server: Server;

beforeAll(async () => {
  server = {
    ...(await loadMoneyServer()),
    queries: await import("@/server/customers/queries"),
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

/** Un document lié à la fiche, créé par l'action (T1) ; `received` : encaissé à la création. */
async function documentFor(
  customerId: string,
  options: { origin?: "ORDER" | "DIRECT_SALE"; lines: LineInput[]; received?: string },
): Promise<string> {
  const id = newId();
  expectOk(
    await server.documents.createDocumentAction({
      id,
      origin: options.origin ?? "ORDER",
      customer: { kind: "linked", customerId },
      lines: options.lines,
      payments: options.received ? [{ id: newId(), amount: options.received, pocketId: null }] : [],
      confirm: true,
    }),
  );
  return id;
}

const names = (list: Awaited<ReturnType<typeof server.queries.customersList>>) => list.rows.map((row) => row.fullName);

describe("E12 — liste A–Z", () => {
  it("initiales accentuées sous leur lettre de base, noms sans lettre initiale en dernier sous « # », compteurs", async () => {
    for (const fullName of ["Zoé Amrani", "Élise Martin", "eden Kaci", "Alice Durand", "4 Saisons", "Œdipe Roy"]) {
      await seedCustomer(server.prisma, { fullName });
    }
    const list = await server.queries.customersList();
    expect(list.rows.map((row) => [row.fullName, row.letter])).toEqual([
      ["Alice Durand", "A"],
      ["eden Kaci", "E"],
      ["Élise Martin", "E"],
      ["Œdipe Roy", "O"],
      ["Zoé Amrani", "Z"],
      ["4 Saisons", "#"],
    ]);
    expect(list).toMatchObject({ q: "", pages: 1, total: 6, all: 6, hasMore: false });
  });

  it("tri total (nom plié, puis identifiant) : les fenêtres successives s'étendent sans saut ni doublon, homonymes compris", async () => {
    await server.prisma.customer.createMany({
      data: Array.from({ length: 120 }, (_, index) => ({ fullName: index % 2 === 0 ? "Martin" : `Client ${String(index).padStart(3, "0")}` })),
    });
    const one = await server.queries.customersList(null, "1");
    const two = await server.queries.customersList(null, "2");
    const three = await server.queries.customersList(null, "3");
    expect([one.rows.length, two.rows.length, three.rows.length]).toEqual([50, 100, 120]);
    expect([one.hasMore, two.hasMore, three.hasMore]).toEqual([true, true, false]);
    expect(two.rows.slice(0, 50).map((row) => row.id)).toEqual(one.rows.map((row) => row.id));
    expect(three.rows.slice(0, 100).map((row) => row.id)).toEqual(two.rows.map((row) => row.id));
    expect(new Set(three.rows.map((row) => row.id)).size).toBe(120);
    expect(three.total).toBe(120);
    // Une URL fabriquée ne dépasse pas 40 pages ; une valeur illisible vaut 1.
    expect((await server.queries.customersList(null, "abc")).pages).toBe(1);
  });

  it("recherche : « 06 12 », « +33 6 12 », WhatsApp, Snap avec ou sans @, sans accents, tous les mots ; mots et chiffres mêlés", async () => {
    const fares = await server.prisma.customer.create({
      data: { fullName: "Fares Benali", phoneE164: "+33612345678", snapchat: "fares.b", whatsappE164: "+33711223344" },
    });
    const elise = await seedCustomer(server.prisma, { fullName: "Élise Martin" });
    await seedCustomer(server.prisma, { fullName: "Elias Martin", phoneE164: "+33698765432" });
    const found = async (q: string) => (await server.queries.customersList(q)).rows.map((row) => row.id);

    for (const q of ["06 12", "+33 6 12", "0612", "06.12.34"]) expect(await found(q), q).toEqual([fares.id]);
    expect(await found("07 11 22"), "WhatsApp").toEqual([fares.id]);
    expect(await found("fares.b"), "Snap").toEqual([fares.id]);
    expect(await found("@fares"), "Snap avec @").toEqual([fares.id]);
    expect(await found("elise"), "sans accent").toEqual([elise.id]);
    expect(await found("MARTIN élise"), "tous les mots, dans le désordre").toEqual([elise.id]);
    expect(await found("fares 0612"), "mots et chiffres").toEqual([fares.id]);
    const none = await server.queries.customersList("introuvable");
    expect(none).toMatchObject({ rows: [], total: 0, all: 3, hasMore: false });
    // Le contact s'écrit à la française ; le Snap à défaut de téléphone.
    const [fareRow] = (await server.queries.customersList("fares")).rows;
    expect(fareRow?.contact).toBe("06 12 34 56 78");
  });

  it("une recherche repart de la première fiche, même demandée avec des pages : elle trouve un client de la première page", async () => {
    await server.prisma.customer.createMany({ data: Array.from({ length: 60 }, (_, index) => ({ fullName: `Zed ${String(index).padStart(2, "0")}` })) });
    const first = await seedCustomer(server.prisma, { fullName: "Aaron Dupont" });
    const page2 = await server.queries.customersList(null, "2");
    expect(page2.rows[0]?.id).toBe(first.id);
    const search = await server.queries.customersList("dupont", "2");
    expect(search.rows.map((row) => row.id)).toEqual([first.id]);
    expect(search.total).toBe(1);
  });

  it("badge « X € dû » = À encaisser de la fiche : commandes en attente et documents annulés n'en sont pas", async () => {
    const perfume = await seedPerfume(server.prisma);
    const line = catalogueLine(perfume.id, { unitPriceEur: "100" });
    const fares = await seedCustomer(server.prisma, { fullName: "Fares Benali" });
    const lina = await seedCustomer(server.prisma, { fullName: "Lina Haddad" });
    await documentFor(fares.id, { origin: "DIRECT_SALE", lines: [line], received: "30" });
    await documentFor(fares.id, { lines: [line], received: "40" });
    await documentFor(lina.id, { lines: [line] });

    const list = await server.queries.customersList();
    const due = Object.fromEntries(list.rows.map((row) => [row.fullName, row.due]));
    expect(due).toEqual({ "Fares Benali": "130.00", "Lina Haddad": null });
    expect(await server.chiffres.aEncaisser(null, fares.id)).toBe("130.00");
  });
});

describe("E14 — fiche client", () => {
  it("tuiles, garde de suppression, historique de toutes les opérations, dû identique à À encaisser", async () => {
    const perfume = await seedPerfume(server.prisma, { name: "Sauvage" });
    const khamrah = await seedPerfume(server.prisma, { name: "Khamrah", brand: "Lattafa" });
    const fares = await seedCustomer(server.prisma, { fullName: "Fares Benali" });
    const sale = await documentFor(fares.id, { origin: "DIRECT_SALE", lines: [catalogueLine(perfume.id, { unitPriceEur: "120", quantity: 2 })], received: "200" });
    const confirmed = await documentFor(fares.id, { lines: [catalogueLine(khamrah.id, { unitPriceEur: "60", volumeMl: 10 })], received: "20" });
    const pending = await documentFor(fares.id, { lines: [catalogueLine(perfume.id, { unitPriceEur: "90", volumeMl: 80 })] });
    const cancelled = await documentFor(fares.id, { lines: [catalogueLine(khamrah.id, { unitPriceEur: "50" })] });
    expectOk(await server.documents.cancelDocumentAction({ documentId: cancelled, refunds: [], confirm: true }));

    const sheet = await server.queries.customerSheet(fares.id);
    expect(sheet).not.toBeNull();
    if (!sheet) return;
    expect(sheet.customer.fullName).toBe("Fares Benali");
    expect(sheet).toMatchObject({ documentCount: 3, historyCount: 4, openOrders: 2 });
    expect(sheet.lastPurchaseAt).not.toBeNull();

    // Toutes les opérations, la plus récente d'abord ; « À encaisser » seulement sur un document engagé.
    expect(sheet.history.rows.map((row) => [row.id, row.status, row.itemCount, row.total, row.due])).toEqual([
      [cancelled, "CANCELLED", 1, "50.00", null],
      [pending, "PENDING", 1, "90.00", null],
      [confirmed, "CONFIRMED", 1, "60.00", "40.00"],
      [sale, "DELIVERED", 2, "240.00", "40.00"],
    ]);
    expect(sheet.history).toMatchObject({ pages: 1, hasMore: false });
    // Récap : les derniers documents non annulés.
    expect(sheet.recap.map((row) => row.id)).toEqual([pending, confirmed, sale]);
    // Achète souvent : en documents non annulés, puis le plus récent ; contenance du dernier achat.
    expect(sheet.frequent.map((item) => [item.name, item.brandName, item.times, item.volumeMl])).toEqual([
      ["Sauvage", "Dior", 2, 80],
      ["Khamrah", "Lattafa", 1, 10],
    ]);

    // Le dû : la tuile (`aEncaisser(null, id)`) = le groupe du client sur À encaisser = le badge de la liste = le SQL.
    const tile = await server.chiffres.aEncaisser(null, fares.id);
    const group = (await server.chiffres.aEncaisserDetail()).filter((item) => item.customerId === fares.id);
    const badge = (await server.queries.customersList("fares")).rows[0]?.due;
    const [sql] = await server.prisma.$queryRawUnsafe<{ due: string }[]>(
      `SELECT COALESCE(SUM(due), 0)::numeric(12,2)::text AS due FROM "DocumentBalance" WHERE "customerId" = $1 AND status IN ('CONFIRMED', 'DELIVERED')`,
      fares.id,
    );
    expect(tile).toBe("80.00");
    expect(group.map((item) => item.due).reduce((a, b) => (Number(a) + Number(b)).toFixed(2), "0.00")).toBe(tile);
    expect(badge).toBe(tile);
    expect(sql?.due).toBe(tile);
  });

  it("historique par pages de 20 ; « client depuis » : le plus ancien de la fiche et de son premier document", async () => {
    const perfume = await seedPerfume(server.prisma);
    const lina = await seedCustomer(server.prisma, { fullName: "Lina Haddad" });
    for (let index = 0; index < 23; index += 1) {
      await documentFor(lina.id, { origin: "DIRECT_SALE", lines: [catalogueLine(perfume.id)], received: "120" });
    }
    const first = await server.queries.customerSheet(lina.id);
    const second = await server.queries.customerSheet(lina.id, "2");
    expect(first?.history.rows).toHaveLength(20);
    expect(first?.history.hasMore).toBe(true);
    expect(second?.history.rows).toHaveLength(23);
    expect(second?.history.hasMore).toBe(false);
    expect(second?.history.rows.slice(0, 20).map((row) => row.id)).toEqual(first?.history.rows.map((row) => row.id));

    // Une fiche reprise créée APRÈS son premier document : elle date de ce document.
    const older = new Date("2025-03-12T10:00:00.000Z");
    const firstDocument = first?.history.rows.at(-1)?.id;
    await server.prisma.$executeRawUnsafe(`UPDATE "SaleDocument" SET "orderedAt" = $1 WHERE id = $2`, older, firstDocument);
    expect((await server.queries.customerSheet(lina.id))?.since).toBe(older.toISOString());
  });

  it("fiche sans document : tuiles à zéro, rien à relancer ni à revendre ; identifiant illisible ou fiche supprimée : null", async () => {
    const sarah = await seedCustomer(server.prisma, { fullName: "Sarah Kaci" });
    const sheet = await server.queries.customerSheet(sarah.id);
    expect(sheet).toMatchObject({ documentCount: 0, historyCount: 0, openOrders: 0, lastPurchaseAt: null, frequent: [], recap: [] });
    expect(await server.chiffres.aEncaisser(null, sarah.id)).toBe("0.00");
    expect(await server.queries.customerSheet("pas-un-id")).toBeNull();
    expect(await server.queries.customerSheet(newId())).toBeNull();
  });
});

describe("E20 — formulaire", () => {
  it("annuaire des fiches (homonymes, numéro pris) ; fiche à modifier, ou null si elle n'existe plus", async () => {
    const fares = await server.prisma.customer.create({ data: { fullName: "Fares Benali", phoneE164: "+33612345678", notes: "Le soir" } });
    const directory = await server.queries.customerDirectory();
    expect(directory).toEqual([{ id: fares.id, fullName: "Fares Benali", phoneE164: "+33612345678", whatsappE164: null }]);
    expect(await server.queries.customerForm(fares.id)).toMatchObject({ id: fares.id, notes: "Le soir", address: null });
    expect(await server.queries.customerForm(newId())).toBeNull();
  });
});
