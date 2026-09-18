import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Prisma as PrismaNamespace } from "@prisma/client";
import { ORDERS_PAGE_SIZE } from "@/contracts/documents";
import { phoneDigitVariants, searchTerms } from "@/contracts/search";
import { freshStart, loadServer, type Server } from "./transactions/support/harness";

/**
 * Garde-fou de performance (04 §15 ; 07 J7, J14) : sur un jeu de données à 10 × le volume réel, généré, les
 * requêtes de `tableauDeBord()`, de `aEncaisserDetail()`, de la première page des commandes et des lectures de
 * l'Accueil (comptes, classement, lots ouverts, récap du jour) s'exécutent en moins de 50 ms (temps d'exécution
 * SQL d'`EXPLAIN ANALYZE`). Au-delà, la vue `DocumentBalance` se discute (index, matérialisation).
 *
 * Volume réel (copie migrée du 17/09/2026) : 35 documents, 60 lignes, 29 paiements, 73 mouvements, 6 poches,
 * 29 clients, 3 lots, 73 marques, 281 parfums, aucune dépense. × 10, avec 30 dépenses pour que le fragment des
 * dépenses travaille : 350 documents, 600 lignes, 290 paiements, 730 mouvements (290 paiements, 30 dépenses,
 * 150 transferts à deux jambes, 110 ajustements), 60 poches, 290 clients, 30 lots, 730 marques, 2 810 parfums.
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

const BUDGET_MS = 50;

let server: Server;
let chiffres: typeof import("@/server/chiffres");
let sql: typeof import("@/server/chiffres/sql");
let documentsSql: typeof import("@/server/documents/sql");
let statsSql: typeof import("@/server/stats/sql");
let Prisma: typeof PrismaNamespace;

/** Le jeu × 10, en SQL, dans UNE transaction (les triggers différés vérifient pièces et mouvements au COMMIT). */
const GENERATE = [
  `INSERT INTO "Setting" (id, "defaultExchangeRate", "updatedAt") VALUES (1, 277, now())`,
  `INSERT INTO "Brand" (id, name, slug, "updatedAt")
   SELECT 'marque-' || i, 'Marque ' || i, 'marque-' || i, now() FROM generate_series(1, 730) i`,
  `INSERT INTO "Perfume" (id, "brandId", name, image, stock, "updatedAt")
   SELECT i, 'marque-' || (1 + i % 730), 'Parfum ' || i, 'https://cdn.example/p' || i || '.webp',
          CASE i % 10 WHEN 0 THEN 0 WHEN 1 THEN 2 ELSE NULL END, now()
   FROM generate_series(1, 2810) i`,
  `INSERT INTO "Customer" (id, "fullName", "updatedAt")
   SELECT 'client-' || i, 'Client ' || i, now() FROM generate_series(1, 290) i`,
  `INSERT INTO "Batch" (id, name, status, "updatedAt")
   SELECT 'lot-' || i, 'Lot ' || i, CASE WHEN i % 3 = 0 THEN 'CLOSED' ELSE 'OPEN' END::"BatchStatus", now()
   FROM generate_series(1, 30) i`,
  `INSERT INTO "Pocket" (id, name, kind, "openingBalance", "isSystem", "sortOrder", "updatedAt")
   SELECT 'poche-' || i, 'Poche ' || i, 'CASH'::"PocketKind", 1000, false, i, now() FROM generate_series(1, 59) i
   UNION ALL SELECT 'poche-non-attribue', 'Non attribué', 'UNASSIGNED'::"PocketKind", 0, true, 999, now()`,
  // Documents : 60 % de ventes directes (1 sur 23 annulée), 40 % de commandes (en attente, confirmées, livrées,
  // annulées), étalés sur 18 mois ; livraisons prévues autour de la commande, certaines dépassées.
  `INSERT INTO "SaleDocument" (id, origin, status, "customerId", "customerName", "batchId", "orderedAt",
                               "expectedDeliveryAt", "confirmedAt", "deliveredAt", "cancelledAt", "updatedAt")
   SELECT 'doc-' || i, s.origin::"DocumentOrigin", s.status::"DocumentStatus",
          CASE WHEN i % 5 < 3 THEN 'client-' || (1 + i % 290) END,
          CASE WHEN i % 5 >= 3 THEN 'Passage ' || (i % 50) END,
          CASE WHEN i % 2 = 0 THEN 'lot-' || (1 + i % 30) END,
          s.at,
          CASE WHEN s.origin = 'ORDER' THEN s.at + ((i % 15) - 3) * interval '1 day' END,
          CASE WHEN s.status IN ('CONFIRMED', 'DELIVERED') THEN s.at END,
          CASE WHEN s.status = 'DELIVERED' THEN s.at + interval '2 days' END,
          CASE WHEN s.status = 'CANCELLED' THEN s.at + interval '1 day' END,
          now()
   FROM generate_series(1, 350) i
   CROSS JOIN LATERAL (
     SELECT CASE WHEN i % 5 < 3 THEN 'DIRECT_SALE' ELSE 'ORDER' END AS origin,
            CASE WHEN i % 5 < 3 THEN CASE WHEN i % 23 = 0 THEN 'CANCELLED' ELSE 'DELIVERED' END
                 ELSE (ARRAY['PENDING', 'CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'DELIVERED', 'DELIVERED', 'CANCELLED'])[1 + i % 7]
            END AS status,
            now() - ((i * 37) % 540) * interval '1 day' - ((i * 13) % 86400) * interval '1 second' AS at
   ) s`,
  // Lignes : une par document, une seconde pour 250 d'entre eux ; 1 coût sur 5 inconnu.
  `INSERT INTO "SaleLine" (id, "documentId", position, "perfumeId", "perfumeName", "brandName", "volumeMl", quantity,
                           "deliveredQuantity", "unitPriceEur", "unitCostEur", "updatedAt")
   SELECT 'ligne-' || d.n || '-' || p, 'doc-' || d.n, p, 1 + (d.n * 31 + p) % 2810, 'Parfum', 'Marque', 50, q.qty,
          CASE WHEN doc.status = 'DELIVERED' THEN q.qty ELSE 0 END,
          q.price, CASE WHEN (d.n + p) % 5 = 0 THEN NULL ELSE round(q.price * 0.4, 2) END, now()
   FROM generate_series(1, 350) d(n)
   CROSS JOIN generate_series(0, 1) p
   JOIN "SaleDocument" doc ON doc.id = 'doc-' || d.n
   CROSS JOIN LATERAL (SELECT 1 + (d.n + p) % 2 AS qty, (20 + (d.n * 17 + p * 7) % 200)::numeric(10,2) + 0.90 AS price) q
   WHERE p = 0 OR d.n <= 250`,
  // Paiements : 290 documents, montant = prix de leur première ligne, poche variée (dont « Non attribué »).
  `INSERT INTO "CashMovement" (id, "pocketId", amount, kind, "occurredAt")
   SELECT 'mvt-pay-' || i, CASE WHEN i % 7 = 0 THEN 'poche-non-attribue' ELSE 'poche-' || (1 + i % 59) END,
          l."unitPriceEur", 'PAYMENT'::"CashMovementKind", LEAST(d."orderedAt" + interval '1 day', now())
   FROM generate_series(1, 290) i
   JOIN "SaleDocument" d ON d.id = 'doc-' || i
   JOIN "SaleLine" l ON l.id = 'ligne-' || i || '-0'`,
  `INSERT INTO "Payment" (id, "documentId", kind, "movementId")
   SELECT 'pay-' || i, 'doc-' || i, CASE WHEN d.status = 'DELIVERED' THEN 'BALANCE' ELSE 'DEPOSIT' END::"PaymentKind", 'mvt-pay-' || i
   FROM generate_series(1, 290) i JOIN "SaleDocument" d ON d.id = 'doc-' || i`,
  `INSERT INTO "CashMovement" (id, "pocketId", amount, kind, "occurredAt")
   SELECT 'mvt-dep-' || i, 'poche-' || (1 + i % 59), -(10 + i), 'EXPENSE'::"CashMovementKind", now() - (i * 11 % 500) * interval '1 day'
   FROM generate_series(1, 30) i`,
  `INSERT INTO "BatchExpense" (id, "batchId", label, "movementId")
   SELECT 'dep-' || i, 'lot-' || (1 + i % 30), 'Transport', 'mvt-dep-' || i FROM generate_series(1, 30) i`,
  `INSERT INTO "CashMovement" (id, "pocketId", amount, kind, "occurredAt", "transferGroupId")
   SELECT 'mvt-tr-' || i || '-' || leg, 'poche-' || (1 + (i + leg) % 59), CASE WHEN leg = 0 THEN -(5 + i % 40) ELSE 5 + i % 40 END,
          'TRANSFER'::"CashMovementKind", now() - (i * 7 % 500) * interval '1 day', 'groupe-' || i
   FROM generate_series(1, 150) i CROSS JOIN generate_series(0, 1) leg`,
  `INSERT INTO "CashMovement" (id, "pocketId", amount, kind, "occurredAt", label)
   SELECT 'mvt-aj-' || i, 'poche-' || (1 + i % 59), CASE WHEN i % 2 = 0 THEN 3 + i % 9 ELSE -(3 + i % 9) END,
          'ADJUSTMENT'::"CashMovementKind", now() - (i * 5 % 500) * interval '1 day', 'Écart de caisse'
   FROM generate_series(1, 110) i`,
];

