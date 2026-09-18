import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  catalogueLine,
  expectInvariants,
  loadMoneyServer,
  seedPocket,
  seedSystemPocket,
  type MoneyServer,
} from "./transactions/support/argent";
import { expectError, expectOk, freshStart, newId, seedBatch, seedCustomer, seedPerfume } from "./transactions/support/harness";

/**
 * Lectures des écrans des lots (07 J13) : E05 (liste + zone « À rattacher »), E06 (fiche : tuiles,
 * documents annulés compris, dépenses vivantes, refus de suppression), S13 (candidats tous statuts),
 * et les libellés de dépense de S12 (A10).
 *
 * Ce que ces tests protègent, ce sont les bugs de 01 §4.4 : l'Encaissé d'un lot qui chutait à la
 * finalisation, des montants différents selon l'écran, un document annulé rattaché mais invisible, et
 * un lot insupprimable sans que la raison soit lisible.
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
  queries: typeof import("@/server/batches/queries");
  chiffres: typeof import("@/server/chiffres");
};

let server: Server;

beforeAll(async () => {
  const money = await loadMoneyServer();
  server = { ...money, queries: await import("@/server/batches/queries"), chiffres: await import("@/server/chiffres") };
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

/** Une vente directe encaissée, rattachée ou non, avec son coût d'achat connu. */
async function sale(options: { batchId?: string; price: string; received?: string; customer?: string; perfumeId?: number }) {
  const id = newId();
  const perfumeId = options.perfumeId ?? (await seedPerfume(server.prisma, { name: `Parfum ${id.slice(0, 8)}` })).id;
  expectOk(
    await server.documents.createDocumentAction({
      id,
      origin: "DIRECT_SALE",
      customer: { kind: "passing", name: options.customer ?? "Fares" },
      lines: [catalogueLine(perfumeId, { unitPriceEur: options.price, unitCostDzd: "27700", exchangeRate: "277" })],
      ...(options.batchId ? { batchId: options.batchId } : {}),
      payments: options.received ? [{ id: newId(), amount: options.received, pocketId: null }] : [],
      confirm: true,
    }),
  );
  return id;
}

/** Une commande EN ATTENTE : elle n'est pas engagée — ni « À encaisser », ni « Coûts d'achat ». */
async function pendingOrder(options: { batchId?: string; price: string; customer?: string }) {
  const id = newId();
  const perfume = await seedPerfume(server.prisma, { name: `Parfum ${id.slice(0, 8)}` });
  expectOk(
    await server.documents.createDocumentAction({
      id,
      origin: "ORDER",
      customer: { kind: "passing", name: options.customer ?? "Lina" },
      lines: [catalogueLine(perfume.id, { unitPriceEur: options.price, unitCostDzd: "27700", exchangeRate: "277" })],
      ...(options.batchId ? { batchId: options.batchId } : {}),
    }),
  );
  return id;
}

const sheetOf = async (id: string) => {
  const sheet = await server.queries.batchSheet(id);
  if (!sheet) throw new Error(`fiche du lot ${id} introuvable`);
  return sheet;
};

/**
 * Une dépense ajoutée par son action (T9), sur une poche APPROVISIONNÉE : « Non attribué » ne passe
 * jamais sous zéro (03 §5.5), une dépense y serait refusée — ce n'est pas le sujet de ces tests.
 */
async function expense(options: { batchId: string; label: string; amount?: string; id?: string; occurredAt?: Date }) {
  const pocket =
    (await server.prisma.pocket.findFirst({ where: { isSystem: false, archived: false } })) ??
    (await seedPocket(server.prisma, { name: "Banque", kind: "BANK", openingBalance: "10000" }));
  const id = options.id ?? newId();
  expectOk(
    await server.batches.addBatchExpenseAction({
      id,
      batchId: options.batchId,
      label: options.label,
      amount: options.amount ?? "45",
      pocketId: pocket.id,
      occurredAt: options.occurredAt ?? new Date(),
    }),
  );
  return id;
}

// ── E05 ────────────────────────────────────────────────────────────────────────

