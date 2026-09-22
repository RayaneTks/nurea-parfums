/**
 * Applique à la main UNE migration de la refonte (docs/refonte/07-PLAN-EXECUTION.md §2.2, §1.6 B5 et B7).
 *
 *   npm run migration:sql -- refonte_expand   [--confirm-host <hôte>]
 *   npm run migration:sql -- refonte_contract [--confirm-host <hôte>]
 *
 * 1. `prisma db execute --file prisma/migrations/<nom>/migration.sql` — le fichier est enveloppé
 *    dans BEGIN; … COMMIT; : un échec n'écrit rien ;
 * 2. `prisma migrate resolve --applied <nom>` — la migration est enregistrée dans
 *    `_prisma_migrations`, le build ne la rejouera pas.
 *
 * Base visée : `DIRECT_URL`, sinon `DATABASE_URL`, lues dans l'environnement du processus
 * (ce script ne lit jamais `.env`). La production n'est acceptée qu'avec `--confirm-host`
 * reproduisant exactement son hôte (scripts/lib/garde-hote.ts).
 */
import path from "node:path";
import { HostRefusedError, assertHostConfirmed, hostOf } from "../lib/garde-hote";
import { MIGRATIONS_DIR, listMigrationFolders, runPrisma } from "./lib/prisma-cli";

const SUFFIXES = ["refonte_expand", "refonte_contract"] as const;
type Suffix = (typeof SUFFIXES)[number];

function fail(message: string): never {
  console.error(`migration:sql — ${message}`);
  process.exit(1);
}

function parseArgs(argv: readonly string[]): { suffix: Suffix; confirmHost: string | undefined } {
  let suffix: string | undefined;
  let confirmHost: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--confirm-host") {
      confirmHost = argv[i + 1];
      if (!confirmHost) fail("--confirm-host attend un hôte.");
      i += 1;
    } else if (arg === "--rollback") {
      fail(
        "le retour arrière est une commande à part, qui n'a besoin ni de pg_restore ni de psql : " +
          "npm run migration:rollback -- --instantane <dossier> [--confirm-host <hôte>] " +
          "(docs/refonte/07-PLAN-EXECUTION.md §1.7).",
      );
    } else if (arg?.startsWith("--")) {
      fail(`option inconnue : ${arg}`);
    } else if (suffix === undefined) {
      suffix = arg;
    } else {
      fail(`argument en trop : ${arg}`);
    }
  }
  if (!suffix || !(SUFFIXES as readonly string[]).includes(suffix)) {
    fail(`usage : npm run migration:sql -- <${SUFFIXES.join(" | ")}> [--confirm-host <hôte>]`);
  }
  return { suffix: suffix as Suffix, confirmHost };
}

function main(): void {
  const { suffix, confirmHost } = parseArgs(process.argv.slice(2));

  const matches = listMigrationFolders().filter((name) => name.endsWith(`_${suffix}`));
  if (matches.length !== 1) {
    fail(`un et un seul dossier de prisma/migrations doit finir par _${suffix} (trouvés : ${matches.length}).`);
  }
  const name = matches[0] as string;

  let url: string;
  try {
    url = assertHostConfirmed(process.env.DIRECT_URL ?? process.env.DATABASE_URL, confirmHost, "migration:sql");
  } catch (error) {
    if (error instanceof HostRefusedError) fail(error.message);
    throw error;
  }

  console.log(`migration:sql — ${name} sur ${hostOf(url)}`);

  const file = path.join(MIGRATIONS_DIR, name, "migration.sql");
  const executed = runPrisma(["db", "execute", "--schema", "prisma/schema.prisma", "--file", file], url);
  if (executed !== 0) {
    fail(`échec de l'exécution de ${name} : rien n'est enregistré (la transaction du fichier est annulée).`);
  }

  const resolved = runPrisma(["migrate", "resolve", "--applied", name], url);
  if (resolved !== 0) {
    fail(
      `${name} est appliquée mais n'a pas pu être enregistrée dans _prisma_migrations : ` +
        `relancer « prisma migrate resolve --applied ${name} » sur la même base, sans rejouer le fichier.`,
    );
  }

  console.log(`migration:sql — ${name} appliquée et enregistrée.`);
}

main();
