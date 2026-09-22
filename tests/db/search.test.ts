import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { catalogueLine, expectInvariants, loadMoneyServer, seedPocket, seedSystemPocket, type MoneyServer } from "./transactions/support/argent";
import { expectOk, freshStart, newId, seedCustomer, seedPerfume } from "./transactions/support/harness";

/**
 * Recherche à la frappe (07 J8 ; 06 §4.4 S17, S06 ; 04 §3.5, §15 règle 10) : « 06 12 » trouve un client
 * enregistré « +33 6 12… » ; un document est trouvé par le nom ACTUEL du client et par le nom saisi ; parfums par
 * nom et marque, sans accents ; groupes de 6 et total ; récents de S06.
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

let server: MoneyServer & { search: typeof import("@/server/search/queries") };

beforeAll(async () => {
  server = { ...(await loadMoneyServer()), search: await import("@/server/search/queries") };
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

describe("S17 — clients", () => {
  it("« 06 12 », « +33 6 12 » et « 0612 » trouvent le client enregistré « +33 6 12… » ; le contact s'écrit à la française", async () => {
    const fares = await seedCustomer(server.prisma, { fullName: "Fares Benali", phoneE164: "+33612345678" });
    await seedCustomer(server.prisma, { fullName: "Lina Haddad", phoneE164: "+33698765432" });
    for (const q of ["06 12", "+33 6 12", "0612", "06.12.34"]) {
      const results = await server.search.searchAdmin(q, "all");
      expect(results.customers.items.map((hit) => hit.id), q).toEqual([fares.id]);
    }
    const [hit] = (await server.search.searchAdmin("fares", "customers")).customers.items;
    expect(hit).toMatchObject({ fullName: "Fares Benali", contact: "06 12 34 56 78", due: null });
  });

  it("insensible aux accents et à la casse ; tous les mots ; le dû de la fiche accompagne le résultat", async () => {
    const perfume = await seedPerfume(server.prisma);
    const elise = await seedCustomer(server.prisma, { fullName: "Élise Martin" });
    await seedCustomer(server.prisma, { fullName: "Elias Martin" });
    expectOk(
      await server.documents.createDocumentAction({
        id: newId(),
        origin: "DIRECT_SALE",
        customer: { kind: "linked", customerId: elise.id },
        lines: [catalogueLine(perfume.id, { unitPriceEur: "100" })],
        payments: [{ id: newId(), amount: "20", pocketId: null }],
      }),
    );
    const results = await server.search.searchAdmin("ELISE mart", "all");
    expect(results.customers.items).toEqual([expect.objectContaining({ id: elise.id, due: "80.00" })]);
    expect((await server.search.searchAdmin("martin", "all")).customers.total).toBe(2);
  });

  it("saisie vide, portée clients : les 8 clients au document le plus récent (S06) ; moins de 2 caractères ailleurs : rien", async () => {
    const perfume = await seedPerfume(server.prisma);
    const customers = [];
    for (let i = 0; i < 10; i += 1) customers.push(await seedCustomer(server.prisma, { fullName: `Client ${String(i).padStart(2, "0")}` }));
    const withDocument = customers[7] as (typeof customers)[number];
    expectOk(
      await server.documents.createDocumentAction({
        id: newId(),
        origin: "ORDER",
        customer: { kind: "linked", customerId: withDocument.id },
        lines: [catalogueLine(perfume.id)],
      }),
    );
    const recents = await server.search.searchAdmin("", "customers");
    expect(recents.recentCustomers).toHaveLength(8);
    expect(recents.recentCustomers[0]?.id).toBe(withDocument.id);
    expect((await server.search.searchAdmin("c", "all")).customers.total).toBe(0);
    expect((await server.search.searchAdmin("", "all")).recentCustomers).toEqual([]);
  });
});

describe("S17 — action « Encaisser xx € » d'un résultat client (A16, 07 J15)", () => {
  it("le résultat porte ses créances, les plus anciennes d'abord, et les poches du moment accompagnent la réponse", async () => {
    await seedSystemPocket(server.prisma);
    const bank = await seedPocket(server.prisma, { name: "Banque", kind: "BANK" });
    const perfume = await seedPerfume(server.prisma);
    const nora = await seedCustomer(server.prisma, { fullName: "Nora Belkacem" });

    // Deux créances engagées, la plus ancienne d'abord : « Tout encaisser » les solde dans cet ordre.
    const older = newId();
    const newer = newId();
    for (const [id, price] of [
      [older, "100"],
      [newer, "60"],
    ] as const) {
      expectOk(
        await server.documents.createDocumentAction({
          id,
          origin: "DIRECT_SALE",
          customer: { kind: "linked", customerId: nora.id },
          lines: [catalogueLine(perfume.id, { unitPriceEur: price })],
          payments: [{ id: newId(), amount: "20", pocketId: bank.id }],
        }),
      );
    }

    const results = await server.search.searchAdmin("nora", "all");
    const [hit] = results.customers.items;
    expect(hit?.due).toBe("120.00");
    expect(hit?.receivables.map((item) => [item.documentId, item.due])).toEqual([
      [older, "80.00"],
      [newer, "40.00"],
    ]);
    // Les poches sont là pour que S02 s'ouvre sans aller-retour, « Non attribué » en dernier.
    expect(results.pockets.map((pocket) => pocket.name)).toEqual(["Banque", "Non attribué"]);
  });

  it("aucune créance, ou une portée de sélecteur : ni créances ni poches — la frappe ne paie pas ces lectures", async () => {
    await seedSystemPocket(server.prisma);
    await seedPocket(server.prisma, { name: "Espèces" });
    const perfume = await seedPerfume(server.prisma);
    const elise = await seedCustomer(server.prisma, { fullName: "Élise Martin" });
    expectOk(
      await server.documents.createDocumentAction({
        id: newId(),
        origin: "DIRECT_SALE",
        customer: { kind: "linked", customerId: elise.id },
        lines: [catalogueLine(perfume.id, { unitPriceEur: "100" })],
        payments: [{ id: newId(), amount: "100", pocketId: null }],
      }),
    );
    const soldee = await server.search.searchAdmin("elise", "all");
    expect(soldee.customers.items[0]).toMatchObject({ due: null, receivables: [] });
    expect(soldee.pockets).toEqual([]);

    const picker = await server.search.searchAdmin("elise", "customers");
    expect(picker.customers.items[0]?.receivables).toEqual([]);
    expect(picker.pockets).toEqual([]);
  });
});

describe("S17 — documents", () => {
  it("trouvé par le nom ACTUEL de la fiche et par le nom saisi ; « À encaisser » seulement pour un document engagé", async () => {
    const perfume = await seedPerfume(server.prisma);
    const customer = await seedCustomer(server.prisma, { fullName: "Yanis Cherif" });
    const linked = newId();
    expectOk(
      await server.documents.createDocumentAction({
        id: linked,
        origin: "ORDER",
        customer: { kind: "linked", customerId: customer.id },
        lines: [catalogueLine(perfume.id)],
        payments: [{ id: newId(), amount: "20", pocketId: null }],
      }),
    );
    const passing = newId();
    expectOk(
      await server.documents.createDocumentAction({
        id: passing,
        origin: "ORDER",
        customer: { kind: "passing", name: "Nadia Saïdi" },
        lines: [catalogueLine(perfume.id)],
      }),
    );
    // La fiche est renommée après coup : le nom vivant fait foi, l'ancien snapshot aussi.
    expectOk(await server.customers.updateCustomerAction({ id: customer.id, fullName: "Yanis Chérif-Amrani" }));

    const byLiveName = await server.search.searchAdmin("amrani", "all");
    expect(byLiveName.documents.items).toEqual([
      expect.objectContaining({ id: linked, customerName: "Yanis Chérif-Amrani", status: "CONFIRMED", total: "120.00", due: "100.00" }),
    ]);
    expect((await server.search.searchAdmin("yanis cherif", "documents")).documents.items.map((hit) => hit.id)).toEqual([linked]);
    const byTypedName = await server.search.searchAdmin("saidi", "all");
    expect(byTypedName.documents.items).toEqual([expect.objectContaining({ id: passing, status: "PENDING", due: null })]);
  });
});

describe("S17 — parfums, groupes", () => {
  it("nom et marque sans accents ; groupes de 6 avec le total ; une portée seule rend plus", async () => {
    for (let i = 0; i < 8; i += 1) await seedPerfume(server.prisma, { name: `Élixir ${i}`, brand: "Guerlain" });
    await seedPerfume(server.prisma, { name: "Sauvage", brand: "Dior" });
    const all = await server.search.searchAdmin("elixir guerlain", "all");
    expect(all.perfumes.total).toBe(8);
    expect(all.perfumes.items).toHaveLength(6);
    expect((await server.search.searchAdmin("elixir", "perfumes")).perfumes.items).toHaveLength(8);
    const [sauvage] = (await server.search.searchAdmin("sauv", "all")).perfumes.items;
    expect(sauvage).toMatchObject({ name: "Sauvage", brandName: "Dior", status: "PUBLISHED", stockStatus: "untracked" });
    expect((await server.search.searchAdmin("sauv", "customers")).perfumes.total).toBe(0);
  });
});
