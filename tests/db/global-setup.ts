import { execSync } from "node:child_process";
import { assertNotProduction } from "../../scripts/lib/garde-hote";

/**
 * Remet la base de test à zéro et y applique toutes les migrations, une fois par
 * exécution du projet `db` (docs/refonte/04-ARCHITECTURE.md §16.1).
 */
export default function setup(): void {
  const url = assertNotProduction(process.env.TEST_DATABASE_URL, "Tests sur base réelle");
  execSync("npx prisma migrate reset --force --skip-seed --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  });
}
