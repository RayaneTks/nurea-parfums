import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INJECTED,
  expectError,
  expectOk,
  freshStart,
  loadServer,
  newId,
  seedCustomer,
  seedPerfume,
  type Server,
} from "./transactions/support/harness";

/**
 * Fiches client (02 §4.10, 03 §4.4, 04 §3.4 et §9.3 ; 07 J5) : création avec normalisation française du
 * téléphone, conflit de numéro nommé, modification partielle, suppression refusée tant qu'une commande est
 * en cours (message réel), documents conservés sous le dernier nom.
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
  vi.restoreAllMocks();
  await server?.prisma.$disconnect();
});

beforeEach(async () => {
  cookieJar.current = await freshStart(server);
  cache.calls.length = 0;
});

/** Un document lié à la fiche, au statut voulu (T4 et T5 hors sujet ici : statut posé directement). */
async function linkedDocument(customerId: string, status: "PENDING" | "CONFIRMED" | "DELIVERED" | "CANCELLED") {
  const perfume = await seedPerfume(server.prisma, { name: `Parfum ${newId().slice(0, 8)}` });
  const id = newId();
  expectOk(
    await server.documents.createDocumentAction({
      id,
      origin: "ORDER",
      customer: { kind: "linked", customerId },
      lines: [{ item: { kind: "catalogue", perfumeId: perfume.id }, volumeMl: 50, quantity: 1, unitPriceEur: "120" }],
    }),
  );
  const now = new Date();
  await server.prisma.saleDocument.update({
    where: { id },
    data: {
      status,
      confirmedAt: status === "CONFIRMED" || status === "DELIVERED" ? now : null,
      deliveredAt: status === "DELIVERED" ? now : null,
      cancelledAt: status === "CANCELLED" ? now : null,
    },
  });
  return id;
}

describe("créer une fiche", () => {
  it("téléphone et WhatsApp saisis à la française, stockés en E.164", async () => {
    const data = expectOk(
      await server.customers.createCustomerAction({
        fullName: " Fares Benali ",
        phone: "06 12 34 56 78",
        whatsapp: "0033 7 11 22 33 44",
        snapchat: "@fares.b",
        address: "12 rue des Lilas, Lyon",
      }),
    );
    expect(data).toEqual({
      id: expect.any(String),
      fullName: "Fares Benali",
      phoneE164: "+33612345678",
      whatsappE164: "+33711223344",
      snapchat: "fares.b",
      address: "12 rue des Lilas, Lyon",
      notes: null,
    });
    expect(await server.prisma.customer.findUniqueOrThrow({ where: { id: data.id } })).toMatchObject({ phoneE164: "+33612345678" });
    expect(cache.calls).toEqual(["updateTag:gestion"]);
  });

  it("saisie illisible ⇒ VALIDATION sous le champ, rien d'écrit", async () => {
    const error = expectError(await server.customers.createCustomerAction({ fullName: "Lina", phone: "12 34" }), "VALIDATION");
    expect(error.fields).toEqual({ phone: "Numéro non reconnu : saisis-le comme 06 12 34 56 78 ou +33 6 12 34 56 78." });
    expect(await server.prisma.customer.count()).toBe(0);
  });

  it("identifiant fourni par le formulaire : un renvoi rend la même fiche, sans doublon", async () => {
    const id = newId();
    const first = expectOk(await server.customers.createCustomerAction({ id, fullName: "Lina" }));
    const again = expectOk(await server.customers.createCustomerAction({ id, fullName: "Lina" }));
    expect(again).toEqual(first);
    expect(await server.prisma.customer.count()).toBe(1);
  });

  it("numéro déjà celui d'une autre fiche ⇒ CONFLICT « Ce numéro est déjà celui de Lina. », rien d'écrit", async () => {
    await seedCustomer(server.prisma, { fullName: "Lina", phoneE164: "+33612345678" });
    const error = expectError(
      await server.customers.createCustomerAction({ fullName: "Autre", phone: "+33 6 12 34 56 78" }),
      "CONFLICT",
    );
    expect(error.message).toBe("Ce numéro est déjà celui de Lina.");
    expect(await server.prisma.customer.count()).toBe(1);
  });
});