type ExplainRow = { "QUERY PLAN": [{ "Execution Time": number; "Planning Time": number }] };

/** Meilleur de 5 exécutions : la première paie le chargement des pages en mémoire, pas le plan. */
async function explain(query: PrismaNamespace.Sql): Promise<{ execution: number; planning: number }> {
  let best = { execution: Number.POSITIVE_INFINITY, planning: Number.POSITIVE_INFINITY };
  for (let run = 0; run < 5; run += 1) {
    const [row] = await server.prisma.$queryRaw<ExplainRow[]>(Prisma.sql`EXPLAIN (ANALYZE, FORMAT JSON) ${query}`);
    const plan = row?.["QUERY PLAN"][0];
    if (!plan) throw new Error("EXPLAIN sans plan");
    if (plan["Execution Time"] < best.execution) best = { execution: plan["Execution Time"], planning: plan["Planning Time"] };
  }
  return best;
}

/**
 * Première page de la liste Commandes (06 E10, 07 J8) : LA requête de `documents/queries.ts` (`ordersListSql`),
 * vue « À livrer », sans filtre ni recherche, 50 documents (04 §15 règle 6) ; et la même page sous une recherche
 * étendue de deux mots, qui plie le texte de chaque commande (E10 zone 3).
 */
function firstOrdersPageSql(now: Date, q = ""): PrismaNamespace.Sql {
  return documentsSql.ordersListSql({
    view: "a-livrer",
    filter: null,
    search: { terms: searchTerms(q), phone: phoneDigitVariants(q) },
    limit: ORDERS_PAGE_SIZE,
    now,
  });
}

