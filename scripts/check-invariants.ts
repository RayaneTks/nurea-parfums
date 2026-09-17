/**
 * `npm run check:invariants` — les invariants de l'argent vérifiables en une requête
 * (docs/refonte/03-MODELE-DONNEES.md §5.7), en lecture seule :
 *
 *   1. Σ payé de tous les documents (vue `DocumentBalance`) = Σ des mouvements `PAYMENT` ;
 *   2. chaque groupe de transfert compte deux jambes de somme nulle ;
 *   3. toute poche archivée a un solde nul.
 *
 * Version de base (J6). La version complète, avec `--chiffres` (chiffres canoniques de `src/server/chiffres`),
 * est livrée à J7 (07 J7).
 *
 * Cible : `DATABASE_URL`, lue AVANT l'import de Prisma — qui chargerait sinon `.env`, c'est-à-dire la
 * production. Sans variable : refus. Production : `--confirm-host <hôte>` exigé (garde partagée des scripts).
 * Sortie 0 si tout est vert, 1 sinon.
 *
 *   DATABASE_URL=postgresql://nurea:nurea@localhost:54329/nurea_test npm run check:invariants
 */
import { pathToFileURL } from "node:url";
import type { PrismaClient } from "@prisma/client";
import { HostRefusedError, assertHostConfirmed, hostOf } from "./lib/garde-hote";

// Lu avant tout import de @prisma/client.
const DATABASE_URL = process.env.DATABASE_URL;

/** Client de requêtes brutes : un `PrismaClient` ou le client d'une transaction. */
export type InvariantReader = Pick<PrismaClient, "$queryRawUnsafe">;

export type InvariantResult = {
  name: string;
  ok: boolean;
  /** Une ligne par écart, lisible telle quelle. */
  details: string[];
};

type Invariant = { name: string; check: (db: InvariantReader) => Promise<string[]> };

export const INVARIANTS: readonly Invariant[] = [
  {
    name: "Σ payé des documents = Σ des mouvements PAYMENT",
    async check(db) {
      const [row] = await db.$queryRawUnsafe<{ paid: string; movements: string }[]>(
        `SELECT (SELECT COALESCE(SUM(paid), 0) FROM "DocumentBalance")::numeric(14,2)::text AS paid,
                (SELECT COALESCE(SUM(amount), 0) FROM "CashMovement" WHERE kind = 'PAYMENT')::numeric(14,2)::text AS movements`,
      );
      return row && row.paid === row.movements ? [] : [`payé ${row?.paid} € ≠ mouvements PAYMENT ${row?.movements} €`];
    },
  },
  {
    name: "chaque transfert a deux jambes de somme nulle",
    async check(db) {
      const rows = await db.$queryRawUnsafe<{ group: string; legs: number; total: string }[]>(
        `SELECT "transferGroupId" AS "group", count(*)::int AS legs, SUM(amount)::numeric(14,2)::text AS total
         FROM "CashMovement"
         WHERE kind = 'TRANSFER'
         GROUP BY "transferGroupId"
         HAVING count(*) <> 2 OR SUM(amount) <> 0
         ORDER BY "transferGroupId"`,
      );
      return rows.map((row) => `transfert ${row.group} : ${row.legs} jambe(s), somme ${row.total} €`);
    },
  },
  {
    name: "toute poche archivée a un solde nul",
    async check(db) {
      const rows = await db.$queryRawUnsafe<{ id: string; name: string; balance: string }[]>(
        `SELECT p.id, p.name, (p."openingBalance" + COALESCE(SUM(m.amount), 0))::numeric(14,2)::text AS balance
         FROM "Pocket" p
         LEFT JOIN "CashMovement" m ON m."pocketId" = p.id
         WHERE p.archived
         GROUP BY p.id
         HAVING p."openingBalance" + COALESCE(SUM(m.amount), 0) <> 0
         ORDER BY p.id`,
      );
      return rows.map((row) => `poche archivée « ${row.name} » (${row.id}) : solde ${row.balance} €`);
    },
  },
];

export async function checkInvariants(db: InvariantReader): Promise<InvariantResult[]> {
  const results: InvariantResult[] = [];
  for (const invariant of INVARIANTS) {
    const details = await invariant.check(db);
    results.push({ name: invariant.name, ok: details.length === 0, details });
  }
  return results;
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<number> {
  if (!DATABASE_URL) {
    console.error("check:invariants : DATABASE_URL requise (jamais lue dans .env, qui désigne la production).");
    return 1;
  }
  const url = assertHostConfirmed(DATABASE_URL, argument("--confirm-host"), "check:invariants");
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    const results = await checkInvariants(db);
    console.log(`Invariants de l'argent (03 §5.7) — ${hostOf(url)}`);
    for (const result of results) {
      console.log(`${result.ok ? "✓" : "✗"} ${result.name}`);
      for (const detail of result.details) console.log(`    ${detail}`);
    }
    return results.every((result) => result.ok) ? 0 : 1;
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
      console.error(error instanceof HostRefusedError ? error.message : error);
      process.exit(1);
    });
}
