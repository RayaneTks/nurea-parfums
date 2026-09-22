import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateDocumentInput } from "@/contracts/documents";
import { periodBounds, periodStart } from "@/domain/periods";
import { catalogueLine, expectInvariants, loadMoneyServer, seedPocket, type MoneyServer } from "./transactions/support/argent";
import { expectOk, freshStart, newId, seedBatch, seedCustomer, seedPerfume } from "./transactions/support/harness";

/**
 * Définitions des chiffres (02 §6, 03 §5 ; 07 J7) éprouvées sur des scénarios écrits par les actions, lues par
 * les fonctions de `src/server/chiffres` — celles des écrans — et, pour les bornes de temps, par les fragments de
 * `sql.ts` évalués à un instant choisi (00:00 à Paris, veille à 23:59:59,999, changement d'heure).
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

type ChiffresServer = MoneyServer & {
  chiffres: typeof import("@/server/chiffres");
  sql: typeof import("@/server/chiffres/sql");
};

let server: ChiffresServer;

beforeAll(async () => {
  const money = await loadMoneyServer();
  server = { ...money, chiffres: await import("@/server/chiffres"), sql: await import("@/server/chiffres/sql") };
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

/** Un document écrit par T1 ; rend son identifiant. */
async function writeDocument(options: {
  origin: "ORDER" | "DIRECT_SALE";
  lines: LineInput[];
  received?: { amount: string; pocketId: string | null }[];
  customer?: CreateDocumentInput["customer"];
  batchId?: string;
  expectedDeliveryAt?: Date | string;
  expectedDeliveryHasTime?: boolean;
}): Promise<string> {
  const id = newId();
  expectOk(
    await server.documents.createDocumentAction({
      id,
      origin: options.origin,
      customer: options.customer ?? { kind: "passing", name: "Fares" },
      batchId: options.batchId,
      expectedDeliveryAt: options.expectedDeliveryAt,
      expectedDeliveryHasTime: options.expectedDeliveryHasTime,
      lines: options.lines,
      payments: (options.received ?? []).map((payment) => ({ id: newId(), ...payment })),
      confirm: true,
    }),
  );
  return id;
}

/** 9 000 DA au taux 277 = 32,49 € (arrondi demi vers le haut, 03 §4.8). */
const COST_9000 = { unitCostDzd: "9000", exchangeRate: "277" } as const;

/** Milieu du mois précédent : une date de valeur passée, dans la période « month-1 ». */
function middleOfLastMonth(): Date {
  return new Date(periodBounds("month", new Date(), -1).from.getTime() + 10 * 24 * 3600 * 1000);
}