describe("E05 — liste des lots", () => {
  it("ouverts puis clos, le plus récent en tête, avec le nombre de documents rattachés", async () => {
    await seedSystemPocket(server.prisma);
    const vieux = await seedBatch(server.prisma, { name: "Commande de janvier", status: "CLOSED" });
    const recent = await seedBatch(server.prisma, { name: "Commande de mars" });
    await sale({ batchId: recent.id, price: "120", received: "120" });
    await sale({ batchId: recent.id, price: "80" });

    const list = await server.queries.batchesList();
    expect(list.open.map((batch) => batch.name)).toEqual(["Commande de mars"]);
    expect(list.closed.map((batch) => batch.name)).toEqual(["Commande de janvier"]);
    expect(list.open[0]?.documentCount).toBe(2);
    expect(list.closed[0]?.documentCount).toBe(0);
    expect(list.total).toBe(2);
    void vieux;
  });

  it("la Marge nette et l'À encaisser d'une ligne sont EXACTEMENT ceux des chiffres du même lot", async () => {
    await seedSystemPocket(server.prisma);
    const lot = await seedBatch(server.prisma, { name: "Commande de mars" });
    await sale({ batchId: lot.id, price: "120", received: "120" });
    await sale({ batchId: lot.id, price: "200", received: "50" });
    await expense({ batchId: lot.id, label: "Transport" });

    const [list, marge, dues] = await Promise.all([
      server.queries.batchesList(),
      server.chiffres.margeNette("all", lot.id),
      server.chiffres.aEncaisser(lot.id),
    ]);
    const row = list.open.find((batch) => batch.id === lot.id);
    expect(row?.figures.margeNette.value).toBe(marge.value);
    expect(row?.figures.aEncaisser).toBe(dues);
    expect(row?.figures.encaisse).toBe(marge.encaisse);

    // Et la fiche dit le même chiffre que la ligne : un seul montant, deux écrans (01 §4.4).
    const sheet = await sheetOf(lot.id);
    expect(sheet.figures.margeNette.value).toBe(marge.value);
    expect(sheet.figures.aEncaisser).toBe(dues);
  });

  it("un lot sans document ni dépense a des chiffres nuls, pas des chiffres absents", async () => {
    const lot = await seedBatch(server.prisma, { name: "Lot neuf" });
    const list = await server.queries.batchesList();
    const row = list.open.find((batch) => batch.id === lot.id);
    expect(row?.figures).toMatchObject({ encaisse: "0.00", aEncaisser: "0.00" });
    expect(row?.figures.margeNette).toMatchObject({ value: "0.00", percent: null, costs: "0.00", expenses: "0.00" });
  });
});

