import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { parsePeriod } from "@/contracts/chiffres";
import { comptaPeriodKey, exportRangeOf, parseExportParams, type ComptaParams } from "@/contracts/compta";
import { eur, eurFromDb, parseEurInput, toWire } from "@/domain/money";
import { parisDayKey } from "@/domain/periods";
import { catalogueLine, expectInvariants, loadMoneyServer, seedPocket, type MoneyServer } from "./transactions/support/argent";
import { expectOk, freshStart, newId, seedBatch, seedCustomer, seedPerfume } from "./transactions/support/harness";

/**
 * Jalon J12 (07) — lectures de la Compta et de la Trésorerie, et export CSV, sur base réelle :
 * - E03 zone 5 : la liste est EXACTEMENT l'ensemble de `documentsDeLaPeriode`, et sous le filtre celui de
 *   `coutACompleter` ; lots ouverts, puis clos, puis hors lot ; recherche étendue de E10 ;
 * - export : BOM, `;`, aucun en-tête « CA », une ligne par paiement, Σ « Encaissé (€) » = `encaisse` de la période
 *   DE L'ÉCRAN (la période voyage de l'écran à la route par `du`/`au`) ;
 * - E04 : avec 45 mouvements dans le mois, le net = somme SQL des 45 ; transferts nommés par l'autre jambe ;
 *   S14 : 10 derniers mouvements et nombre total par poche.
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
  chiffres: typeof import("@/server/chiffres");
  csv: typeof import("@/server/export/compta-csv");
};

let server: Server;

beforeAll(async () => {
  const money = await loadMoneyServer();
  server = {
    ...money,
    queries: await import("@/server/documents/queries"),
    chiffres: await import("@/server/chiffres"),
    csv: await import("@/server/export/compta-csv"),
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

async function sale(options: {
  perfumeId: number;
  pocketId: string | null;
  amount?: string;
  batchId?: string;
  customer?: { kind: "passing"; name: string } | { kind: "linked"; customerId: string };
  unknownCost?: boolean;
  origin?: "ORDER" | "DIRECT_SALE";
}): Promise<string> {
  const id = newId();
  expectOk(
    await server.documents.createDocumentAction({
      id,
      origin: options.origin ?? "DIRECT_SALE",
      customer: options.customer ?? { kind: "passing", name: "Client" },
      lines: [catalogueLine(options.perfumeId, options.unknownCost ? {} : COST)],
      batchId: options.batchId,
      payments: options.amount ? [{ id: newId(), amount: options.amount, pocketId: options.pocketId }] : [],
      confirm: true,
    }),
  );
  return id;
}

const ids = (data: Awaited<ReturnType<typeof server.queries.comptaDocuments>>) => data.sections.flatMap((section) => section.rows.map((row) => row.id));

describe("E03 zone 5 — documents de la période", () => {
  it("exactement les documents de `documentsDeLaPeriode` : lots ouverts, puis clos, puis hors lot ; sous le filtre, exactement `coutACompleter`", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const perfume = await seedPerfume(server.prisma, { name: "Sauvage", brand: "Dior" });
    const open = await seedBatch(server.prisma, { name: "Commande de mars" });
    const closing = await seedBatch(server.prisma, { name: "Commande de février" });

    const inOpen = await sale({ perfumeId: perfume.id, pocketId: cash.id, amount: "120", batchId: open.id });
    const inClosed = await sale({ perfumeId: perfume.id, pocketId: cash.id, amount: "50", batchId: closing.id, origin: "ORDER", unknownCost: true });
    const horsLot = await sale({ perfumeId: perfume.id, pocketId: cash.id, amount: "120" });
    // Hors période : une commande en attente sans paiement, une vente dont le seul paiement date d'il y a 40 jours.
    const pending = newId();
    expectOk(
      await server.documents.createDocumentAction({
        id: pending,
        origin: "ORDER",
        customer: { kind: "passing", name: "Plus tard" },
        lines: [catalogueLine(perfume.id, COST)],
        payments: [],
        confirm: true,
      }),
    );
    const old = await sale({ perfumeId: perfume.id, pocketId: cash.id });
    await server.prisma.$executeRawUnsafe(
      `UPDATE "SaleDocument" SET "orderedAt" = now() - interval '40 days', "confirmedAt" = now() - interval '40 days', "deliveredAt" = now() - interval '40 days' WHERE id = $1`,
      old,
    );
    expectOk(await server.payments.recordPaymentAction({ id: newId(), documentId: old, amount: "120", pocketId: cash.id, occurredAt: new Date(Date.now() - 40 * DAY).toISOString() }));
    await server.prisma.batch.update({ where: { id: closing.id }, data: { status: "CLOSED" } });

    const list = await server.queries.comptaDocuments("month");
    const canonical = await server.chiffres.documentsDeLaPeriode("month");
    expect(new Set(ids(list))).toEqual(new Set(canonical.documentIds));
    expect(ids(list)).toEqual([inOpen, inClosed, horsLot]);
    expect(list.sections.map((section) => section.batch?.name ?? "Hors lot")).toEqual(["Commande de mars", "Commande de février", "Hors lot"]);
    expect(list.sections[1]?.batch?.status).toBe("CLOSED");
    expect(list.scopeCount).toBe(3);
    expect(list.sections[0]?.rows[0]).toMatchObject({ origin: "DIRECT_SALE", status: "DELIVERED", itemCount: 1, total: "120.00", due: "0.00", hasUnknownCost: false });
    expect(list.sections[1]?.rows[0]).toMatchObject({ status: "CONFIRMED", due: "70.00", hasUnknownCost: true });

    const filtered = await server.queries.comptaDocuments("month", null, "cout-a-completer");
    expect(ids(filtered)).toEqual((await server.chiffres.coutACompleter("month")).documentIds);
    expect(ids(filtered)).toEqual([inClosed]);
    expect(filtered.filtre).toBe("cout-a-completer");
    expect(filtered.scopeCount).toBe(1);

    // La vente payée il y a 40 jours appartient à « Tout » et à sa propre période.
    expect(ids(await server.queries.comptaDocuments("all"))).toContain(old);
    expect(ids(await server.queries.comptaDocuments("all"))).not.toContain(pending);
  });

  it("recherche : mêmes champs et mêmes règles que E10 (tous les mots, accents, lot, contact), le périmètre compté reste celui de la période", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const sauvage = await seedPerfume(server.prisma, { name: "Sauvage", brand: "Dior" });
    const libre = await seedPerfume(server.prisma, { name: "Libre", brand: "Yves Saint Laurent" });
    const elise = await seedCustomer(server.prisma, { fullName: "Élise Martin", phoneE164: "+33612345678" });
    const batch = await seedBatch(server.prisma, { name: "Commande de mars" });
    const both = await sale({ perfumeId: sauvage.id, pocketId: cash.id, amount: "120", customer: { kind: "linked", customerId: elise.id } });
    const other = await sale({ perfumeId: libre.id, pocketId: cash.id, amount: "120", batchId: batch.id });

    const search = (q: string) => server.queries.comptaDocuments("month", q).then(ids);
    expect(await search("dior elise")).toEqual([both]);
    expect(await search("sauvage mars")).toEqual([]);
    expect(await search("mars")).toEqual([other]);
    expect(await search("06 12")).toEqual([both]);
    const result = await server.queries.comptaDocuments("month", "introuvable");
    expect(result.total).toBe(0);
    expect(result.scopeCount).toBe(2);
    expect(result.q).toBe("introuvable");
  });
});

describe("export CSV (07 J12)", () => {
  /** Une ligne CSV : champs séparés par « ; », guillemets doublés dans un champ entre guillemets. */
  function fields(line: string): string[] {
    const out: string[] = [];
    let current = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (quoted) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else if (char === '"') quoted = false;
        else current += char;
      } else if (char === '"') quoted = true;
      else if (char === ";") {
        out.push(current);
        current = "";
      } else current += char;
    }
    out.push(current);
    return out;
  }

  function parse(text: string) {
    expect(text.startsWith("﻿")).toBe(true);
    const [header = "", ...lines] = text.slice(1).split("\r\n").filter((line) => line !== "");
    return { header, columns: fields(header), rows: lines.map(fields) };
  }

  const sumOf = (rows: string[][], index: number) =>
    toWire(eur.sum(rows.map((row) => parseEurInput((row[index] ?? "").replace(",", "."), { signed: true }) ?? eur.zero)));

  it("BOM, « ; », colonnes au vocabulaire canonique (aucun « CA »), une ligne par paiement, annulation et remboursement nommés", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const perfume = await seedPerfume(server.prisma, { name: "Sauvage", brand: "Dior" });
    const order = await sale({ perfumeId: perfume.id, pocketId: cash.id, amount: "50", origin: "ORDER", customer: { kind: "passing", name: "Fares ; « guillemets »" } });
    const paid = await server.prisma.payment.findFirstOrThrow({ where: { documentId: order } });
    expectOk(await server.payments.voidPaymentAction({ paymentId: paid.id }));
    await sale({ perfumeId: perfume.id, pocketId: null, amount: "120" });

    const { fileName, text } = await server.csv.comptaCsv("month", exportRangeOf({ periode: "mois", ref: null }));
    expect(fileName).toMatch(/^compta-\d{4}-\d{2}-01-au-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = parse(text);
    expect(csv.columns).toEqual(["Date", "Document", "Client", "Nature", "Poche", "Moyen", "Encaissé (€)", "Total du document (€)"]);
    expect(csv.header).not.toMatch(/(^|;)CA\b/);
    expect(text).not.toMatch(/\bCA\b/);
    expect(csv.rows).toHaveLength(3);
    const [date, document, client, nature, pocket, , amount, total] = csv.rows[0] as string[];
    expect(date).toBe(parisDayKey().split("-").reverse().join("/"));
    expect(document).toMatch(/^Commande du \d{1,2} /);
    expect(client).toBe("Fares ; « guillemets »");
    expect(text).toContain('"Fares ; « guillemets »"');
    expect(nature).toBe("Acompte");
    expect(pocket).toBe("Espèces");
    expect(amount).toBe("50,00");
    expect(total).toBe("120,00");
    expect(csv.rows[1]?.slice(3, 7)).toEqual(["Paiement annulé", "Espèces", "", "-50,00"]);
    expect(csv.rows[2]?.slice(2, 5)).toEqual(["Client", "Paiement", "Non attribué"]);
  });

  it("Σ « Encaissé (€) » = `encaisse` de la période de l'écran, pour le mois, le mois précédent, l'année et « Tout »", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces" });
    const bank = await seedPocket(server.prisma, { name: "Banque", kind: "BANK" });
    const perfume = await seedPerfume(server.prisma, { name: "Sauvage", brand: "Dior" });
    for (const [amount, daysAgo, pocketId] of [
      ["120", 0, cash.id],
      ["59.90", 0, bank.id],
      ["80", 35, cash.id],
      ["45.50", 70, bank.id],
      ["30", 400, cash.id],
    ] as const) {
      const document = await sale({ perfumeId: perfume.id, pocketId });
      expectOk(
        await server.payments.recordPaymentAction({
          id: newId(),
          documentId: document,
          amount,
          pocketId,
          occurredAt: daysAgo === 0 ? undefined : new Date(Date.now() - daysAgo * DAY).toISOString(),
        }),
      );
    }
    const refunded = await sale({ perfumeId: perfume.id, pocketId: cash.id, amount: "120" });
    expectOk(await server.documents.cancelDocumentAction({ documentId: refunded, confirm: true, refunds: [{ id: newId(), amount: "20", pocketId: cash.id }] }));

    const lastMonth = parisDayKey(new Date(Date.now() - 35 * DAY));
    const screens: Pick<ComptaParams, "periode" | "ref">[] = [
      { periode: "mois", ref: null },
      { periode: "mois", ref: lastMonth },
      { periode: "annee", ref: null },
      { periode: "tout", ref: null },
    ];
    for (const screen of screens) {
      const range = exportRangeOf(screen);
      const request = parseExportParams(range ?? {});
      expect(request, JSON.stringify(screen)).not.toBeNull();
      const { text } = await server.csv.comptaCsv(request?.periode ?? "", request?.range ?? null);
      const shown = await server.chiffres.encaisse(comptaPeriodKey(screen));
      expect(sumOf(parse(text).rows, 6), JSON.stringify(screen)).toBe(shown);
      if (range) expect(parsePeriod(request?.periode ?? "")?.kind).toBe("range");
    }
    expect(await server.chiffres.encaisse("all")).toBe(toWire(eurFromDb("435.40")));
  });
});