beforeAll(async () => {
  server = await loadServer();
  cookieJar.current = await freshStart(server);
  chiffres = await import("@/server/chiffres");
  sql = await import("@/server/chiffres/sql");
  documentsSql = await import("@/server/documents/sql");
  statsSql = await import("@/server/stats/sql");
  Prisma = (await import("@prisma/client")).Prisma;
  await server.prisma.$transaction(async (tx) => {
    for (const statement of GENERATE) await tx.$executeRawUnsafe(statement);
  });
  await server.prisma.$executeRawUnsafe("ANALYZE");
}, 120_000);

afterAll(async () => {
  await server?.prisma.$disconnect();
});

describe("performance des chiffres sur 10 × le volume réel (04 §15)", () => {
  it("le jeu généré a le volume annoncé et des chiffres non triviaux", async () => {
    const [counts] = await server.prisma.$queryRaw<Record<string, number>[]>`
      SELECT (SELECT count(*)::int FROM "SaleDocument") AS documents, (SELECT count(*)::int FROM "SaleLine") AS lines,
             (SELECT count(*)::int FROM "Payment") AS payments, (SELECT count(*)::int FROM "CashMovement") AS movements,
             (SELECT count(*)::int FROM "Pocket") AS pockets, (SELECT count(*)::int FROM "Customer") AS customers,
             (SELECT count(*)::int FROM "Batch") AS batches, (SELECT count(*)::int FROM "Perfume") AS perfumes`;
    expect(counts).toEqual({ documents: 350, lines: 600, payments: 290, movements: 730, pockets: 60, customers: 290, batches: 30, perfumes: 2810 });

    const dashboard = await chiffres.tableauDeBord();
    expect(dashboard.enRetard).toBeGreaterThan(0);
    expect(dashboard.clientsARelancer).toBeGreaterThan(0);
    expect(dashboard.coutACompleter).toBeGreaterThan(0);
    expect(dashboard.commandes.enAttente + dashboard.commandes.confirmees).toBeGreaterThan(0);
    expect((await chiffres.aEncaisserDetail()).length).toBeGreaterThan(50);
  });

  it(`tableauDeBord(), aEncaisserDetail(), la première page des commandes et les lectures de l'Accueil (J14) : exécution SQL < ${BUDGET_MS} ms`, async () => {
    const now = new Date();
    const measures = {
      tableauDeBord: await explain(sql.tableauDeBordSql(now)),
      aEncaisserDetail: await explain(sql.receivablesSql(now)),
      premierePageCommandes: await explain(firstOrdersPageSql(now)),
      premierePageCommandesRecherche: await explain(firstOrdersPageSql(now, "client parfum")),
      // J14 — les deux autres requêtes de l'Accueil : ses comptes (zone 4, vide de départ, lots) et le
      // classement du mois (zone 8). L'Accueil ne paie que ces trois allers-retours, plus les lots.
      accueilComptes: await explain(statsSql.accueilComptesSql(now)),
      classementDuMois: await explain(statsSql.classementSql({ kind: "calendar", unit: "month", ref: null, offset: 0 }, now, 5)),
      classementDepuisToujours: await explain(statsSql.classementSql({ kind: "all" }, now, 20)),
      lotsOuverts: await explain(statsSql.lotsOuvertsSql(3)),
      recapDuJour: await explain(statsSql.documentsDuJourSql(null, now)),
    };
    // La requête mesurée est bien celle de l'écran : elle rend la première page de la vue.
    const rows = await server.prisma.$queryRaw<{ id: string; totalCount: number }[]>(firstOrdersPageSql(now));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(ORDERS_PAGE_SIZE);
    console.log(
      `EXPLAIN ANALYZE (meilleur de 5, ms) : ${Object.entries(measures)
        .map(([name, m]) => `${name} exécution ${m.execution.toFixed(2)} · planification ${m.planning.toFixed(2)}`)
        .join(" ; ")}`,
    );
    for (const [name, measure] of Object.entries(measures)) {
      expect(measure.execution, name).toBeLessThan(BUDGET_MS);
    }
  });
});