describe("E05 zone 0 — « À rattacher »", () => {
  it("les documents sans lot, livrés compris ; ni les annulés, ni ceux d'un lot", async () => {
    await seedSystemPocket(server.prisma);
    const lot = await seedBatch(server.prisma, { name: "Commande de mars" });
    const venteSansLot = await sale({ price: "120", received: "120", customer: "Sans lot" });
    const commandeEnAttente = await pendingOrder({ price: "95", customer: "En attente" });
    const dansLeLot = await sale({ batchId: lot.id, price: "80", customer: "Rangée" });
    const livree = await sale({ price: "60", customer: "Livrée" });
    expectOk(await server.documents.changeDocumentStatusAction({ documentId: livree, to: "DELIVERED" }));
    const annulee = await pendingOrder({ price: "70", customer: "Annulée" });
    expectOk(await server.documents.cancelDocumentAction({ documentId: annulee }));

    const { unbatched } = await server.queries.batchesList();
    const ids = unbatched.rows.map((row) => row.id);
    expect(ids).toContain(venteSansLot);
    expect(ids).toContain(commandeEnAttente);
    expect(ids).toContain(livree);
    expect(ids).not.toContain(dansLeLot);
    expect(ids).not.toContain(annulee);
    expect(unbatched.total).toBe(3);
    expect(unbatched.hasMore).toBe(false);
  });

  it("la recherche étendue porte sur le client et sur le parfum, et le compte reste celui de la recherche", async () => {
    await seedSystemPocket(server.prisma);
    const sauvage = await seedPerfume(server.prisma, { name: "Sauvage" });
    await sale({ price: "120", customer: "Fares Benali", perfumeId: sauvage.id });
    await sale({ price: "90", customer: "Lina Haddad" });

    const parClient = await server.queries.batchesList("benali");
    expect(parClient.unbatched.rows.map((row) => row.customerName)).toEqual(["Fares Benali"]);
    expect(parClient.unbatched.total).toBe(1);

    // Sans accents, dans les deux sens, et sur le nom du parfum de la ligne.
    const parParfum = await server.queries.batchesList("sauvage");
    expect(parParfum.unbatched.rows.map((row) => row.customerName)).toEqual(["Fares Benali"]);
    expect((await server.queries.batchesList("introuvable")).unbatched.total).toBe(0);
  });

  it("la légende porte les premiers parfums et le nombre de lignes, pour le « +N »", async () => {
    await seedSystemPocket(server.prisma);
    const a = await seedPerfume(server.prisma, { name: "Sauvage" });
    const b = await seedPerfume(server.prisma, { name: "Libre" });
    const c = await seedPerfume(server.prisma, { name: "Khamrah" });
    const id = newId();
    expectOk(
      await server.documents.createDocumentAction({
        id,
        origin: "ORDER",
        customer: { kind: "passing", name: "Trois lignes" },
        lines: [catalogueLine(a.id), catalogueLine(b.id), catalogueLine(c.id)],
      }),
    );
    const { unbatched } = await server.queries.batchesList();
    const row = unbatched.rows.find((candidate) => candidate.id === id);
    expect(row?.items).toEqual(["Sauvage", "Libre"]);
    expect(row?.lineCount).toBe(3);
  });

  it("« Afficher plus » : une page dit ce qu'elle cache, la suivante la complète", async () => {
    await seedSystemPocket(server.prisma);
    const perfume = await seedPerfume(server.prisma, { name: "Sauvage" });
    for (let index = 0; index < 3; index += 1) await sale({ price: "50", customer: `Client ${index}`, perfumeId: perfume.id });

    // La taille de page réelle est 100 : on éprouve la mécanique sur le compte, pas sur 100 lignes.
    const list = await server.queries.batchesList(null, "1");
    expect(list.unbatched.total).toBe(3);
    expect(list.unbatched.rows).toHaveLength(3);
    expect(list.unbatched.hasMore).toBe(false);
    expect((await server.queries.batchesList(null, "2")).pages).toBe(2);
  });
});

// ── E06 ────────────────────────────────────────────────────────────────────────

