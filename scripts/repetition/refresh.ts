/**
 * Répétition à blanc de la bascule — VARIANTE LOCALE (docs/refonte/07-PLAN-EXECUTION.md §2.2, §2.4).
 * Il n'existe pas encore de projet Supabase de préproduction : la cible est une base PostgreSQL LOCALE.
 *
 *   npm run repetition:refresh -- --from-production            [--sans-migration] [--out <dossier>] [--precedent <rapport.json>]
 *   npm run repetition:refresh -- --from-snapshot <dossier>    [--sans-migration] [--out <dossier>] [--precedent <rapport.json>]
 *
 * Cible : `DIRECT_URL`, sinon `DATABASE_URL`, lues dans l'environnement du processus. Refusée sans
 * exception si l'une de ces variables désigne la production, si l'hôte n'est pas local, ou si la base
 * ne s'appelle pas `nurea_repetition…` / `nurea_test…` (elle est détruite puis recréée).
 *
 * Source :
 * - `--from-production` : URL lue dans `SOURCE_DATABASE_URL` (jamais dans `.env`). Instantané extrait en
 *   lecture seule stricte (lib/instantane.ts : BEGIN … READ ONLY, SELECT, ROLLBACK — rien d'autre) vers
 *   `<out>/instantane/` ;
 * - `--from-snapshot <dossier>` : rejoue un instantané existant (empreintes vérifiées).
 *
 * Étapes, chronométrées : restauration (base UTF-8, migrations anciennes une par une, données) ; puis,
 * sauf `--sans-migration` : reference → migration:sql refonte_expand → migration:reprise --apply →
 * migration:sql refonte_contract → migration:verify ; enfin comparaison au rapport précédent.
 * Sorties : `<out>/repetition-<HHMMSS>/` (reference.json, rapport.*, verification.*, comparaison.*,
 * durees.json), `<out>` valant par défaut migration-artifacts/<date>/. Code non nul au moindre échec.
 */
import fs from "node:fs";
import path from "node:path";
import { HostRefusedError, isProductionUrl } from "../lib/garde-hote";
import { ecrireFichier, heureLocale, json, resoudreEntree, resoudreSortie } from "../migration/lib/artefacts";
import { ErreurUsage, lireArguments } from "../migration/lib/cli";
import type { Rapport } from "../migration/reprise/rapport";
import { comparaisonMarkdown, comparerRapports } from "./lib/comparaison";
import { assertCibleLocale, nomDeBase } from "./lib/garde-cible";
import { extraireInstantane, lireManifeste } from "./lib/instantane";
import { environnementPour, lancerScript } from "./lib/processus";
import { appliquerAncienSchema, chargerInstantane, recreerBase } from "./lib/restauration";

// Lu AVANT tout import de @prisma/client (chargé plus tard par la restauration), qui verse `.env`
// — la production — dans process.env.
const ENV_INITIAL: NodeJS.ProcessEnv = { ...process.env };
const URL_CIBLE = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const URLS_CIBLE_DECLAREES = [process.env.DIRECT_URL, process.env.DATABASE_URL];
const URL_SOURCE = process.env.SOURCE_DATABASE_URL;

const USAGE = "repetition:refresh";

interface Duree {
  etape: string;
  ms: number;
}