describe("E04 — journal du mois, S14 — activité des poches", () => {
  it("45 mouvements dans le mois : le net affiché est la somme SQL des 45", async () => {
    const bank = await seedPocket(server.prisma, { name: "Banque", kind: "BANK", openingBalance: "1000" });
    const day = new Date(Date.now() - 40 * DAY);
    for (let index = 0; index < 45; index += 1) {
      expectOk(
        await server.treasury.adjustAction({
          id: newId(),
          pocketId: bank.id,
          direction: index % 3 === 2 ? "out" : "in",
          amount: `${index + 1},${String((index * 7) % 100).padStart(2, "0")}`,
          reason: `Recomptage ${index + 1}`,
          occurredAt: new Date(day.getTime() - (index % 3) * 60_000).toISOString(),
        }),
      );
    }
    const month = parisDayKey(day).slice(0, 7);
    const journal = await server.treasuryQueries.movementJournal(month);
    const [sql] = await server.prisma.$queryRawUnsafe<{ n: number; net: string }[]>(
      `SELECT count(*)::int AS n, SUM(amount)::numeric(12,2)::text AS net FROM "CashMovement"
       WHERE "occurredAt" >= nurea_period_start('month', $1::timestamptz) AND "occurredAt" < nurea_period_end('month', $1::timestamptz)`,
      day,
    );
    expect(journal.entries).toHaveLength(45);
    expect(sql?.n).toBe(45);
    expect(journal.net).toBe(toWire(eurFromDb(sql?.net ?? "0")));
  });

  it("un transfert se nomme par l'autre jambe ; son annulation se replie ; S14 lit 10 mouvements et le compte total", async () => {
    const cash = await seedPocket(server.prisma, { name: "Espèces", openingBalance: "500" });
    const bank = await seedPocket(server.prisma, { name: "Banque", kind: "BANK" });
    const empty = await seedPocket(server.prisma, { name: "Vide" });
    const transfer = expectOk(await server.treasury.transferAction({ fromPocketId: cash.id, toPocketId: bank.id, amount: "300" }));
    expectOk(await server.treasury.reverseMovementAction({ movementId: transfer.movements[0].id }));
    for (let index = 0; index < 11; index += 1) {
      expectOk(await server.treasury.adjustAction({ pocketId: cash.id, direction: "in", amount: "1", reason: `Pièce ${index}` }));
    }

    const journal = await server.treasuryQueries.movementJournal(null, null);
    const out = journal.entries.find((entry) => entry.id === transfer.movements[0].id);
    const into = journal.entries.find((entry) => entry.id === transfer.movements[1].id);
    expect(out).toMatchObject({ kind: "TRANSFER", amount: "-300.00", pocketName: "Espèces", counterpartPocketName: "Banque" });
    expect(into).toMatchObject({ kind: "TRANSFER", amount: "300.00", pocketName: "Banque", counterpartPocketName: "Espèces" });
    expect(out?.reversedById).not.toBeNull();
    expect(journal.pocketId).toBeNull();

    const activity = await server.treasuryQueries.pocketActivity();
    expect(activity[cash.id]?.movementCount).toBe(13);
    expect(activity[cash.id]?.recent).toHaveLength(10);
    expect(activity[bank.id]?.movementCount).toBe(2);
    expect(activity[empty.id]).toBeUndefined();
    expect((await server.chiffres.tresorerie("instant")).total).toBe("511.00");
  });
});
