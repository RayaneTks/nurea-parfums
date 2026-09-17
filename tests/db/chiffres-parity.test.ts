import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { parsePeriod, type Period, type PeriodKey } from "@/contracts/chiffres";
import type { CreateDocumentInput } from "@/contracts/documents";
import { documentBalance as twinBalance, type DocumentBalance } from "@/domain/document-balance";
import { eur, eurFromDb, eurFromWire, percentOf, toWire, type Eur, type MoneyString } from "@/domain/money";
import { parisDayKey, parseParisDayKey, periodBounds } from "@/domain/periods";
import { expectInvariants, loadMoneyServer, seedPocket, seedSystemPocket, type MoneyServer } from "./transactions/support/argent";
import { expectOk, freshStart, newId, seedBatch, seedCustomer, seedPerfume } from "./transactions/support/harness";

/**
 * Parité des chiffres (04 §6.3, §6.4 ; 07 J7), sur des jeux de données aléatoires à graine fixe écrits par les
 * actions (lignes offertes, coûts inconnus et arrondis DZD → EUR, acomptes datés, remboursements, annulations de
 * paiement, trop-perçus, dépenses supprimées, transferts), en trois étapes cumulatives :
 *
 *   1. vue `DocumentBalance` = jumeau TypeScript `src/domain/document-balance.ts`, document par document, au centime ;
 *   2. composite `tableauDeBord()` = appels individuels, champ par champ ;
 *   3. Σ groupé = total (détail, par client, par lot, par poche, série) ; bornes SQL = bornes de `periods.ts`.
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
  catalogueQueries: typeof import("@/server/catalogue/queries");
};

let server: ChiffresServer;

const SEED = 20260917;
const DAY = 24 * 3600 * 1000;

/** mulberry32 : générateur déterministe, pour qu'un échec se rejoue à l'identique. */
function generator(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    chance: (p: number) => next() < p,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(values: readonly T[]): T => values[Math.floor(next() * values.length)] as T,
  };
}

const random = generator(SEED);

const PRICES = ["120", "59.90", "0.01", "999.99", "35.50", "17.33"];
const COSTS_DZD = ["9000", "30000", "12345.67", "1", "4999.99"];
const RATES = ["277", "250.5", "133.3333", "301.75"];
const PARTIALS = ["0.01", "10", "33.33", "50", "75.25"];
const NAMES = ["Fares", "Nadia", " nadia ", "Yanis"];

type World = {
  cash: string;
  bank: string;
  perfumes: number[];
  customers: string[];
  batches: string[];
  closed: Set<string>;
};

let world: World;

beforeAll(async () => {
  const money = await loadMoneyServer();
  server = { ...money, chiffres: await import("@/server/chiffres"), catalogueQueries: await import("@/server/catalogue/queries") };
  cookieJar.current = await freshStart(server);
  const cash = await seedPocket(server.prisma, { name: "Espèces", openingBalance: "100000" });
  const bank = await seedPocket(server.prisma, { name: "Banque", kind: "BANK", openingBalance: "100000" });
  await seedSystemPocket(server.prisma);
  const perfumes = [];
  for (const [index, stock] of [null, null, null, null, 3, 0].entries()) {
    perfumes.push((await seedPerfume(server.prisma, { name: `Parfum ${index}`, stock })).id);
  }
  const customers = [];
  for (const name of ["Fares Benali", "Nadia Kaci", "Yanis Amrani"]) customers.push((await seedCustomer(server.prisma, { fullName: name })).id);
  const batches = [];
  for (const name of ["Commande de mars", "Commande d'avril", "Commande de mai"]) batches.push((await seedBatch(server.prisma, { name })).id);
  world = { cash: cash.id, bank: bank.id, perfumes, customers, batches, closed: new Set() };
}, 120_000);

afterAll(async () => {
  await server?.prisma.$disconnect();
});

// ── Génération par les actions ─────────────────────────────────────────────────

const wire = (value: Eur) => toWire(value);
const money = (text: string) => eurFromDb(text);
const daysAgo = (days: number) => new Date(Date.now() - days * DAY - random.int(0, 20 * 3600) * 1000);

type LineInput = CreateDocumentInput["lines"][number];