describe("Encaissé (02 §6, 03 §5.2)", () => {
  it("un acompte conservé sur une commande annulée reste dans l'Encaissé, hors À encaisser et hors coûts", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const perfume = await seedPerfume(server.prisma);
    const order = await writeDocument({
      origin: "ORDER",
      lines: [catalogueLine(perfume.id, { unitPriceEur: "120", ...COST_9000 })],
      received: [{ amount: "50", pocketId: cash.id }],
    });
    expect(await server.chiffres.aEncaisser()).toBe("70.00");
    expect((await server.chiffres.margeNette("month")).costs).toBe("32.49");

    expectOk(await server.documents.cancelDocumentAction({ documentId: order, refunds: [], confirm: true }));

    expect(await server.chiffres.encaisse("month")).toBe("50.00");
    expect(await server.chiffres.encaisse("all")).toBe("50.00");
    expect(await server.chiffres.aEncaisser()).toBe("0.00");
    expect(await server.chiffres.aEncaisserDetail()).toEqual([]);
    expect(await server.chiffres.margeNette("month")).toEqual({
      value: "50.00",
      percent: "100,0",
      encaisse: "50.00",
      costs: "0.00",
      expenses: "0.00",
      hasUnknownCost: false,
      unknownCostCount: 0,
    });
    expect((await server.chiffres.tresorerie()).total).toBe("50.00");
    const dashboard = await server.chiffres.tableauDeBord();
    expect([dashboard.encaisseMois, dashboard.aEncaisser, dashboard.commandes]).toEqual(["50.00", "0.00", { enAttente: 0, confirmees: 0 }]);
  });

  it("à la date du paiement, remboursements déduits ; le coût compte à l'engagement (marge du mois négative, 03 §5.4)", async () => {
    const bank = await seedPocket(server.prisma, { name: "Banque", kind: "BANK", openingBalance: "1000" });
    const perfume = await seedPerfume(server.prisma);
    const order = await writeDocument({ origin: "ORDER", lines: [catalogueLine(perfume.id, { unitPriceEur: "200", ...COST_9000 })] });
    const lastMonth = middleOfLastMonth();
    expectOk(
      await server.payments.recordPaymentAction({ id: newId(), documentId: order, amount: "80", pocketId: bank.id, occurredAt: lastMonth.toISOString() }),
    );

    // Payé le mois dernier, engagé (confirmé par l'acompte) ce mois-ci.
    expect(await server.chiffres.encaisse("month-1")).toBe("80.00");
    expect(await server.chiffres.encaisse("month")).toBe("0.00");
    expect(await server.chiffres.margeNette("month-1")).toMatchObject({ value: "80.00", costs: "0.00" });
    expect(await server.chiffres.margeNette("month")).toMatchObject({ value: "-32.49", percent: null, encaisse: "0.00", costs: "32.49" });

    // Un remboursement d'aujourd'hui sort de l'Encaissé du mois, pas de celui du paiement.
    expectOk(
      await server.documents.cancelDocumentAction({ documentId: order, refunds: [{ id: newId(), amount: "30", pocketId: bank.id }], confirm: true }),
    );
    expect(await server.chiffres.encaisse("month-1")).toBe("80.00");
    expect(await server.chiffres.encaisse("month")).toBe("-30.00");
    expect(await server.chiffres.encaisse("all")).toBe("50.00");
    const byPocket = await server.chiffres.encaisseParPoche("month");
    expect(byPocket.map((row) => [row.name, row.encaisse])).toEqual([["Banque", "-30.00"]]);
  });

  it("transfert, ajustement et paiement fournisseur bougent la Trésorerie, jamais l'Encaissé ni la Marge nette", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces", openingBalance: "100" });
    const bank = await seedPocket(server.prisma, { name: "Banque", kind: "BANK", openingBalance: "500" });
    const perfume = await seedPerfume(server.prisma);
    await writeDocument({ origin: "DIRECT_SALE", lines: [catalogueLine(perfume.id, { unitPriceEur: "60", ...COST_9000 })], received: [{ amount: "60", pocketId: cash.id }] });
    const before = { encaisse: await server.chiffres.encaisse("all"), marge: await server.chiffres.margeNette("all") };

    expectOk(await server.treasury.transferAction({ fromPocketId: cash.id, toPocketId: bank.id, amount: "40" }));
    expectOk(await server.treasury.adjustAction({ pocketId: cash.id, direction: "out", amount: "5", reason: "Écart de caisse" }));
    expectOk(await server.treasury.recordSupplierPaymentAction({ pocketId: bank.id, amount: "300" }));

    expect(await server.chiffres.encaisse("all")).toBe(before.encaisse);
    expect(await server.chiffres.margeNette("all")).toEqual(before.marge);
    const tresorerie = await server.chiffres.tresorerie();
    expect(tresorerie.total).toBe("355.00");
    // Même rang : ordre alphabétique (03 §5.5).
    expect(tresorerie.pockets.map((pocket) => [pocket.name, pocket.balance])).toEqual([
      ["Banque", "240.00"],
      ["Espèces", "115.00"],
    ]);
    expect(tresorerie.unassigned).toBe("0.00");
  });
});

describe("À encaisser (02 §6, 03 §5.3)", () => {
  it("une commande PENDING n'est pas une créance ; confirmée, elle l'est et son coût compte", async () => {
    const perfume = await seedPerfume(server.prisma);
    const order = await writeDocument({ origin: "ORDER", lines: [catalogueLine(perfume.id, { unitPriceEur: "120", ...COST_9000 })] });
    expect(await server.chiffres.aEncaisser()).toBe("0.00");
    expect(await server.chiffres.aEncaisserDetail()).toEqual([]);
    expect((await server.chiffres.margeNette("month")).costs).toBe("0.00");
    expect((await server.chiffres.tableauDeBord()).commandes).toEqual({ enAttente: 1, confirmees: 0 });

    expectOk(await server.documents.changeDocumentStatusAction({ documentId: order, to: "CONFIRMED", confirm: true }));

    expect(await server.chiffres.aEncaisser()).toBe("120.00");
    expect((await server.chiffres.aEncaisserDetail()).map((row) => [row.documentId, row.due, row.ageDays, row.isOld])).toEqual([
      [order, "120.00", 0, false],
    ]);
    expect((await server.chiffres.margeNette("month")).costs).toBe("32.49");
    expect((await server.chiffres.tableauDeBord()).commandes).toEqual({ enAttente: 0, confirmees: 1 });
  });

  it("un trop-perçu reste dans l'Encaissé et la Trésorerie mais ne compense jamais la dette d'un autre document", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const perfume = await seedPerfume(server.prisma);
    const client = await seedCustomer(server.prisma, { fullName: "Nadia Benali" });
    const customer = { kind: "linked", customerId: client.id } as const;
    const paid = await writeDocument({
      origin: "DIRECT_SALE",
      customer,
      lines: [catalogueLine(perfume.id, { unitPriceEur: "100" })],
      received: [{ amount: "100", pocketId: cash.id }],
    });
    const owed = await writeDocument({ origin: "DIRECT_SALE", customer, lines: [catalogueLine(perfume.id, { unitPriceEur: "80" })] });

    // Le prix du premier baisse après paiement : 40 € de trop-perçu.
    const [line] = await server.prisma.saleLine.findMany({ where: { documentId: paid } });
    expectOk(
      await server.documents.updateDocumentAction({
        documentId: paid,
        lines: [{ id: line!.id, volumeMl: 50, quantity: 1, unitPriceEur: "60" }],
        confirm: true,
      }),
    );

    const balances = await server.chiffres.documentBalance(paid, owed);
    expect(balances[paid]).toMatchObject({ total: "60.00", paid: "100.00", due: "0.00" });
    expect(balances[owed]).toMatchObject({ total: "80.00", paid: "0.00", due: "80.00" });
    expect(await server.chiffres.aEncaisser()).toBe("80.00");
    expect(await server.chiffres.aEncaisser(null, client.id)).toBe("80.00");
    expect(await server.chiffres.aEncaisserParClient()).toEqual({ [client.id]: "80.00" });
    expect((await server.chiffres.aEncaisserDetail()).map((row) => row.documentId)).toEqual([owed]);
    expect(await server.chiffres.encaisse("all", null, client.id)).toBe("100.00");
    expect((await server.chiffres.tresorerie()).total).toBe("100.00");
  });
});

