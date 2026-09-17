import { defineConfig } from "vitest/config";
import path from "node:path";

const alias = {
  "@": path.resolve(__dirname, "./src"),
};

/**
 * Trois étages de tests (docs/refonte/04-ARCHITECTURE.md §16) :
 * - `unit` : domaine pur, contrats, hooks purs — aucune base ;
 * - `arch` : règles d'architecture, par lecture des sources — aucune base ;
 * - `db`   : PostgreSQL jetable (`TEST_DATABASE_URL`), fichiers exécutés un par un.
 *
 * `npm test` lance `unit` et `arch` ; `npm run test:db` lance `db`.
 */
export default defineConfig({
  resolve: { alias },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/domain/**/*.ts", "src/server/**/*.ts"],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: [
            "src/**/*.test.ts",
            "src/**/*.test.tsx",
            "src/**/__tests__/**/*.ts",
            "src/**/__tests__/**/*.tsx",
          ],
          exclude: ["node_modules", ".next", "e2e", "tests"],
        },
      },
      {
        extends: true,
        test: {
          name: "arch",
          include: ["tests/architecture/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          include: ["tests/db/**/*.test.ts"],
          globalSetup: ["tests/db/global-setup.ts"],
          // Un seul processus, fichiers l'un après l'autre : ils partagent la base et la vident par
          // TRUNCATE. `fileParallelism` n'est lu que dans la config racine (ignoré ici par Vitest 3.2).
          poolOptions: { forks: { singleFork: true } },
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