function randomLine(): LineInput {
  const gift = random.chance(0.15);
  const unknownCost = random.chance(0.3);
  return {
    item: { kind: "catalogue", perfumeId: random.pick(world.perfumes) },
    volumeMl: random.pick([10, 50, 80] as const),
    quantity: random.int(1, 3),
    unitPriceEur: gift ? "" : random.pick(PRICES),
    isGift: gift,
    ...(unknownCost ? {} : { unitCostDzd: random.pick(COSTS_DZD), exchangeRate: random.pick(RATES) }),
  };
}

type StoredDocument = Awaited<ReturnType<typeof loadDocuments>>[number];

async function loadDocuments() {
  return server.prisma.saleDocument.findMany({
    orderBy: { id: "asc" },
    include: { lines: { orderBy: { position: "asc" } }, payments: { include: { movement: { include: { reversedBy: true } } } } },
  });
}

async function loadDocument(id: string): Promise<StoredDocument> {
  return (await loadDocuments()).find((doc) => doc.id === id) as StoredDocument;
}

function twinOf(doc: StoredDocument): DocumentBalance {
  return twinBalance(
    doc.lines.map((line) => ({
      quantity: line.quantity,
      unitPriceEur: money(line.unitPriceEur.toString()),
      unitCostEur: line.unitCostEur === null ? null : money(line.unitCostEur.toString()),
    })),
    doc.payments.map((payment) => ({ amount: money(payment.movement.amount.toString()) })),
  );
}

/** Un montant de la liste, strictement inférieur à `cap` ; null s'il n'y en a pas. */
function partialBelow(cap: Eur): MoneyString | null {
  const candidates = PARTIALS.filter((amount) => eur.compare(money(amount), cap) < 0);
  return candidates.length === 0 ? null : (random.pick(candidates) as MoneyString);
}

async function createRandomDocument(): Promise<string> {
  const id = newId();
  const origin = random.chance(0.5) ? "ORDER" : "DIRECT_SALE";
  const lines = Array.from({ length: random.int(1, 3) }, randomLine);
  const total = eur.sum(lines.map((line) => eur.times(line.unitPriceEur ? money(line.unitPriceEur) : eur.zero, line.quantity)));
  const open = world.batches.filter((batch) => !world.closed.has(batch));
  const payments: { id: string; amount: string; pocketId: string | null }[] = [];
  const pocket = () => random.pick([world.cash, world.bank, null]);
  if (!eur.isZero(total) && random.chance(0.7)) {
    if (random.chance(0.4)) {
      payments.push({ id: newId(), amount: wire(total), pocketId: pocket() });
    } else {
      const part = partialBelow(total);
      if (part) payments.push({ id: newId(), amount: part, pocketId: pocket() });
      const rest = part ? partialBelow(eur.sub(total, money(part))) : null;
      if (rest && random.chance(0.5)) payments.push({ id: newId(), amount: rest, pocketId: pocket() });
    }
  }
  expectOk(
    await server.documents.createDocumentAction({
      id,
      origin,
      customer: random.chance(0.4) ? { kind: "linked", customerId: random.pick(world.customers) } : { kind: "passing", name: random.pick(NAMES) },
      batchId: open.length > 0 && random.chance(0.6) ? random.pick(open) : undefined,
      expectedDeliveryAt: origin === "ORDER" && random.chance(0.6) ? new Date(Date.now() + random.int(-20, 20) * DAY) : undefined,
      lines,
      payments,
      confirm: true,
    }),
  );
  return id;
}