describe("E06 — fiche du lot", () => {
  it("liste TOUT ce qui est rattaché : en attente dans les documents, annulé à part et détachable", async () => {
    await seedSystemPocket(server.prisma);
    const lot = await seedBatch(server.prisma, { name: "Commande de mars" });
    const vente = await sale({ batchId: lot.id, price: "120", received: "120" });
    const attente = await pendingOrder({ batchId: lot.id, price: "95" });
    const annulee = await pendingOrder({ batchId: lot.id, price: "70" });
    expectOk(await server.documents.cancelDocumentAction({ documentId: annulee }));

    const sheet = await sheetOf(lot.id);
    expect(sheet.documents.map((row) => row.id).sort()).toEqual([vente, attente].sort());
    expect(sheet.cancelled.map((row) => row.id)).toEqual([annulee]);
    expect(sheet.documentCount).toBe(3);
    expect(sheet.documents.find((row) => row.id === attente)?.status).toBe("PENDING");

    // Détacher l'annulée : le lot n'en a plus que deux (c'est le seul chemin qui le rendra supprimable).
    expectOk(await server.documents.assignDocumentsToBatchAction({ changes: [{ documentId: annulee, from: lot.id, to: null }] }));
    expect((await sheetOf(lot.id)).documentCount).toBe(2);
  });

  it("une commande en attente rattachée n'entre ni dans « À encaisser » ni dans « Coûts d'achat »", async () => {
    await seedSystemPocket(server.prisma);
    const lot = await seedBatch(server.prisma, { name: "Commande de mars" });
    const attente = await pendingOrder({ batchId: lot.id, price: "95" });

    const before = await sheetOf(lot.id);
    expect(before.figures.aEncaisser).toBe("0.00");
    expect(before.figures.margeNette.costs).toBe("0.00");
    expect(before.documents.map((row) => row.id)).toEqual([attente]);

    // Engagée, elle compte : c'est l'engagement qui fait entrer un document dans les chiffres (03 §5.3).
    expectOk(await server.documents.changeDocumentStatusAction({ documentId: attente, to: "CONFIRMED", confirm: true }));
    const after = await sheetOf(lot.id);
    expect(after.figures.aEncaisser).toBe("95.00");
    expect(after.figures.margeNette.costs).toBe("100.00");
  });

  it("les dépenses vivantes seulement ; une dépense supprimée sort de la liste et rend la Marge nette", async () => {
    await seedPocket(server.prisma, { name: "Banque", kind: "BANK", openingBalance: "1000" });
    const lot = await seedBatch(server.prisma, { name: "Commande de mars" });
    await sale({ batchId: lot.id, price: "200", received: "200" });
    const expenseId = await expense({ batchId: lot.id, label: "Transport", occurredAt: new Date(Date.now() - DAY) });

    const withExpense = await sheetOf(lot.id);
    expect(withExpense.expenses).toHaveLength(1);
    expect(withExpense.expenses[0]).toMatchObject({ label: "Transport", amount: "45.00", pocketName: "Banque" });
    expect(withExpense.figures.margeNette.expenses).toBe("45.00");
    const margeAvecDepense = withExpense.figures.margeNette.value;

    expectOk(await server.batches.deleteBatchExpenseAction({ id: expenseId }));
    const without = await sheetOf(lot.id);
    expect(without.expenses).toHaveLength(0);
    expect(without.figures.margeNette.expenses).toBe("0.00");
    expect(Number(without.figures.margeNette.value)).toBe(Number(margeAvecDepense) + 45);
  });

  it("le refus de suppression porte le décompte, et survit à la suppression de la dépense", async () => {
    await seedSystemPocket(server.prisma);
    const lot = await seedBatch(server.prisma, { name: "Commande de mars" });
    expect((await sheetOf(lot.id)).deletionRefusal).toBeNull();

    const vente = await sale({ batchId: lot.id, price: "120" });
    const expenseId = await expense({ batchId: lot.id, label: "Douane", amount: "12" });
    expect((await sheetOf(lot.id)).deletionRefusal).toBe("Impossible : 1 document et 1 dépense rattachés. Clôture-le plutôt.");

    // Le document part : il reste la dépense.
    expectOk(await server.documents.assignDocumentsToBatchAction({ changes: [{ documentId: vente, from: lot.id, to: null }] }));
    expect((await sheetOf(lot.id)).deletionRefusal).toBe("Impossible : 1 dépense rattachée. Clôture-le plutôt.");

    // La dépense est supprimée : sa pièce contre-passée reste au journal, le lot reste insupprimable (02 §4.4).
    expectOk(await server.batches.deleteBatchExpenseAction({ id: expenseId }));
    expect((await sheetOf(lot.id)).deletionRefusal).toBe("Impossible : ce lot a un historique de dépenses. Clôture-le plutôt.");
    expectError(await server.batches.deleteBatchAction({ id: lot.id }), "CONFLICT");

    // Un lot jamais touché se supprime, lui.
    const vide = await seedBatch(server.prisma, { name: "Créé par erreur" });
    expect((await sheetOf(vide.id)).deletionRefusal).toBeNull();
    expect(expectOk(await server.batches.deleteBatchAction({ id: vide.id })).deleted).toBe(true);
    expect(await server.queries.batchSheet(vide.id)).toBeNull();
  });

  it("un identifiant illisible n'est pas une panne : la fiche rend null", async () => {
    expect(await server.queries.batchSheet("pas-un-identifiant")).toBeNull();
  });
});

// ── S13 et S12 ─────────────────────────────────────────────────────────────────

