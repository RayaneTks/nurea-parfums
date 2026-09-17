/**
 * Lancement des scripts de la chaîne (`tsx scripts/migration/*.ts`) et du CLI Prisma par la répétition
 * et par les tests, sans shell : aucune URL ne passe par la ligne de commande.
 *
 * L'environnement des enfants est construit, jamais hérité tel quel : `DATABASE_URL` et `DIRECT_URL`
 * valent la cible, `SOURCE_DATABASE_URL` est retirée. Raison : un processus qui a importé
 * `@prisma/client` a reçu tout `.env` (la production) dans `process.env` ; un enfant qui en hériterait
 * pourrait viser la production par `DIRECT_URL`.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { PROJECT_ROOT } from "../../migration/lib/prisma-cli";

const TSX_CLI = path.join(PROJECT_ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const PRISMA_CLI = path.join(PROJECT_ROOT, "node_modules", "prisma", "build", "index.js");

export interface Execution {
  code: number;
  sortie: string;
  erreurs: string;
  dureeMs: number;
}

export function environnementPour(urlCible: string, base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...base };
  delete env.SOURCE_DATABASE_URL;
  delete env.DATABASE_URL;
  delete env.DIRECT_URL;
  env.DATABASE_URL = urlCible;
  env.DIRECT_URL = urlCible;
  return env;
}

function lancer(args: readonly string[], env: NodeJS.ProcessEnv, capturer: boolean): Execution {
  const debut = Date.now();
  const resultat = spawnSync(process.execPath, args, {
    cwd: PROJECT_ROOT,
    env,
    encoding: "utf8",
    stdio: capturer ? "pipe" : "inherit",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (resultat.error) throw resultat.error;
  return {
    code: resultat.status ?? 1,
    sortie: resultat.stdout ?? "",
    erreurs: resultat.stderr ?? "",
    dureeMs: Date.now() - debut,
  };
}

/** `tsx <script> <args>` avec l'environnement donné (déjà construit par l'appelant). */
export function lancerScript(
  script: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
  options: { capturer?: boolean } = {},
): Execution {
  return lancer([TSX_CLI, path.join(PROJECT_ROOT, script), ...args], env, options.capturer ?? true);
}

/** `prisma <args>` contre `urlCible`, sortie capturée (rendue en cas d'échec). */
export function lancerPrisma(args: readonly string[], urlCible: string): Execution {
  return lancer([PRISMA_CLI, ...args], environnementPour(urlCible), true);
}