async function randomOperations(id: string): Promise<void> {
  const rounds = random.int(1, 3);
  for (let round = 0; round < rounds; round += 1) {
    const doc = await loadDocument(id);
    const twin = twinOf(doc);
    const roll = random.int(0, 9);
    const active = doc.status !== "CANCELLED";

    if (roll <= 2 && active && eur.compare(twin.due, eur.zero) > 0) {
      // Acompte ou solde, daté dans le passé.
      const amount = random.chance(0.3) ? wire(twin.due) : partialBelow(twin.due);
      if (!amount) continue;
      expectOk(
        await server.payments.recordPaymentAction({
          id: newId(),
          documentId: id,
          amount,
          pocketId: random.pick([world.cash, world.bank, null]),
          occurredAt: daysAgo(random.int(0, 500)).toISOString(),
        }),
      );
    } else if (roll === 3 && active) {
      // Baisse de prix après paiement : trop-perçu possible.
      const target = doc.lines.findIndex((line) => !line.isGift);
      if (target < 0) continue;
      expectOk(
        await server.documents.updateDocumentAction({
          documentId: id,
          lines: doc.lines.map((line, index) => ({
            id: line.id,
            volumeMl: line.volumeMl as 10 | 50 | 80,
            quantity: line.quantity,
            unitPriceEur: index === target ? "0.01" : line.unitPriceEur.toString(),
            isGift: line.isGift,
            unitCostDzd: line.unitCostDzd?.toString() ?? null,
            exchangeRate: line.exchangeRate?.toString() ?? null,
          })),
          confirm: true,
        }),
      );
    } else if (roll === 4 && active) {
      // Annulation, remboursement partiel éventuel.
      const refund = eur.compare(twin.paid, eur.zero) > 0 && random.chance(0.6) ? partialBelow(eur.add(twin.paid, money("0.01"))) : null;
      expectOk(
        await server.documents.cancelDocumentAction({
          documentId: id,
          refunds: refund ? [{ id: newId(), amount: refund, pocketId: world.bank }] : [],
          confirm: true,
        }),
      );
    } else if (roll === 5 && eur.compare(twin.overpaid, eur.zero) > 0) {
      // Rembourser le trop-perçu (ou le payé d'un document annulé), en tout ou partie.
      const cap = doc.status === "CANCELLED" ? twin.paid : twin.overpaid;
      if (eur.compare(cap, eur.zero) <= 0) continue;
      const amount = random.chance(0.5) ? wire(cap) : partialBelow(cap);
      if (!amount) continue;
      expectOk(await server.payments.refundAction({ id: newId(), documentId: id, amount, pocketId: world.bank }));
    } else if (roll === 6) {
      // Annuler un paiement ni contre-passé ni lui-même une annulation.
      const candidates = doc.payments.filter((payment) => payment.movement.reversesId === null && payment.movement.reversedBy === null);
      if (candidates.length === 0) continue;
      expectOk(await server.payments.voidPaymentAction({ paymentId: random.pick(candidates).id }));
    } else if (roll >= 7 && doc.origin === "ORDER" && (doc.status === "PENDING" || doc.status === "CONFIRMED")) {
      const to = doc.status === "PENDING" && random.chance(0.6) ? "CONFIRMED" : "DELIVERED";
      expectOk(await server.documents.changeDocumentStatusAction({ documentId: id, to, confirm: true }));
    }
  }
}

async function generateStage(documents: number): Promise<void> {
  for (let i = 0; i < documents; i += 1) await randomOperations(await createRandomDocument());

  // Engagements étalés dans le temps : les coûts changent de période, des créances deviennent anciennes.
  const engaged = await server.prisma.saleDocument.findMany({ where: { status: { in: ["CONFIRMED", "DELIVERED"] } }, select: { id: true } });
  for (const { id } of engaged) {
    if (!random.chance(0.4)) continue;
    const at = daysAgo(random.int(1, 500));
    await server.prisma.$executeRaw`UPDATE "SaleDocument" SET "confirmedAt" = ${at}, "orderedAt" = ${at} WHERE id = ${id}`;
  }

  // Dépenses de lot datées, dont certaines supprimées ; mouvements hors Encaissé.
  for (let i = 0; i < 4; i += 1) {
    const expense = expectOk(
      await server.batches.addBatchExpenseAction({
        id: newId(),
        batchId: random.pick(world.batches),
        label: random.pick(["Transport", "Douane", "Billet"]),
        amount: random.pick(PARTIALS),
        pocketId: random.pick([world.cash, world.bank]),
        occurredAt: daysAgo(random.int(0, 400)).toISOString(),
      }),
    );
    if (random.chance(0.4)) expectOk(await server.batches.deleteBatchExpenseAction({ id: expense.id }));
  }
  expectOk(await server.treasury.transferAction({ fromPocketId: world.bank, toPocketId: world.cash, amount: random.pick(PARTIALS) }));
  expectOk(await server.treasury.recordSupplierPaymentAction({ pocketId: world.bank, amount: random.pick(PARTIALS) }));
}

// ── Vérifications ──────────────────────────────────────────────────────────────

