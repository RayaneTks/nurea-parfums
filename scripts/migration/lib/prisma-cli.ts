/**
 * Lancement du CLI Prisma par les scripts de migration (docs/refonte/07-PLAN-EXECUTION.md §2.2).
 *
 * Le CLI est exécuté par `node` directement (pas de `npx`, pas de shell) : aucune URL de base ne
 * passe par un interpréteur de commandes ni par la ligne de commande. L'URL est transmise par
 * l'environnement, en `DATABASE_URL` ET `DIRECT_URL` : Prisma lit `.env` (la production) pour
 * toute variable absente, et ses commandes de migration préfèrent `DIRECT_URL`.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const MIGRATIONS_DIR = path.join(PROJECT_ROOT, "prisma", "migrations");
const PRISMA_CLI = path.join(PROJECT_ROOT, "node_modules", "prisma", "build", "index.js");

/** Exécute `prisma <args>` contre `databaseUrl` ; renvoie le code de sortie. */
export function runPrisma(args: readonly string[], databaseUrl: string): number {
  const result = spawnSync(process.execPath, [PRISMA_CLI, ...args], {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

/** Dossiers de `prisma/migrations/` qui contiennent un `migration.sql`, dans l'ordre d'application. */
export function listMigrationFolders(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(MIGRATIONS_DIR, entry.name, "migration.sql")))
    .map((entry) => entry.name)
    .sort();
}
