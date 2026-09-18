import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { OPEN_BATCHES_HOME, TOP_PERFUMES_HOME } from "@/contracts/stats";
import { eur, eurFromWire, toWire } from "@/domain/money";
import { parisDayKey, periodBounds } from "@/domain/periods";
import { catalogueLine, expectInvariants, loadMoneyServer, seedPocket, type MoneyServer } from "./transactions/support/argent";
import { expectOk, freshStart, newId, seedBatch, seedCustomer, seedPerfume } from "./transactions/support/harness";

/**
 * Jalon J14 (07) — lectures de l'Accueil, du Récap du jour et des Statistiques, sur base réelle.
 *
 * La règle de ce fichier : **aucun chiffre affiché n'est cru sur parole**. Chaque valeur rendue par les
 * nouvelles lectures est confrontée à la fonction canonique de `src/server/chiffres` (04 §6.1), et chaque
 * compteur d'alerte au nombre de lignes de l'écran qu'il ouvre (05 §5.3 — le défaut de l'existant, 01 §4.6).
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
  chiffres: typeof import("@/server/chiffres");
  stats: typeof import("@/server/stats/queries");
  documentsQueries: typeof import("@/server/documents/queries");
  catalogueQueries: typeof import("@/server/catalogue/queries");
};

let server: Server;

beforeAll(async () => {
  const money = await loadMoneyServer();
  server = {
    ...money,
    chiffres: await import("@/server/chiffres"),
    stats: await import("@/server/stats/queries"),
    documentsQueries: await import("@/server/documents/queries"),
    catalogueQueries: await import("@/server/catalogue/queries"),
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

const DAY = 24 * 60 * 60 * 1000;
const COST = { unitCostDzd: "22000", exchangeRate: "277" } as const;

type SaleOptions = {
  perfumeId: number;
  pocketId?: string | null;
  amount?: string;
  quantity?: number;
  price?: string;
  gift?: boolean;
  batchId?: string;
  customer?: { kind: "passing"; name: string } | { kind: "linked"; customerId: string };
  unknownCost?: boolean;
  origin?: "ORDER" | "DIRECT_SALE";
  confirm?: boolean;
  expectedDeliveryAt?: string;
};

async function sale(options: SaleOptions): Promise<string> {
  const id = newId();
  const line = catalogueLine(options.perfumeId, options.unknownCost ? {} : COST);
  expectOk(
    await server.documents.createDocumentAction({
      id,
      origin: options.origin ?? "DIRECT_SALE",
      customer: options.customer ?? { kind: "passing", name: "Client" },
      lines: [
        {
          ...line,
          quantity: options.quantity ?? 1,
          ...(options.price === undefined ? {} : { unitPriceEur: options.price }),
          ...(options.gift ? { isGift: true, unitPriceEur: "0" } : {}),
        },
      ],
      batchId: options.batchId,
      expectedDeliveryAt: options.expectedDeliveryAt,
      payments: options.amount ? [{ id: newId(), amount: options.amount, pocketId: options.pocketId ?? null }] : [],
      confirm: options.confirm ?? true,
    }),
  );
  return id;
}

const sumOf = (values: readonly string[]) => toWire(eur.sum(values.map((value) => eurFromWire(value as never))));

// ─────────────────────────────────────────────────────────────────────────────

describe("E01 — chaque alerte ouvre exactement l'ensemble qu'elle compte (05 §5.3)", () => {
  it("retard, clients à relancer, coût à compléter, rupture et stock bas : compteur = lignes de l'écran ouvert", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const sauvage = await seedPerfume(server.prisma, { name: "Sauvage", brand: "Dior", stock: 0 });
    const libre = await seedPerfume(server.prisma, { name: "Libre", brand: "Yves Saint Laurent", stock: 2 });
    await seedPerfume(server.prisma, { name: "Asad", brand: "Lattafa", stock: 1 });
    // Non suivi : jamais une alerte, quoi qu'il arrive (02 §4.5 — l'ancien écran le comptait en rupture).
    await seedPerfume(server.prisma, { name: "Yara", brand: "Lattafa", stock: null });
    const nora = await seedCustomer(server.prisma, { fullName: "Nora Belkacem" });
    const fares = await seedCustomer(server.prisma, { fullName: "Fares Benali" });

    // Deux commandes en retard (livraison prévue avant 00:00 aujourd'hui), une à livrer demain.
    const retard1 = await sale({ perfumeId: sauvage.id, origin: "ORDER", amount: "10", pocketId: cash.id, expectedDeliveryAt: new Date(Date.now() - 3 * DAY).toISOString() });
    const retard2 = await sale({ perfumeId: libre.id, origin: "ORDER", confirm: false, expectedDeliveryAt: new Date(Date.now() - DAY).toISOString() });
    await sale({ perfumeId: libre.id, origin: "ORDER", expectedDeliveryAt: new Date(Date.now() + DAY).toISOString() });

    // Deux clients à relancer : une créance de plus de 30 jours chacun.
    for (const customer of [nora, fares]) {
      const id = await sale({ perfumeId: sauvage.id, customer: { kind: "linked", customerId: customer.id } });
      await server.prisma.$executeRawUnsafe(
        `UPDATE "SaleDocument" SET "orderedAt" = now() - interval '45 days', "confirmedAt" = now() - interval '45 days', "deliveredAt" = now() - interval '45 days' WHERE id = $1`,
        id,
      );
    }
    // Un coût à compléter.
    const sansCout = await sale({ perfumeId: sauvage.id, unknownCost: true, amount: "20", pocketId: cash.id });

    const figures = await server.chiffres.tableauDeBord();

    // « n commandes en retard » → /admin/commandes?filtre=retard
    const enRetard = await server.chiffres.enRetard();
    expect(figures.enRetard).toBe(enRetard.count);
    const listeRetard = await server.documentsQueries.ordersList("a-livrer", "retard", "");
    const retardIds = listeRetard.sections.flatMap((section) => section.rows.map((row) => row.id));
    expect(retardIds.length).toBe(figures.enRetard);
    expect(new Set(retardIds)).toEqual(new Set([retard1, retard2]));
    expect(new Set(retardIds)).toEqual(new Set(enRetard.documentIds));

    // « n clients à relancer » → /admin/encaisser?anciennete=30 : le nombre de GROUPES de E13 (03 §5.8).
    const anciennes = await server.chiffres.creancesAnciennes();
    const groupes = new Set(anciennes.map((row) => row.customerKey));
    expect(figures.clientsARelancer).toBe(groupes.size);
    expect(figures.clientsARelancer).toBe(2);

    // « n documents au coût à compléter » → Compta « Tout » + filtre : exactement `coutACompleter("all")`.
    const coutACompleter = await server.chiffres.coutACompleter("all");
    expect(figures.coutACompleter).toBe(coutACompleter.count);
    const filtres = await server.documentsQueries.comptaDocuments("all", "", "cout-a-completer");
    expect(filtres.sections.flatMap((s) => s.rows.map((r) => r.id))).toEqual([sansCout]);
    expect(filtres.sections.flatMap((s) => s.rows).length).toBe(figures.coutACompleter);

    // Rupture et stock bas : deux ensembles DISJOINTS, comptés et ouverts séparément (06 §1.7).
    const stock = await server.catalogueQueries.stockAlerts();
    expect(figures.stock).toEqual(stock);
    expect(figures.stock.out.perfumeIds).toEqual([sauvage.id]);
    expect(figures.stock.low.count).toBe(2);
    expect(figures.stock.out.perfumeIds.some((id) => figures.stock.low.perfumeIds.includes(id))).toBe(false);
  });

  it("base sans rien à faire : aucun compteur, et le non attribué reste à zéro", async () => {
    const figures = await server.chiffres.tableauDeBord();
    expect(figures.enRetard).toBe(0);
    expect(figures.clientsARelancer).toBe(0);
    expect(figures.coutACompleter).toBe(0);
    expect(figures.stock).toMatchObject({ out: { count: 0 }, low: { count: 0 } });
    expect(figures.tresorerie.unassigned).toBe("0.00");
    expect(figures.commandes).toEqual({ enAttente: 0, confirmees: 0 });
  });
});

describe("E01 — les comptes de l'Accueil (zone 4, zone 7, vide de départ)", () => {
  it("Encaissé du jour du composite = `encaisse(\"day\")` ; ventes, commandes prises et livraisons du jour", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const perfume = await seedPerfume(server.prisma, { name: "Sauvage", brand: "Dior" });

    await sale({ perfumeId: perfume.id, amount: "120", pocketId: cash.id });
    await sale({ perfumeId: perfume.id, amount: "60", pocketId: cash.id });
    await sale({ perfumeId: perfume.id, origin: "ORDER", amount: "40", pocketId: cash.id, expectedDeliveryAt: periodBounds("day").from.toISOString() });
    await sale({ perfumeId: perfume.id, origin: "ORDER", confirm: false, expectedDeliveryAt: periodBounds("day", new Date(), 1).from.toISOString() });

    const figures = await server.chiffres.tableauDeBord();
    expect(figures.encaisseJour).toBe(await server.chiffres.encaisse("day"));
    expect(figures.encaisseJour).toBe("220.00");

    const { aujourdhui, premiereUtilisation, batches } = await server.stats.accueilComptes();
    expect(aujourdhui.jour).toBe(parisDayKey());
    expect(aujourdhui).toMatchObject({ ventes: 2, commandesPrises: 2, aLivrerAujourdhui: 1, aLivrerDemain: 1 });
    expect(premiereUtilisation).toEqual({ pockets: 1, perfumes: 1, documents: 4 });
    expect(batches).toBe(0);
  });

  it("« À livrer aujourd'hui » et « À livrer demain » = les lignes des filtres de la liste Commandes", async () => {
    const perfume = await seedPerfume(server.prisma, { name: "Sauvage", brand: "Dior" });
    const today = periodBounds("day");
    await sale({ perfumeId: perfume.id, origin: "ORDER", expectedDeliveryAt: new Date(today.from.getTime() + 3600_000).toISOString() });
    await sale({ perfumeId: perfume.id, origin: "ORDER", expectedDeliveryAt: new Date(today.to.getTime() - 1000).toISOString() });
    await sale({ perfumeId: perfume.id, origin: "ORDER", expectedDeliveryAt: new Date(today.to.getTime() + 3600_000).toISOString() });
    // Un document annulé ne se livre plus : il ne compte dans aucun des deux.
    const annule = await sale({ perfumeId: perfume.id, origin: "ORDER", expectedDeliveryAt: new Date(today.from.getTime() + 7200_000).toISOString() });
    expectOk(await server.documents.cancelDocumentAction({ documentId: annule, confirm: true }));

    const { aujourdhui } = await server.stats.accueilComptes();
    const lignes = async (filtre: "aujourdhui" | "demain") =>
      (await server.documentsQueries.ordersList("a-livrer", filtre, "")).sections.flatMap((s) => s.rows).length;
    expect(aujourdhui.aLivrerAujourdhui).toBe(await lignes("aujourdhui"));
    expect(aujourdhui.aLivrerDemain).toBe(await lignes("demain"));
    expect(aujourdhui.aLivrerAujourdhui).toBe(2);
    expect(aujourdhui.aLivrerDemain).toBe(1);
  });

  it("lots ouverts : 3 au plus, les plus récents, Marge nette prise sur `chiffresParLot()`", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const perfume = await seedPerfume(server.prisma, { name: "Sauvage", brand: "Dior" });
    const noms = ["Lot 1", "Lot 2", "Lot 3", "Lot 4"];
    const lots: string[] = [];
    for (const name of noms) {
      const lot = await seedBatch(server.prisma, { name });
      lots.push(lot.id);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const clos = await seedBatch(server.prisma, { name: "Lot clos" });
    await server.prisma.batch.update({ where: { id: clos.id }, data: { status: "CLOSED" } });
    await sale({ perfumeId: perfume.id, amount: "120", pocketId: cash.id, batchId: lots[3] as string });
    await sale({ perfumeId: perfume.id, amount: "60", pocketId: cash.id, batchId: lots[2] as string, unknownCost: true });

    const ouverts = await server.stats.lotsOuverts(OPEN_BATCHES_HOME);
    expect(ouverts.map((lot) => lot.name)).toEqual(["Lot 4", "Lot 3", "Lot 2"]);
    expect(ouverts.every((lot) => lot.id !== clos.id)).toBe(true);

    const canonical = await server.chiffres.chiffresParLot("all");
    for (const lot of ouverts) {
      expect(lot.margeNette).toBe(canonical[lot.id]?.margeNette.value ?? "0.00");
      expect(lot.hasUnknownCost).toBe(canonical[lot.id]?.margeNette.hasUnknownCost ?? false);
    }
    expect(ouverts[0]).toMatchObject({ documentCount: 1, hasUnknownCost: false });
    expect(ouverts[1]).toMatchObject({ documentCount: 1, hasUnknownCost: true });
    expect(ouverts[2]).toMatchObject({ documentCount: 0, margeNette: "0.00" });
    expect((await server.stats.accueilComptes()).batches).toBe(5);
  });

  it("base vide : aucun document, aucun parfum — l'Accueil est en vide de départ", async () => {
    const { premiereUtilisation, aujourdhui, batches } = await server.stats.accueilComptes();
    expect(premiereUtilisation).toEqual({ pockets: 0, perfumes: 0, documents: 0 });
    expect(aujourdhui).toMatchObject({ ventes: 0, commandesPrises: 0, aLivrerAujourdhui: 0, aLivrerDemain: 0 });
    expect(batches).toBe(0);
    expect(await server.stats.lotsOuverts(OPEN_BATCHES_HOME)).toEqual([]);
    expect(await server.stats.classementParfums("month", TOP_PERFUMES_HOME)).toEqual({ totalUnits: 0, totalEntries: 0, entries: [] });
  });
});

describe("E07 — classement des parfums, en unités (06 E07)", () => {
  it("Σ quantités des lignes non offertes des documents engagés de la période, groupées par parfum", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const sauvage = await seedPerfume(server.prisma, { name: "Sauvage", brand: "Dior" });
    const libre = await seedPerfume(server.prisma, { name: "Libre", brand: "Yves Saint Laurent" });
    const asad = await seedPerfume(server.prisma, { name: "Asad", brand: "Lattafa" });

    await sale({ perfumeId: sauvage.id, quantity: 5, amount: "120", pocketId: cash.id });
    await sale({ perfumeId: sauvage.id, quantity: 4, amount: "120", pocketId: cash.id });
    await sale({ perfumeId: libre.id, quantity: 3, amount: "80", pocketId: cash.id });
    await sale({ perfumeId: asad.id, quantity: 2, amount: "60", pocketId: cash.id });
    // Offert : ne se vend pas, donc n'est pas classé.
    await sale({ perfumeId: asad.id, quantity: 7, gift: true });
    // En attente : pas engagé, donc hors classement.
    await sale({ perfumeId: libre.id, quantity: 9, origin: "ORDER", confirm: false });
    // Annulé : hors classement (son engagement est effacé).
    const annule = await sale({ perfumeId: libre.id, quantity: 6 });
    expectOk(await server.documents.cancelDocumentAction({ documentId: annule, confirm: true }));

    const data = await server.stats.classementParfums("month", 20);
    expect(data.entries.map((entry) => [entry.name, entry.units])).toEqual([
      ["Sauvage", 9],
      ["Libre", 3],
      ["Asad", 2],
    ]);
    expect(data.entries.map((entry) => entry.rank)).toEqual([1, 2, 3]);
    expect(data.totalUnits).toBe(14);
    expect(data.totalEntries).toBe(3);
    expect(data.entries[0]).toMatchObject({ key: `parfum:${sauvage.id}`, perfumeId: sauvage.id, brandName: "Dior", isOffCatalog: false });
  });

  it("nom VIVANT du parfum, à défaut le snapshot ; un parfum masqué reste classé (01 §4.6)", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const perfume = await seedPerfume(server.prisma, { name: "Sauvage", brand: "Dior" });
    await sale({ perfumeId: perfume.id, quantity: 2, amount: "120", pocketId: cash.id });

    await server.prisma.perfume.update({ where: { id: perfume.id }, data: { name: "Sauvage Elixir", status: "DRAFT" } });
    const data = await server.stats.classementParfums("month", 20);
    expect(data.entries[0]?.name).toBe("Sauvage Elixir");
    expect(data.entries[0]?.units).toBe(2);

    // Parfum supprimé : le snapshot de la ligne prend le relais, et la ligne n'est PAS « hors catalogue ».
    await server.prisma.perfume.delete({ where: { id: perfume.id } });
    const apres = await server.stats.classementParfums("month", 20);
    expect(apres.entries[0]).toMatchObject({ name: "Sauvage", perfumeId: null, isOffCatalog: false, units: 2 });
    expect(apres.entries[0]?.key).toBe("nom:sauvage");
  });

  it("« Afficher plus » : la limite coupe les lignes, jamais le total ni le compte de lignes", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    for (let i = 0; i < 5; i += 1) {
      const perfume = await seedPerfume(server.prisma, { name: `Parfum ${i}`, brand: "Dior" });
      await sale({ perfumeId: perfume.id, quantity: i + 1, amount: "20", pocketId: cash.id });
    }
    const page = await server.stats.classementParfums("month", 2);
    expect(page.entries).toHaveLength(2);
    expect(page.entries.map((entry) => entry.units)).toEqual([5, 4]);
    expect(page.totalEntries).toBe(5);
    expect(page.totalUnits).toBe(15);
    const tout = await server.stats.classementParfums("month", 20);
    expect(tout.entries).toHaveLength(5);
    expect(tout.totalUnits).toBe(page.totalUnits);
  });

  it("une période sans vente rend un classement vide, sans erreur", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const perfume = await seedPerfume(server.prisma, { name: "Sauvage", brand: "Dior" });
    await sale({ perfumeId: perfume.id, amount: "120", pocketId: cash.id });
    const passe = await server.stats.classementParfums("month-1", 20);
    expect(passe).toEqual({ totalUnits: 0, totalEntries: 0, entries: [] });
  });
});

describe("E02 — récap du jour (06 E02)", () => {
  it("Encaissé du jour et ventilation par poche = les chiffres canoniques ; Σ des poches = le total", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const bank = await seedPocket(server.prisma, { name: "Banque", kind: "BANK" });
    const perfume = await seedPerfume(server.prisma, { name: "Sauvage", brand: "Dior" });
    // 180 € en espèces (sur une vente de 240 €) et 60 € en banque : l'Encaissé du jour vaut 240 €.
    await sale({ perfumeId: perfume.id, quantity: 2, amount: "180", pocketId: cash.id });
    await sale({ perfumeId: perfume.id, amount: "60", pocketId: bank.id });

    const jour = parisDayKey();
    const recap = await server.stats.recapDuJour(jour);
    expect(recap.encaisse).toBe(await server.chiffres.encaisse(`day@${jour}`));
    const parPoche = await server.chiffres.encaisseParPoche(`day@${jour}`);
    expect(recap.parPoche.map((p) => [p.name, p.encaisse])).toEqual(parPoche.map((p) => [p.name, p.encaisse]));
    expect(sumOf(recap.parPoche.map((p) => p.encaisse))).toBe(recap.encaisse);
    expect(recap.encaisse).toBe("240.00");
    expect(recap.isToday).toBe(true);
    expect(recap.nextDay).toBeNull();
    expect(recap.isEmpty).toBe(false);
  });

  it("documents du jour : ventes, commandes prises, commandes livrées — UNE rangée par document", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const perfume = await seedPerfume(server.prisma, { name: "Sauvage", brand: "Dior" });
    const nora = await seedCustomer(server.prisma, { fullName: "Nora Belkacem" });

    const vente = await sale({ perfumeId: perfume.id, quantity: 2, amount: "120", pocketId: cash.id, customer: { kind: "linked", customerId: nora.id } });
    const prise = await sale({ perfumeId: perfume.id, origin: "ORDER", confirm: false, expectedDeliveryAt: new Date(Date.now() + 3 * DAY).toISOString() });
    // Prise ET livrée aujourd'hui : elle se raconte par son fait le plus avancé.
    const livree = await sale({ perfumeId: perfume.id, origin: "ORDER", amount: "80" as string, pocketId: cash.id });
    expectOk(await server.documents.changeDocumentStatusAction({ documentId: livree, to: "DELIVERED", confirm: true }));
    // Annulée : hors récap (elle a sa propre vue, 06 E10).
    const annule = await sale({ perfumeId: perfume.id });
    expectOk(await server.documents.cancelDocumentAction({ documentId: annule, confirm: true }));

    const recap = await server.stats.recapDuJour(parisDayKey());
    const byId = new Map(recap.documents.map((doc) => [doc.documentId, doc]));
    expect(recap.documents).toHaveLength(3);
    // Deux flacons à 120 € : total 240 €, dont 120 € reçus — le reste est à encaisser.
    expect(byId.get(vente)).toMatchObject({ kind: "vente", customerName: "Nora Belkacem", itemCount: 2, total: "240.00", due: "120.00" });
    expect(byId.get(prise)?.kind).toBe("commande-prise");
    expect(byId.get(livree)?.kind).toBe("commande-livree");
    expect(byId.has(annule)).toBe(false);

    // Les montants sont ceux de la vue `DocumentBalance` : la définition, pas une addition d'écran.
    const canonical = await server.chiffres.documentBalance(...recap.documents.map((doc) => doc.documentId));
    for (const doc of recap.documents) {
      expect(doc.total).toBe(canonical[doc.documentId]?.total);
      expect(doc.due).toBe(canonical[doc.documentId]?.due);
    }
  });

  it("« À livrer le lendemain » : les commandes à livrer du jour suivant, et rien d'autre", async () => {
    const perfume = await seedPerfume(server.prisma, { name: "Sauvage", brand: "Dior" });
    const demain = periodBounds("day", new Date(), 1);
    const attendu = await sale({ perfumeId: perfume.id, origin: "ORDER", confirm: false, expectedDeliveryAt: new Date(demain.from.getTime() + 3600_000).toISOString() });
    await sale({ perfumeId: perfume.id, origin: "ORDER", expectedDeliveryAt: new Date(demain.to.getTime() + 3600_000).toISOString() });
    const livre = await sale({ perfumeId: perfume.id, origin: "ORDER", expectedDeliveryAt: new Date(demain.from.getTime() + 7200_000).toISOString() });
    expectOk(await server.documents.changeDocumentStatusAction({ documentId: livre, to: "DELIVERED", confirm: true }));

    const recap = await server.stats.recapDuJour(parisDayKey());
    expect(recap.demain.map((order) => order.documentId)).toEqual([attendu]);
    expect(recap.demain[0]).toMatchObject({ status: "PENDING", hasTime: false });
  });

  it("un jour sans rien est vide, et son navigateur avance jusqu'à aujourd'hui", async () => {
    const hier = parisDayKey(periodBounds("day", new Date(), -1).from);
    const recap = await server.stats.recapDuJour(hier);
    expect(recap).toMatchObject({ jour: hier, isToday: false, encaisse: "0.00", isEmpty: true });
    expect(recap.documents).toEqual([]);
    expect(recap.parPoche).toEqual([]);
    expect(recap.nextDay).toBe(parisDayKey());
    expect(recap.previousDay).toBe(parisDayKey(periodBounds("day", new Date(), -2).from));
  });

  it("un paiement daté d'hier appartient au récap d'hier, pas à celui d'aujourd'hui", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const perfume = await seedPerfume(server.prisma, { name: "Sauvage", brand: "Dior" });
    const doc = await sale({ perfumeId: perfume.id });
    const hier = periodBounds("day", new Date(), -1);
    expectOk(
      await server.payments.recordPaymentAction({
        id: newId(),
        documentId: doc,
        amount: "45",
        pocketId: cash.id,
        occurredAt: new Date(hier.from.getTime() + 12 * 3600_000).toISOString(),
      }),
    );
    const hierKey = parisDayKey(hier.from);
    expect((await server.stats.recapDuJour(hierKey)).encaisse).toBe(await server.chiffres.encaisse(`day@${hierKey}`));
    expect((await server.stats.recapDuJour(hierKey)).encaisse).toBe("45.00");
    expect((await server.stats.recapDuJour(parisDayKey())).encaisse).toBe("0.00");
  });
});