/** Écarts vue ↔ jumeau, au centime ; `offset` décale le jumeau (auto-contrôle : un centime doit être vu). */
function balanceMismatches(
  view: Record<string, { total: string; cost: string; paid: string; due: string; hasUnknownCost: boolean }>,
  twins: Map<string, DocumentBalance>,
  offset: Eur = eur.zero,
): string[] {
  const found: string[] = [];
  for (const [id, twin] of twins) {
    const row = view[id];
    if (!row) {
      found.push(`${id} : absent de la vue`);
      continue;
    }
    const expected = {
      total: wire(eur.add(twin.total, offset)),
      cost: wire(twin.knownCost),
      paid: wire(twin.paid),
      due: wire(twin.due),
      hasUnknownCost: twin.hasUnknownCost,
    };
    for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
      if (row[key] !== expected[key]) found.push(`${id} ${key} : vue ${String(row[key])}, jumeau ${String(expected[key])}`);
    }
    if ((twin.cost === null) !== twin.hasUnknownCost) found.push(`${id} : cost null ⇎ hasUnknownCost`);
  }
  if (Object.keys(view).length !== twins.size) found.push(`vue : ${Object.keys(view).length} documents, jumeau : ${twins.size}`);
  return found;
}

const sum = (values: readonly string[]) => wire(eur.sum(values.map((value) => eurFromWire(value as MoneyString))));

/** Bornes TypeScript d'une clé de période (le jumeau de `boundsSql`) ; null pour « depuis toujours ». */
function boundsOf(period: Period): { from: Date; to: Date } | null {
  if (period.kind === "all") return null;
  if (period.kind === "range") return { from: new Date(period.from), to: new Date(period.to) };
  const ref = period.ref === null ? new Date() : (parseParisDayKey(period.ref) as Date);
  return periodBounds(period.unit, ref, period.offset);
}

const within = (date: Date | null, bounds: { from: Date; to: Date } | null) =>
  date !== null && (bounds === null || (date.getTime() >= bounds.from.getTime() && date.getTime() < bounds.to.getTime()));

