/**
 * Charge les modules serveur de la gestion (`src/server/**`) contre la base de test.
 *
 * `src/lib/db/prisma.ts` construit son client sur `process.env.DATABASE_URL`, et `@prisma/client`
 * charge `.env` (la production) dès son import sans écraser une variable déjà posée. On pose donc
 * l'URL de test AVANT tout import, puis on vérifie sur la connexion elle-même qu'on parle bien à la
 * base de test avant de rendre la main.
 *
 * Chaque fichier de test appelant ce module déclare `vi.mock("server-only", () => ({}))` : le
 * paquet lève hors de la condition `react-server`.
 */
import { assertNotProduction } from "../../../scripts/lib/garde-hote";

// Lu AVANT tout import de @prisma/client.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

export const TEST_JWT_SECRET = "secret-de-test-local-au-moins-24-caracteres";

let verified: Promise<void> | undefined;

async function pinTestDatabase(): Promise<void> {
  const url = assertNotProduction(TEST_DATABASE_URL, "Tests sur base réelle");
  process.env.DATABASE_URL = url;
  process.env.DIRECT_URL = url;
  process.env.ADMIN_JWT_SECRET ??= TEST_JWT_SECRET;
  const { prisma } = await import("@/lib/db/prisma");
  const [row] = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
  const expected = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  if (process.env.DATABASE_URL !== url || row?.db !== expected || !expected.startsWith("nurea_test")) {
    throw new Error(`Tests sur base réelle : le client serveur n'est pas branché sur la base de test (${row?.db}).`);
  }
}

/** À attendre dans `beforeAll`, avant tout import dynamique d'un module `src/server`. */
export function useTestDatabaseForServer(): Promise<void> {
  verified ??= pinTestDatabase();
  return verified;
}

/** Magasin de cookies en mémoire, forme minimale de `cookies()` de `next/headers`. */
export function memoryCookies() {
  const jar = new Map<string, string>();
  return {
    jar,
    store: {
      get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) as string } : undefined),
      set: (name: string, value: string) => void jar.set(name, value),
      delete: (name: string) => void jar.delete(name),
    },
  };
}