describe("Marge nette (02 §6, 03 §5.4)", () => {
  it("une dépense supprimée disparaît de sa période, contre-passée à sa date ; les autres périodes ne bougent pas", async () => {
    const bank = await seedPocket(server.prisma, { name: "Banque", kind: "BANK", openingBalance: "1000" });
    const batch = await seedBatch(server.prisma, { name: "Commande de mars" });
    const old = expectOk(
      await server.batches.addBatchExpenseAction({
        id: newId(),
        batchId: batch.id,
        label: "Transport",
        amount: "45",
        pocketId: bank.id,
        occurredAt: middleOfLastMonth().toISOString(),
      }),
    );
    expectOk(await server.batches.addBatchExpenseAction({ id: newId(), batchId: batch.id, label: "Douane", amount: "15", pocketId: bank.id }));
    expect(await server.chiffres.margeNette("month-1")).toMatchObject({ value: "-45.00", expenses: "45.00" });
    expect(await server.chiffres.margeNette("month")).toMatchObject({ value: "-15.00", expenses: "15.00" });

    expectOk(await server.batches.deleteBatchExpenseAction({ id: old.id }));

    expect(await server.chiffres.margeNette("month-1")).toMatchObject({ value: "0.00", expenses: "0.00" });
    expect(await server.chiffres.margeNette("month")).toMatchObject({ value: "-15.00", expenses: "15.00" });
    expect(await server.chiffres.margeNette("all", batch.id)).toMatchObject({ value: "-15.00", expenses: "15.00" });
    expect((await server.chiffres.chiffresParLot())[batch.id]?.margeNette.expenses).toBe("15.00");
    expect((await server.chiffres.tresorerie()).total).toBe("985.00");
  });

  it("ligne offerte : coût compté ; coût inconnu : compté 0 et signalé, le lien ouvre exactement ces documents", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const perfume = await seedPerfume(server.prisma);
    await writeDocument({
      origin: "DIRECT_SALE",
      lines: [catalogueLine(perfume.id, { unitPriceEur: "100", ...COST_9000 }), catalogueLine(perfume.id, { unitPriceEur: "", isGift: true, ...COST_9000 })],
      received: [{ amount: "100", pocketId: cash.id }],
    });
    const unknown = await writeDocument({
      origin: "DIRECT_SALE",
      lines: [catalogueLine(perfume.id, { unitPriceEur: "50" })],
      received: [{ amount: "50", pocketId: cash.id }],
    });

    expect(await server.chiffres.margeNette("month")).toEqual({
      value: "85.02",
      percent: "56,7",
      encaisse: "150.00",
      costs: "64.98",
      expenses: "0.00",
      hasUnknownCost: true,
      unknownCostCount: 1,
    });
    expect(await server.chiffres.coutACompleter("all")).toEqual({ count: 1, documentIds: [unknown] });
    expect(await server.chiffres.documentBalance(unknown)).toMatchObject({ [unknown]: { cost: "0.00", hasUnknownCost: true } });
    expect((await server.chiffres.tableauDeBord()).coutACompleter).toBe(1);
  });
});