async function verify(): Promise<void> {
  const { chiffres, prisma } = server;
  const docs = await loadDocuments();
  const twins = new Map(docs.map((doc) => [doc.id, twinOf(doc)]));
  const engaged = docs.filter((doc) => doc.status === "CONFIRMED" || doc.status === "DELIVERED");

  // 1. Vue = jumeau, document par document.
  expect(balanceMismatches(await chiffres.documentBalance(...docs.map((doc) => doc.id)), twins)).toEqual([]);

  // 2. À encaisser : total = Σ du détail = Σ des dus engagés du jumeau ; par client ; par lot.
  const total = await chiffres.aEncaisser();
  const detail = await chiffres.aEncaisserDetail();
  expect(sum(detail.map((row) => row.due))).toBe(total);
  expect(sum(engaged.map((doc) => wire((twins.get(doc.id) as DocumentBalance).due)))).toBe(total);
  expect(detail.map((row) => row.documentId).sort()).toEqual(
    engaged.filter((doc) => !eur.isZero((twins.get(doc.id) as DocumentBalance).due)).map((doc) => doc.id).sort(),
  );
  const byCustomer = await chiffres.aEncaisserParClient();
  for (const customerId of world.customers) {
    const expected = sum(detail.filter((row) => row.customerId === customerId).map((row) => row.due));
    expect(await chiffres.aEncaisser(null, customerId)).toBe(expected);
    expect(byCustomer[customerId] ?? "0.00").toBe(expected);
  }
  expect(await chiffres.creancesAnciennes()).toEqual(detail.filter((row) => row.isOld));

  // 3. Encaissé depuis toujours = Σ payé du jumeau ; lots + hors lot = total.
  const encaisseAll = await chiffres.encaisse("all");
  expect(sum(docs.map((doc) => wire((twins.get(doc.id) as DocumentBalance).paid)))).toBe(encaisseAll);
  const lots = await chiffres.chiffresParLot();
  expect(Object.keys(lots).sort()).toEqual([...world.batches].sort());
  const unbatched = docs.filter((doc) => doc.batchId === null);
  const twinOfUnbatched = (field: "paid" | "knownCost") => unbatched.map((doc) => wire((twins.get(doc.id) as DocumentBalance)[field]));
  expect(sum([...Object.values(lots).map((lot) => lot.encaisse), ...twinOfUnbatched("paid")])).toBe(encaisseAll);
  expect(
    sum([...Object.values(lots).map((lot) => lot.aEncaisser), ...detail.filter((row) => row.batchId === null).map((row) => row.due)]),
  ).toBe(total);
  const margeAll = await chiffres.margeNette("all");
  expect(
    sum([
      ...Object.values(lots).map((lot) => lot.margeNette.costs),
      ...unbatched.filter((doc) => engaged.includes(doc)).map((doc) => wire((twins.get(doc.id) as DocumentBalance).knownCost)),
    ]),
  ).toBe(margeAll.costs);
  expect(sum(Object.values(lots).map((lot) => lot.margeNette.expenses))).toBe(margeAll.expenses);
  for (const batchId of world.batches) {
    const lot = lots[batchId];
    expect(lot?.encaisse).toBe(await chiffres.encaisse("all", batchId));
    expect(lot?.aEncaisser).toBe(await chiffres.aEncaisser(batchId));
    expect(lot?.margeNette).toEqual(await chiffres.margeNette("all", batchId));
  }

  // 4. Périodes : bornes SQL = bornes TypeScript ; Σ séries et poches = Encaissé ; Marge nette recomposée.
  const movements = await prisma.cashMovement.findMany({ include: { payment: true } });
  const payments = movements.filter((movement) => movement.kind === "PAYMENT");
  const expenseMovements = movements.filter((movement) => movement.kind === "EXPENSE");
  const refDay = parisDayKey(payments.length > 0 ? random.pick(payments).occurredAt : new Date());
  const keys: PeriodKey[] = ["day", "week", "month", "year", "all", "month-1", "week-2", "year-1", `month@${refDay}`, `week@${refDay}-1`, `day@${refDay}`];
  for (const key of keys) {
    const period = parsePeriod(key) as Period;
    const bounds = boundsOf(period);
    const encaisse = await chiffres.encaisse(key);
    const inPeriod = payments.filter((movement) => within(movement.occurredAt, bounds));
    expect(sum(inPeriod.map((movement) => wire(money(movement.amount.toString())))), key).toBe(encaisse);

    const serie = await chiffres.encaisseSerie(key);
    expect(sum(serie.points.map((point) => point.encaisse)), `série ${key}`).toBe(encaisse);
    serie.points.slice(1).forEach((point, index) => expect(point.from, `série ${key} contiguë`).toBe(serie.points[index]?.to));
    if (bounds && serie.points.length > 0) {
      expect([serie.points[0]?.from, serie.points.at(-1)?.to], `série ${key} bornée`).toEqual([bounds.from.toISOString(), bounds.to.toISOString()]);
    }
    expect(sum((await chiffres.encaisseParPoche(key)).map((row) => row.encaisse)), `poches ${key}`).toBe(encaisse);

    const committed = engaged.filter((doc) => within(doc.confirmedAt, bounds));
    const marge = await chiffres.margeNette(key);
    const costs = sum(committed.map((doc) => wire((twins.get(doc.id) as DocumentBalance).knownCost)));
    const expenses = sum(
      expenseMovements.filter((movement) => within(movement.occurredAt, bounds)).map((movement) => wire(eur.neg(money(movement.amount.toString())))),
    );
    const unknown = committed.filter((doc) => (twins.get(doc.id) as DocumentBalance).hasUnknownCost).map((doc) => doc.id).sort();
    const value = eur.sub(eur.sub(eurFromWire(encaisse), eurFromWire(costs)), eurFromWire(expenses));
    expect(marge, `marge ${key}`).toEqual({
      value: wire(value),
      percent: percentOf(value, eurFromWire(encaisse)),
      encaisse,
      costs,
      expenses,
      hasUnknownCost: unknown.length > 0,
      unknownCostCount: unknown.length,
    });
    expect((await chiffres.coutACompleter(key)).documentIds.sort(), `coût à compléter ${key}`).toEqual(unknown);
    const touched = new Set([...inPeriod.map((movement) => movement.payment?.documentId as string), ...committed.map((doc) => doc.id)]);
    expect((await chiffres.documentsDeLaPeriode(key)).documentIds, `documents ${key}`).toEqual([...touched].sort());
  }

  // 5. Trésorerie : Σ soldes = total ; soldes = ouverture + mouvements ; `activePockets` lit la même source.
  const tresorerie = await chiffres.tresorerie();
  expect(sum(tresorerie.pockets.map((pocket) => pocket.balance))).toBe(tresorerie.total);
  const pockets = await prisma.pocket.findMany({ where: { archived: false } });
  for (const pocket of pockets) {
    const balance = sum([
      wire(money(pocket.openingBalance.toString())),
      ...movements.filter((movement) => movement.pocketId === pocket.id).map((movement) => wire(money(movement.amount.toString()))),
    ]);
    expect(tresorerie.pockets.find((row) => row.id === pocket.id)?.balance, pocket.name).toBe(balance);
    if (pocket.isSystem) expect(tresorerie.unassigned).toBe(balance);
  }
  expect(await chiffres.tresorerie("instant")).toEqual(tresorerie);
  expect((await server.treasuryQueries.activePockets()).map((pocket) => [pocket.id, pocket.balance])).toEqual(
    tresorerie.pockets.map((pocket) => [pocket.id, pocket.balance]),
  );

  // 6. Composite = appels individuels.
  const dashboard = await chiffres.tableauDeBord();
  const month = periodBounds("month");
  const enRetard = await chiffres.enRetard();
  expect(dashboard).toEqual({
    month: { from: month.from.toISOString(), to: month.to.toISOString() },
    encaisseMois: await chiffres.encaisse("month"),
    margeNetteMois: await chiffres.margeNette("month"),
    aEncaisser: total,
    tresorerie: { total: tresorerie.total, unassigned: tresorerie.unassigned },
    enRetard: enRetard.count,
    clientsARelancer: new Set((await chiffres.creancesAnciennes()).map((row) => row.customerKey)).size,
    coutACompleter: (await chiffres.coutACompleter("all")).count,
    commandes: {
      enAttente: await prisma.saleDocument.count({ where: { origin: "ORDER", status: "PENDING" } }),
      confirmees: await prisma.saleDocument.count({ where: { origin: "ORDER", status: "CONFIRMED" } }),
    },
    stock: await server.catalogueQueries.stockAlerts(),
  });
  const today = periodBounds("day").from;
  expect(enRetard.documentIds.sort()).toEqual(
    docs
      .filter((doc) => (doc.status === "PENDING" || doc.status === "CONFIRMED") && doc.expectedDeliveryAt !== null && doc.expectedDeliveryAt < today)
      .map((doc) => doc.id)
      .sort(),
  );

  await expectInvariants(prisma);
}

