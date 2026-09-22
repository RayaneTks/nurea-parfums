import { assertNotProduction, HostRefusedError } from "../../scripts/lib/garde-hote";
import { runPrisma } from "../../scripts/migration/lib/prisma-cli";

// Lu avant tout import de @prisma/client, qui charge `.env` (la production) dans process.env.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Recrée la base de test puis y applique toutes les migrations, une fois par exécution du
 * projet `db` (docs/refonte/04-ARCHITECTURE.md §16.1).
 *
 * La base est détruite et recréée plutôt que remise à zéro par `prisma migrate reset` : on
 * obtient une base UTF-8 quel que soit l'encodage par défaut du serveur (une ancienne migration
 * contient des caractères que WIN1252 refuse). Cette destruction n'est permise que sur un
 * serveur local, dont la base porte un nom de test.
 */
export default async function setup(): Promise<void> {
  const url = new URL(assertNotProduction(TEST_DATABASE_URL, "Tests sur base réelle"));
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));

  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new HostRefusedError(
      `Tests sur base réelle : ${url.hostname} n'est pas un serveur local, la base de test n'y est jamais recréée.`,
    );
  }
  if (!/^nurea_test[a-z0-9_]*$/.test(databaseName)) {
    throw new HostRefusedError(
      `Tests sur base réelle : « ${databaseName} » ne porte pas un nom de base de test (nurea_test…).`,
    );
  }

  const maintenanceUrl = new URL(url);
  maintenanceUrl.pathname = "/postgres";
  const { PrismaClient } = await import("@prisma/client");
  const admin = new PrismaClient({ datasourceUrl: maintenanceUrl.toString() });
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin.$executeRawUnsafe(
      `CREATE DATABASE "${databaseName}" TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'`,
    );
  } finally {
    await admin.$disconnect();
  }

  const exitCode = runPrisma(["migrate", "deploy"], url.toString());
  if (exitCode !== 0) {
    throw new Error(`Tests sur base réelle : les migrations ont échoué (code ${exitCode}).`);
  }
}