function formaterDuree(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function afficherDurees(durees: readonly Duree[]): void {
  console.log(`${USAGE} — durées :`);
  for (const d of durees) console.log(`  ${d.etape.padEnd(24)} ${formaterDuree(d.ms)}`);
  console.log(`  ${"total".padEnd(24)} ${formaterDuree(durees.reduce((acc, d) => acc + d.ms, 0))}`);
}

async function chronometrer<T>(durees: Duree[], etape: string, action: () => T | Promise<T>): Promise<T> {
  console.log(`${USAGE} — ${etape}…`);
  const debut = Date.now();
  try {
    return await action();
  } finally {
    durees.push({ etape, ms: Date.now() - debut });
  }
}

function memeBase(a: string, b: string): boolean {
  const ua = new URL(a);
  const ub = new URL(b);
  const hote = (h: string) => (["localhost", "127.0.0.1", "::1", "[::1]"].includes(h) ? "local" : h);
  return hote(ua.hostname) === hote(ub.hostname) && (ua.port || "5432") === (ub.port || "5432") && nomDeBase(a) === nomDeBase(b);
}

function rapportPrecedent(racine: string, dossierCourant: string): string | null {
  const parent = path.dirname(racine);
  if (!fs.existsSync(parent)) return null;
  const candidats: string[] = [];
  for (const date of fs.readdirSync(parent)) {
    const dossierDate = path.join(parent, date);
    if (!fs.statSync(dossierDate).isDirectory()) continue;
    for (const run of fs.readdirSync(dossierDate)) {
      const rapport = path.join(dossierDate, run, "rapport.json");
      if (run.startsWith("repetition-") && path.join(dossierDate, run) !== dossierCourant && fs.existsSync(rapport)) {
        candidats.push(rapport);
      }
    }
  }
  return candidats.sort().at(-1) ?? null;
}

async function main(): Promise<number> {
  // 1. Garde de la cible, avant toute autre chose : aucune connexion n'est ouverte avant elle.
  for (const declaree of URLS_CIBLE_DECLAREES) {
    if (declaree && isProductionUrl(declaree)) {
      throw new HostRefusedError(`${USAGE} : cible refusée, DATABASE_URL ou DIRECT_URL désigne la production.`);
    }
  }
  const cible = assertCibleLocale(URL_CIBLE, USAGE);

  const args = lireArguments(process.argv.slice(2), {
    drapeaux: ["--from-production", "--sans-migration"],
    valeurs: ["--from-snapshot", "--from-dump", "--out", "--precedent"],
  });
  if (args.valeurs.has("--from-dump")) {
    throw new ErreurUsage("--from-dump appartient à la variante Supabase (pg_dump) ; la variante locale rejoue un instantané : --from-snapshot <dossier>.");
  }
  const depuisProduction = args.drapeaux.has("--from-production");
  const instantaneFourni = args.valeurs.get("--from-snapshot");
  if (depuisProduction === (instantaneFourni !== undefined)) {
    throw new ErreurUsage("indiquer exactement une source : --from-production ou --from-snapshot <dossier>.");
  }

  const racine = resoudreSortie(args.valeurs.get("--out"));
  let dossierRun = path.join(racine, `repetition-${heureLocale()}`);
  for (let i = 2; fs.existsSync(dossierRun); i += 1) dossierRun = path.join(racine, `repetition-${heureLocale()}-${i}`);
  const durees: Duree[] = [];
  console.log(`${USAGE} — cible ${cible.hote}:${cible.port}/${cible.base} · sorties ${dossierRun}`);

  // 2. Source.
  let dossierInstantane: string;
  if (depuisProduction) {
    if (!URL_SOURCE) throw new ErreurUsage("--from-production lit l'URL source dans SOURCE_DATABASE_URL, absente.");
    if (memeBase(URL_SOURCE, cible.url)) throw new HostRefusedError(`${USAGE} : la source et la cible sont la même base.`);
    dossierInstantane = path.join(racine, "instantane");
    if (fs.existsSync(dossierInstantane) && fs.readdirSync(dossierInstantane).length > 0) {
      fs.renameSync(dossierInstantane, path.join(racine, `instantane-${heureLocale()}`));
    }
    const source = URL_SOURCE;
    const { manifeste } = await chronometrer(durees, "extraction (lecture seule)", () =>
      extraireInstantane(source, dossierInstantane),
    );
    console.log(`  ${manifeste.tables.length} tables extraites de ${manifeste.source.hote} : ${dossierInstantane}`);
  } else {
    dossierInstantane = resoudreEntree(instantaneFourni as string);
  }
  const manifeste = lireManifeste(dossierInstantane);

  // 3. Restauration.
  await chronometrer(durees, "restauration : base", () => recreerBase(cible.url));
  await chronometrer(durees, "restauration : schéma", () => appliquerAncienSchema(cible.url, (l) => console.log(l)));
  const bilan = await chronometrer(durees, "restauration : données", () =>
    chargerInstantane(cible.url, dossierInstantane, manifeste),
  );
  for (const t of bilan.tables) console.log(`  ${t.nom.padEnd(28)} ${t.lignes}`);
  if (bilan.historiqueAbsent.length > 0) {
    console.warn(
      `${USAGE} — migrations appliquées à la cible mais absentes de l'historique de la source (attendu : les deux « socle ») : ${bilan.historiqueAbsent.join(", ")}`,
    );
  }

  if (args.drapeaux.has("--sans-migration")) {
    ecrireFichier(path.join(dossierRun, "durees.json"), json(durees));
    afficherDurees(durees);
    console.log(`${USAGE} — base restaurée, non migrée (--sans-migration).`);
    return 0;
  }

  // 4. Chaîne de la bascule, scripts réels, dans des processus séparés.
  const env = environnementPour(cible.url, ENV_INITIAL);
  const reference = path.join(dossierRun, "reference.json");
  const chaine: [string, string, string[]][] = [
    ["reference", "scripts/migration/reference.ts", ["--out", dossierRun]],
    ["expand", "scripts/migration/apply-sql-migration.ts", ["refonte_expand"]],
    ["reprise --apply", "scripts/migration/reprise.ts", ["--apply", "--reference", reference, "--report", dossierRun]],
    ["contract", "scripts/migration/apply-sql-migration.ts", ["refonte_contract"]],
    ["verify", "scripts/migration/verify-post.ts", ["--reference", reference, "--report", dossierRun]],
  ];
  for (const [etape, script, argsScript] of chaine) {
    const execution = await chronometrer(durees, etape, () => lancerScript(script, argsScript, env, { capturer: false }));
    if (execution.code !== 0) {
      ecrireFichier(path.join(dossierRun, "durees.json"), json(durees));
      afficherDurees(durees);
      console.error(`${USAGE} — échec à l'étape « ${etape} » (code ${execution.code}).`);
      return 1;
    }
  }

  // 5. Comparaison au rapport précédent.
  const courant = JSON.parse(fs.readFileSync(path.join(dossierRun, "rapport.json"), "utf8")) as Rapport;
  const cheminPrecedent = args.valeurs.get("--precedent")
    ? resoudreEntree(args.valeurs.get("--precedent") as string)
    : rapportPrecedent(racine, dossierRun);
  if (cheminPrecedent) {
    const precedent = JSON.parse(fs.readFileSync(cheminPrecedent, "utf8")) as Rapport;
    const comparaison = comparerRapports(cheminPrecedent, precedent, courant);
    ecrireFichier(path.join(dossierRun, "comparaison.json"), json(comparaison));
    ecrireFichier(path.join(dossierRun, "comparaison.md"), comparaisonMarkdown(comparaison));
    console.log(
      `${USAGE} — comparaison à ${cheminPrecedent} : ${comparaison.nouveautes ? "NOUVEAUTÉS à expliquer (comparaison.md)" : "aucune nouveauté"}`,
    );
  } else {
    console.log(`${USAGE} — aucun rapport précédent : première répétition.`);
  }

  ecrireFichier(path.join(dossierRun, "durees.json"), json(durees));
  afficherDurees(durees);
  console.log(`${USAGE} — chaîne complète verte. Rapport : ${path.join(dossierRun, "rapport.md")}`);
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