describe("modifier une fiche", () => {
  it("absent = inchangé, vidé = effacé ; garder son propre numéro passe", async () => {
    const lina = await server.prisma.customer.create({
      data: { fullName: "Lina", phoneE164: "+33612345678", snapchat: "lina", notes: "VIP" },
    });
    const data = expectOk(
      await server.customers.updateCustomerAction({ id: lina.id, fullName: "Lina B.", phone: "06 12 34 56 78", snapchat: "" }),
    );
    expect(data).toMatchObject({ fullName: "Lina B.", phoneE164: "+33612345678", snapchat: null, notes: "VIP" });
  });

  it("prendre le numéro d'une autre fiche ⇒ CONFLICT nommé ; fiche disparue ⇒ NOT_FOUND", async () => {
    await seedCustomer(server.prisma, { fullName: "Lina", phoneE164: "+33612345678" });
    const samir = await seedCustomer(server.prisma, { fullName: "Samir", phoneE164: "+33711223344" });
    expect(
      expectError(await server.customers.updateCustomerAction({ id: samir.id, phone: "0612345678" }), "CONFLICT").message,
    ).toBe("Ce numéro est déjà celui de Lina.");
    expect((await server.prisma.customer.findUniqueOrThrow({ where: { id: samir.id } })).phoneE164).toBe("+33711223344");
    expectError(await server.customers.updateCustomerAction({ id: newId(), fullName: "Personne" }), "NOT_FOUND");
  });
});

describe("supprimer une fiche", () => {
  it("refusée tant qu'une commande est en attente ou confirmée, avec le nombre et le geste qui débloque", async () => {
    const fares = await seedCustomer(server.prisma, { fullName: "Fares" });
    await linkedDocument(fares.id, "PENDING");
    expect(expectError(await server.customers.deleteCustomerAction({ id: fares.id }), "CONFLICT").message).toBe(
      "Impossible : 1 commande en cours. Livre-la ou annule-la d'abord.",
    );
    await linkedDocument(fares.id, "CONFIRMED");
    expect(expectError(await server.customers.deleteCustomerAction({ id: fares.id }), "CONFLICT").message).toBe(
      "Impossible : 2 commandes en cours. Livre-les ou annule-les d'abord.",
    );
    expect(await server.prisma.customer.count({ where: { id: fares.id } })).toBe(1);
  });

  it("documents livrés ou annulés : fiche supprimée, documents conservés et affichés sous son DERNIER nom", async () => {
    const fares = await seedCustomer(server.prisma, { fullName: "Fares" });
    const delivered = await linkedDocument(fares.id, "DELIVERED");
    const cancelled = await linkedDocument(fares.id, "CANCELLED");
    expectOk(await server.customers.updateCustomerAction({ id: fares.id, fullName: "Fares Benali" }));

    expect(expectOk(await server.customers.deleteCustomerAction({ id: fares.id }))).toEqual({ id: fares.id, deleted: true });

    const documents = await server.prisma.saleDocument.findMany({ where: { id: { in: [delivered, cancelled] } } });
    expect(documents.map((doc) => [doc.customerId, doc.customerName])).toEqual([
      [null, "Fares Benali"],
      [null, "Fares Benali"],
    ]);
    expect(await server.prisma.customer.count()).toBe(0);
  });

  it("fiche déjà absente : succès sans rien faire", async () => {
    const id = newId();
    expect(expectOk(await server.customers.deleteCustomerAction({ id }))).toEqual({ id, deleted: false });
  });

  it("atomicité : un échec après la mise à jour des snapshots annule tout", async () => {
    const writer = await import("@/server/customers/writer");
    const fares = await seedCustomer(server.prisma, { fullName: "Fares" });
    const delivered = await linkedDocument(fares.id, "DELIVERED");
    expectOk(await server.customers.updateCustomerAction({ id: fares.id, fullName: "Fares Benali" }));
    const spy = vi.spyOn(writer, "deleteCustomer").mockRejectedValueOnce(new Error(INJECTED));

    expectError(await server.customers.deleteCustomerAction({ id: fares.id }), "UNEXPECTED");

    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
    expect(await server.prisma.customer.count({ where: { id: fares.id } })).toBe(1);
    expect(await server.prisma.saleDocument.findUniqueOrThrow({ where: { id: delivered } })).toMatchObject({
      customerId: fares.id,
      customerName: "Fares",
    });
  });

  it("sans session ⇒ SESSION_EXPIRED, rien d'écrit", async () => {
    cookieJar.current = { get: () => undefined };
    expectError(await server.customers.createCustomerAction({ fullName: "Lina" }), "SESSION_EXPIRED");
    expect(await server.prisma.customer.count()).toBe(0);
  });
});
