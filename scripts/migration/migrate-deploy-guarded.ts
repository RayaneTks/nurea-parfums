/**
 * Garde du build : les migrations de la refonte ne s'appliquent jamais par accident
 * (docs/refonte/07-PLAN-EXECUTION.md §2.3). Appelée par `npm run build`, avant `next build`.
 *
 * 1. `NUREA_SKIP_MIGRATE_DEPLOY=1` : ne touche pas la base (build préconstruite) ;
 * 2. sinon, liste les dossiers de `prisma/migrations/` absents (ou non terminés) de `_prisma_migrations` ;
 * 3. si l'un d'eux finit par `_refonte_expand` ou `_refonte_contract` : échec du build ;
 * 4. sinon, `prisma migrate deploy`.
 *
 * La base est lue dans l'environnement du processus (`DIRECT_URL`, sinon `DATABASE_URL`) et jamais
 * dans `.env`, qui pointe sur la production : sans variable explicite, la garde échoue au lieu de
 * laisser Prisma s'y rabattre. Supprimée au jalon N (07 §3.6).
 *
 * PIÈGE : importer `@prisma/client` charge `.env` dans `process.env`. L'environnement est donc lu
 * AVANT tout import de Prisma (import dynamique plus bas), jamais après.
 */
import { hostOf } from "../lib/garde-hote";
import { listMigrationFolders, runPrisma } from "./lib/prisma-cli";

const EXPLICIT_URL = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const SKIP = process.env.NUREA_SKIP_MIGRATE_DEPLOY === "1";

const REFONTE_PENDING_MESSAGE =
  "Migration de la refonte en attente : elle s'applique à la main (docs/refonte/07-PLAN-EXECUTION.md §1.6), jamais par un build.";

async function appliedMigrations(url: string): Promise<Set<string>> {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ datasourceUrl: url });
  try {
    const [table] = await prisma.$queryRawUnsafe<{ present: boolean }[]>(
      `SELECT to_regclass('_prisma_migrations') IS NOT NULL AS present`,
    );
    if (!table?.present) return new Set();
    const rows = await prisma.$queryRawUnsafe<{ migration_name: string }[]>(
      `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
    );
    return new Set(rows.map((row) => row.migration_name));
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<number> {
  if (SKIP) {
    console.log("migrate-deploy-guarded — migrations non appliquées (build préconstruite).");
    return 0;
  }

  const url = EXPLICIT_URL;
  if (!url) {
    console.error(
      "migrate-deploy-guarded — ni DIRECT_URL ni DATABASE_URL dans l'environnement : refus de laisser " +
        "Prisma lire .env (production). Fournir la base explicitement, ou NUREA_SKIP_MIGRATE_DEPLOY=1.",
    );
    return 1;
  }

  const applied = await appliedMigrations(url);
  const pending = listMigrationFolders().filter((name) => !applied.has(name));
  const refonte = pending.filter((name) => /_refonte_(expand|contract)$/.test(name));

  if (refonte.length > 0) {
    console.error(REFONTE_PENDING_MESSAGE);
    console.error(`En attente sur ${hostOf(url)} : ${refonte.join(", ")}`);
    return 1;
  }

  console.log(
    pending.length === 0
      ? `migrate-deploy-guarded — aucune migration en attente sur ${hostOf(url)}.`
      : `migrate-deploy-guarded — ${pending.length} migration(s) ordinaire(s) en attente sur ${hostOf(url)} : ${pending.join(", ")}`,
  );
  return runPrisma(["migrate", "deploy"], url);
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error("migrate-deploy-guarded — échec :", error);
    process.exit(1);
  },
);
