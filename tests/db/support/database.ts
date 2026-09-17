/**
 * Accès à la base de test pour le projet Vitest `db` (docs/refonte/04-ARCHITECTURE.md §16.1).
 *
 * SQL brut autorisé ici (tests/), jamais dans src/. La base est migrée par tests/db/global-setup.ts ;
 * chaque fichier la remet à zéro par TRUNCATE (qui ne déclenche pas les triggers d'écriture seule).
 */
import type { PrismaClient } from "@prisma/client";
import { assertNotProduction } from "../../../scripts/lib/garde-hote";

// Lu AVANT tout import de @prisma/client, qui charge `.env` (la production) dans process.env.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

export type TestDatabase = PrismaClient;

export async function connectTestDatabase(): Promise<TestDatabase> {
  const url = assertNotProduction(TEST_DATABASE_URL, "Tests sur base réelle");
  const { PrismaClient } = await import("@prisma/client");
  return new PrismaClient({ datasourceUrl: url });
}

/** Vide toutes les tables de `public` (hors historique des migrations), séquences comprises. */
export async function resetDatabase(db: TestDatabase): Promise<void> {
  const tables = await db.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  );
  if (tables.length === 0) return;
  const list = tables.map(({ tablename }) => `"${tablename.replaceAll('"', '""')}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

/** Valeur SQL écrite telle quelle (fonction, expression). */
export interface RawSql {
  readonly raw: string;
}
export const sql = (raw: string): RawSql => ({ raw });
export const NOW = sql("now()");

export type SqlValue = string | number | boolean | null | RawSql;
export type Row = Record<string, SqlValue>;

/**
 * Littéral SQL. Les chaînes restent non typées : PostgreSQL les convertit selon la colonne
 * (enum, numeric, timestamptz), ce que des paramètres liés typés `text` ne permettraient pas.
 */
function literal(value: SqlValue): string {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
  return value.raw;
}

export function insertSql(table: string, row: Row): string {
  const columns = Object.keys(row).map((column) => `"${column}"`).join(", ");
  const values = Object.values(row).map(literal).join(", ");
  return `INSERT INTO "${table}" (${columns}) VALUES (${values})`;
}

/** Client de requêtes brutes : le client racine ou celui d'une transaction interactive. */
export type SqlRunner = Pick<TestDatabase, "$executeRawUnsafe">;

export function insert(runner: SqlRunner, table: string, row: Row): Promise<number> {
  return runner.$executeRawUnsafe(insertSql(table, row));
}
