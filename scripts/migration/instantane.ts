/**
 * Instantané de l'ancien monde, la source du RETOUR ARRIÈRE (docs/refonte/07-PLAN-EXECUTION.md §1.7).
 *
 *   npm run migration:instantane -- [--out <dossier>] [--confirm-host <hôte>]
 *
 * Le jour J, cette commande est l'étape B2b : elle est jouée **après le gel** et **avant l'expand**,
 * sur la base qu'on s'apprête à migrer. Ce qu'elle écrit est le seul filet dont `migration:rollback`
 * ait besoin — ni `pg_restore` ni `psql`, absents du poste d'exploitation.
 *
 * Lecture seule STRICTE, et c'est le cœur du sujet : la connexion n'envoie que
 * `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`, la liste des tables de `public`, un
 * `SELECT row_to_json(t)` par table (`_prisma_migrations` comprise) et `ROLLBACK`
 * (`scripts/repetition/lib/pg-lecture-seule.ts` : un client PostgreSQL minimal, sans Prisma, qui ne
 * sait rien envoyer d'autre). Les lignes sont écrites telles que PostgreSQL les rend — aucun montant
 * ne passe par un nombre JavaScript.
 *
 * Sorties : `<dossier>/manifest.json` et un `<n>-<table>.ndjson` par table, chacun avec son empreinte
 * SHA-256 ; `migration:rollback` les vérifie avant d'écrire quoi que ce soit. Le dossier doit être
 * vide (un instantané ne s'écrase jamais).
 *
 * Base visée : `DIRECT_URL`, sinon `DATABASE_URL`, lues dans l'environnement du processus — jamais
 * `.env`. La production n'est acceptée qu'avec `--confirm-host` reproduisant exactement son hôte.
 */
import path from "node:path";
import { hostOf } from "../lib/garde-hote";
import { extraireInstantane } from "../repetition/lib/instantane";
import { ecrireFichier, json, resoudreSortie } from "./lib/artefacts";
import { HostRefusedError, lireCible } from "./lib/base";
import { ErreurUsage, lireArguments } from "./lib/cli";

const USAGE = "migration:instantane";

async function main(): Promise<number> {
  const args = lireArguments(process.argv.slice(2), { valeurs: ["--out", "--confirm-host"] });
  const url = lireCible(USAGE, args.valeurs.get("--confirm-host"));
  const dossier = path.join(resoudreSortie(args.valeurs.get("--out")), "instantane");

  console.log(`${USAGE} — source ${hostOf(url)} · sortie ${dossier}`);
  const debut = Date.now();
  const { manifeste, journal } = await extraireInstantane(url, dossier);
  const ms = Date.now() - debut;

  // Le journal des instructions envoyées est archivé avec l'instantané : il est la preuve que la
  // lecture n'a rien écrit, et il se relit des mois plus tard sans rejouer quoi que ce soit.
  ecrireFichier(path.join(dossier, "journal.json"), json({ instructions: journal, ms }));

  for (const table of manifeste.tables) console.log(`  ${table.nom.padEnd(28)} ${table.lignes}`);
  const total = manifeste.tables.reduce((acc, t) => acc + t.lignes, 0);
  console.log(`${USAGE} — ${manifeste.tables.length} tables, ${total} lignes, ${(ms / 1000).toFixed(1)} s`);
  console.log(`${USAGE} — retour arrière : npm run migration:rollback -- --instantane ${dossier}`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    if (error instanceof HostRefusedError || error instanceof ErreurUsage) {
      console.error(`${USAGE} — ${error.message}`);
    } else {
      console.error(`${USAGE} — échec :`, error);
    }
    process.exit(1);
  },
);