describe("S13 — candidats au rattachement", () => {
  it("les documents sans lot ET ceux du lot, tous statuts non annulés, les rattachés cochés", async () => {
    await seedSystemPocket(server.prisma);
    const lot = await seedBatch(server.prisma, { name: "Commande de mars" });
    const autre = await seedBatch(server.prisma, { name: "Commande d'avril" });
    const dedans = await sale({ batchId: lot.id, price: "120" });
    const attenteDedans = await pendingOrder({ batchId: lot.id, price: "95" });
    const dehors = await sale({ price: "80" });
    const ailleurs = await sale({ batchId: autre.id, price: "60" });
    const annulee = await pendingOrder({ price: "70" });
    expectOk(await server.documents.cancelDocumentAction({ documentId: annulee }));

    const sheet = await server.queries.assignSheet(lot.id);
    const byId = new Map(sheet?.candidates.map((candidate) => [candidate.id, candidate]) ?? []);
    expect(byId.get(dedans)?.attached).toBe(true);
    expect(byId.get(attenteDedans)?.attached).toBe(true);
    expect(byId.get(dehors)?.attached).toBe(false);
    expect(byId.has(ailleurs)).toBe(false);
    expect(byId.has(annulee)).toBe(false);
    expect(sheet?.total).toBe(3);
    expect(sheet?.hasMore).toBe(false);
    expect(sheet?.batchName).toBe("Commande de mars");
  });

  it("un lot clos n'a pas de sheet : l'interface ne la propose pas, et le serveur refuse le rattachement", async () => {
    await seedSystemPocket(server.prisma);
    const lot = await seedBatch(server.prisma, { name: "Commande de mars", status: "CLOSED" });
    const dehors = await sale({ price: "80" });
    expect(await server.queries.assignSheet(lot.id)).toBeNull();
    expectError(
      await server.documents.assignDocumentsToBatchAction({ changes: [{ documentId: dehors, from: null, to: lot.id }] }),
      "CONFLICT",
    );
  });

  it("la recherche des candidats suit les mêmes règles que celle de E10", async () => {
    await seedSystemPocket(server.prisma);
    const lot = await seedBatch(server.prisma, { name: "Commande de mars" });
    const cliente = await seedCustomer(server.prisma, { fullName: "Élise Martin" });
    const id = newId();
    const perfume = await seedPerfume(server.prisma, { name: "Shalimar" });
    expectOk(
      await server.documents.createDocumentAction({
        id,
        origin: "ORDER",
        customer: { kind: "linked", customerId: cliente.id },
        lines: [catalogueLine(perfume.id)],
      }),
    );
    await sale({ price: "50", customer: "Autre" });

    // Sans accents, et sur le nom de la fiche vivante.
    expect((await server.queries.assignSheet(lot.id, "elise"))?.candidates.map((c) => c.id)).toEqual([id]);
    expect((await server.queries.assignSheet(lot.id, "shalimar"))?.candidates.map((c) => c.id)).toEqual([id]);
  });
});

describe("S12 — libellés de dépense proposés (A10)", () => {
  it("ceux du lot d'abord, puis les plus fréquents ; une dépense supprimée garde son libellé en mémoire", async () => {
    await seedSystemPocket(server.prisma);
    const lot = await seedBatch(server.prisma, { name: "Commande de mars" });
    const autre = await seedBatch(server.prisma, { name: "Commande d'avril" });
    await expense({ batchId: autre.id, label: "Douane", amount: "10" });
    await expense({ batchId: autre.id, label: "Douane", amount: "10" });
    await expense({ batchId: autre.id, label: "Billet", amount: "10" });
    const removable = await expense({ batchId: lot.id, label: "Transport" });

    expect((await sheetOf(lot.id)).expenseLabels).toEqual(["Transport", "Douane", "Billet"]);
    expect(await server.queries.expenseLabels(autre.id)).toEqual(["Douane", "Billet", "Transport"]);

    // Supprimée, la dépense sort des listes et des chiffres — pas du souvenir de frappe.
    expectOk(await server.batches.deleteBatchExpenseAction({ id: removable }));
    expect((await sheetOf(lot.id)).expenseLabels).toContain("Transport");
  });
});