describe("parité des chiffres sur des jeux aléatoires à graine fixe (04 §6.3, §6.4)", () => {
  it("le comparateur voit un centime d'écart entre la vue et le jumeau (auto-contrôle)", () => {
    const twin = twinBalance([{ quantity: 3, unitPriceEur: money("33.33"), unitCostEur: null }], [{ amount: money("50.00") }]);
    const view = { d: { total: "99.99", cost: "0.00", paid: "50.00", due: "49.99", hasUnknownCost: true } };
    expect(balanceMismatches(view, new Map([["d", twin]]))).toEqual([]);
    expect(balanceMismatches(view, new Map([["d", twin]]), money("0.01"))).toEqual(["d total : vue 99.99, jumeau 100.00"]);
  });

  it("jeu 1 : 15 documents", async () => {
    await generateStage(15);
    await verify();
  }, 180_000);

  it("jeu 2 : 15 documents de plus, un lot clos", async () => {
    world.closed.add(world.batches[0] as string);
    expectOk(await server.batches.setBatchStatusAction({ id: world.batches[0] as string, status: "CLOSED" }));
    await generateStage(15);
    await verify();
  }, 180_000);

  it("jeu 3 : 20 documents de plus", async () => {
    await generateStage(20);
    const docs = await loadDocuments();
    const twins = docs.map(twinOf);
    // Le jeu couvre bien ce qu'il prétend couvrir.
    expect(twins.some((twin) => twin.hasUnknownCost)).toBe(true);
    expect(twins.some((twin) => !eur.isZero(twin.overpaid))).toBe(true);
    expect(docs.some((doc) => doc.lines.some((line) => line.isGift))).toBe(true);
    expect(docs.some((doc) => doc.payments.some((payment) => payment.kind === "REFUND"))).toBe(true);
    expect(docs.some((doc) => doc.status === "CANCELLED" && !eur.isZero(twinOf(doc).paid))).toBe(true);
    await verify();
  }, 180_000);
});