describe("En retard (02 §6, 03 §5.6)", () => {
  it("en retard dès 00:00 Europe/Paris le lendemain de la livraison prévue, pas la veille à 23:59:59,999 — changement d'heure compris", async () => {
    const perfume = await seedPerfume(server.prisma);
    const line = [catalogueLine(perfume.id)];
    const summer = await writeDocument({ origin: "ORDER", lines: line, expectedDeliveryAt: "2026-10-24" });
    const winter = await writeDocument({ origin: "ORDER", lines: line, expectedDeliveryAt: "2026-10-25" });
    const delivered = await writeDocument({ origin: "ORDER", lines: line, expectedDeliveryAt: "2026-10-24" });
    expectOk(await server.documents.changeDocumentStatusAction({ documentId: delivered, to: "DELIVERED", confirm: true }));

    const lateAt = async (iso: string) =>
      (await server.prisma.$queryRaw<{ documentId: string }[]>(server.sql.enRetardSql(new Date(iso)))).map((row) => row.documentId);

    // 24 octobre (heure d'été, UTC+2) : en retard à partir du 25 à 00:00 à Paris = 24 à 22:00 UTC.
    expect(await lateAt("2026-10-24T21:59:59.999Z")).toEqual([]);
    expect(await lateAt("2026-10-24T22:00:00.000Z")).toEqual([summer]);
    // 25 octobre, jour de 25 h (retour à UTC+1) : en retard à partir du 26 à 00:00 à Paris = 25 à 23:00 UTC.
    expect(await lateAt("2026-10-25T22:59:59.999Z")).toEqual([summer]);
    expect(await lateAt("2026-10-25T23:00:00.000Z")).toEqual([summer, winter]);
  });

  it("à l'horloge du serveur : prévue hier à 23:59:59,999 ⇒ en retard ; prévue aujourd'hui à 00:00 ⇒ non ; même compte à l'Accueil", async () => {
    const perfume = await seedPerfume(server.prisma);
    const today = periodStart("day");
    const yesterday = await writeDocument({
      origin: "ORDER",
      lines: [catalogueLine(perfume.id)],
      expectedDeliveryAt: new Date(today.getTime() - 1),
      expectedDeliveryHasTime: true,
    });
    await writeDocument({ origin: "ORDER", lines: [catalogueLine(perfume.id)], expectedDeliveryAt: today, expectedDeliveryHasTime: true });

    expect(await server.chiffres.enRetard()).toEqual({ count: 1, documentIds: [yesterday] });
    expect((await server.chiffres.tableauDeBord()).enRetard).toBe(1);
  });
});

describe("Créance ancienne (03 §5.8)", () => {
  it("engagée il y a plus de 30 jours calendaires de Paris ; clients à relancer = groupes de E13 (fiche, sinon nom saisi)", async () => {
    const perfume = await seedPerfume(server.prisma);
    const client = await seedCustomer(server.prisma, { fullName: "Yanis" });
    const sale = (customer: CreateDocumentInput["customer"]) =>
      writeDocument({ origin: "DIRECT_SALE", customer, lines: [catalogueLine(perfume.id, { unitPriceEur: "40" })] });
    const linkedA = await sale({ kind: "linked", customerId: client.id });
    const linkedB = await sale({ kind: "linked", customerId: client.id });
    const passing = await sale({ kind: "passing", name: "Nadia" });
    const samePassing = await sale({ kind: "passing", name: " nadia " });
    const recent = await sale({ kind: "passing", name: "Fares" });

    // Seuil : 00:00 à Paris il y a 30 jours. À 30 jours pile : pas ancienne ; une milliseconde avant : ancienne.
    const threshold = periodBounds("day", new Date(), -30).from;
    const confirm = (id: string, at: Date) =>
      server.prisma.$executeRaw`UPDATE "SaleDocument" SET "confirmedAt" = ${at}, "orderedAt" = ${at} WHERE id = ${id}`;
    await confirm(linkedA, new Date(threshold.getTime() - 1));
    await confirm(linkedB, new Date(threshold.getTime() - 40 * 24 * 3600 * 1000));
    await confirm(passing, new Date(threshold.getTime() - 1));
    await confirm(samePassing, new Date(threshold.getTime() - 1));
    await confirm(recent, threshold);

    const old = await server.chiffres.creancesAnciennes();
    expect(old.map((row) => row.documentId).sort()).toEqual([linkedA, linkedB, passing, samePassing].sort());
    expect(old.every((row) => row.isOld && row.ageDays > 30)).toBe(true);
    expect(new Set(old.map((row) => row.customerKey)).size).toBe(2);
    const detail = await server.chiffres.aEncaisserDetail();
    expect(detail.find((row) => row.documentId === recent)).toMatchObject({ ageDays: 30, isOld: false });
    expect(detail.filter((row) => row.isOld)).toEqual(old);
    expect((await server.chiffres.tableauDeBord()).clientsARelancer).toBe(2);
  });
});
