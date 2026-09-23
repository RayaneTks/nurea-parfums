import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { catalogueLine, expectInvariants, loadMoneyServer, seedPocket, type MoneyServer } from "./transactions/support/argent";
import { expectError, expectOk, freshStart, newId, seedCustomer, seedPerfume, stockOf } from "./transactions/support/harness";

/**
 * Rattacher une ligne « hors catalogue » au parfum entré au catalogue depuis.
 *
 * Le cas vient du terrain : on vend un flacon avant de l'avoir inscrit au catalogue — la ligne est
 * saisie à la main —, et le parfum y entre des semaines plus tard. Sans ce geste, la vente reste
 * orpheline : absente de « Top parfums », de « Achète souvent » et de l'historique du parfum.
 *
 * Ce que ce fichier éprouve, et qui est la promesse du geste :
 *
 *  1. le rattachement marche sur une commande DÉJÀ LIVRÉE — c'est le cas réel, pas une commande
 *     fraîche ;
 *  2. NI L'ARGENT NI LE STOCK ne bougent : la vente a déjà eu lieu, décompter maintenant fausserait
 *     l'inventaire du jour et recompter fausserait la compta ;
 *  3. le nom devient celui du catalogue, sans quoi la ligne resterait à part dans les regroupements
 *     par nom — ce qui viderait le geste de son sens ;
 *  4. une ligne déjà rattachée, ou qui désigne un parfum supprimé, est refusée avec une raison qui
 *     dit quoi faire.
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
  await server?.prisma.$disconnect();
});

beforeEach(async () => {
  cookieJar.current = await freshStart(server);
});

afterEach(async () => {
  await expectInvariants(server.prisma);
});

/** Une commande livrée dont l'unique ligne a été saisie à la main, hors catalogue. */
async function venteHorsCatalogue() {
  const pocket = await seedPocket(server.prisma, { name: "Espèces" });
  const customer = await seedCustomer(server.prisma, { fullName: "Chloé" });
  const documentId = newId();
  expectOk(
    await server.documents.createDocumentAction({
      id: documentId,
      origin: "ORDER",
      customer: { kind: "linked", customerId: customer.id },
      lines: [
        { item: { kind: "offCatalog", name: "asad", brandName: "lattafa" }, volumeMl: 80, quantity: 1, unitPriceEur: "120" },
      ],
      payments: [{ id: newId(), amount: "120", pocketId: pocket.id }],
      confirm: true,
    }),
  );
  expectOk(await server.documents.changeDocumentStatusAction({ documentId, to: "DELIVERED", confirm: true }));
  return { documentId, pocketId: pocket.id };
}

const ligneDe = async (documentId: string) => {
  const [ligne] = await server.prisma.saleLine.findMany({ where: { documentId } });
  // Un document sans ligne est un bug du montage du test : le dire ici vaut mieux que treize
  // « possibly undefined » chez l'appelant.
  if (!ligne) throw new Error(`Aucune ligne sur le document ${documentId}`);
  return ligne;
};

describe("rattacher une ligne hors catalogue au catalogue", () => {
  it("recolle une commande DÉJÀ LIVRÉE, sans toucher ni l'argent ni le stock", async () => {
    const { documentId, pocketId } = await venteHorsCatalogue();
    const parfum = await seedPerfume(server.prisma, { name: "Asad", brand: "Lattafa", stock: 7 });

    const avant = await ligneDe(documentId);
    const soldeAvant = await server.prisma.cashMovement.aggregate({ where: { pocketId }, _sum: { amount: true } });

    const resultat = expectOk(
      await server.documents.attachLineToCatalogueAction({ documentId, lineId: avant.id, perfumeId: parfum.id }),
    );
    expect(resultat.perfumeName).toBe("Asad");

    const apres = await ligneDe(documentId);
    // Le lien est fait, et la ligne cesse d'être « hors catalogue » (contrainte line_off_catalog_ck).
    expect(apres.perfumeId).toBe(parfum.id);
    expect(apres.isOffCatalog).toBe(false);
    // Le nom devient celui du catalogue : sans quoi les regroupements par nom resteraient séparés.
    expect(apres.perfumeName).toBe("Asad");
    expect(apres.brandName).toBe("Lattafa");

    // L'ARGENT : au mot près ce qu'il était.
    expect(apres.unitPriceEur.toString()).toBe(avant.unitPriceEur.toString());
    expect(apres.quantity).toBe(avant.quantity);
    expect(apres.deliveredQuantity).toBe(avant.deliveredQuantity);
    const soldeApres = await server.prisma.cashMovement.aggregate({ where: { pocketId }, _sum: { amount: true } });
    expect(soldeApres._sum.amount?.toString()).toBe(soldeAvant._sum.amount?.toString());

    // LE STOCK : intact. La vente a eu lieu il y a des semaines ; décompter maintenant serait faux.
    expect(await stockOf(server.prisma, parfum.id)).toBe(7);
  });

  it("refuse une ligne déjà rattachée, et le dit", async () => {
    const parfum = await seedPerfume(server.prisma, { name: "Sauvage", brand: "Dior" });
    const pocket = await seedPocket(server.prisma, { name: "Espèces" });
    const documentId = newId();
    expectOk(
      await server.documents.createDocumentAction({
        id: documentId,
        origin: "DIRECT_SALE",
        customer: { kind: "passing", name: "Fares" },
        lines: [catalogueLine(parfum.id, { volumeMl: 80, unitPriceEur: "100" })],
        payments: [{ id: newId(), amount: "100", pocketId: pocket.id }],
        confirm: true,
      }),
    );
    const ligne = await ligneDe(documentId);
    const erreur = expectError(
      await server.documents.attachLineToCatalogueAction({ documentId, lineId: ligne.id, perfumeId: parfum.id }),
      "CONFLICT",
    );
    expect(erreur.message).toContain("déjà rattachée");
  });

  it("refuse un parfum qui n'existe pas au catalogue", async () => {
    const { documentId } = await venteHorsCatalogue();
    const ligne = await ligneDe(documentId);
    expectError(
      await server.documents.attachLineToCatalogueAction({ documentId, lineId: ligne.id, perfumeId: 999_999 }),
      "NOT_FOUND",
    );
  });
});
