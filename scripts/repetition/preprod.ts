/**
 * Remplit une préproduction DISTANTE avec les données réelles, migrées au schéma de la refonte
 * (docs/refonte/07-PLAN-EXECUTION.md §2.4 ; critère E-5 de `00-README.md`).
 *
 *   SOURCE_DATABASE_URL=<url de production> \
 *   DIRECT_URL=<url de la préproduction> \
 *   npm run repetition:preprod -- --confirm-host <hôte de la préproduction> [--instantane <dossier>] [--out <dossier>]
 *
 * Pourquoi une commande de plus, à côté de `repetition:refresh` : celle-ci vise une base **locale**
 * qu'elle DÉTRUIT puis recrée (`DROP DATABASE`). Sur une base gérée — Neon, Supabase — on ne peut ni
 * supprimer la base à laquelle on est connecté, ni la recréer. On vide donc les schémas `public` et
 * `legacy` **sans les supprimer** (`scripts/migration/lib/vidage.ts`, le même balayage que le retour
 * arrière de §1.7), puis on rebâtit l'ancien monde avant de rejouer la bascule.
 *
 * Les étapes, chronométrées, sont exactement celles du jour J (§1.6) :
 *
 *   instantané (lecture seule, sur la production) → vidage → ancien schéma → données
 *   → reference → expand → reprise --apply → contract → verify
 *
 * La production n'est JAMAIS écrite : elle n'est lue que par `extraireInstantane`, qui n'envoie que
 * `BEGIN … READ ONLY`, des `SELECT` et un `ROLLBACK`. Et la cible ne peut pas être la production :
 * la référence du projet de production y est refusée sans exception, `--confirm-host` ou non.
 */
import path from "node:path";
import { hostOf, isProductionUrl } from "../lib/garde-hote";
import { ecrireFichier, json, resoudreEntree, resoudreSortie } from "../migration/lib/artefacts";
import { HostRefusedError, ouvrirBase } from "../migration/lib/base";
import { ErreurUsage, lireArguments } from "../migration/lib/cli";
import { schemasPresents, viderSchemas } from "../migration/lib/vidage";
import { gardeHoteConfirme } from "./lib/garde-cible";
import { extraireInstantane, lireManifeste, type Manifeste } from "./lib/instantane";
import { environnementPour, lancerScript } from "./lib/processus";
import { appliquerAncienSchema, chargerInstantane } from "./lib/restauration";

// Lu AVANT tout import de @prisma/client, qui verse `.env` — la production — dans process.env.
const ENV_INITIAL: NodeJS.ProcessEnv = { ...process.env };
const URL_CIBLE = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const URL_SOURCE = process.env.SOURCE_DATABASE_URL;

const USAGE = "repetition:preprod";
const SCHEMAS = ["public", "legacy"] as const;

interface Duree {
  etape: string;
  ms: number;
}

function formater(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

async function chronometrer<T>(durees: Duree[], etape: string, action: () => T | Promise<T>): Promise<T> {
  console.log(`${USAGE} — ${etape}…`);
  const debut = Date.now();
  try {
    return await action();
  } finally {
    const ms = Date.now() - debut;
    durees.push({ etape, ms });
    console.log(`${USAGE} — ${etape} : ${formater(ms)}`);
  }
}

async function main(): Promise<number> {
  const args = lireArguments(process.argv.slice(2), { valeurs: ["--confirm-host", "--instantane", "--out"] });
  const confirmHost = args.valeurs.get("--confirm-host");
  if (!confirmHost) {
    throw new ErreurUsage("--confirm-host <hôte de la préproduction> est obligatoire : cette commande écrase la cible.");
  }

  const garde = gardeHoteConfirme(confirmHost);
  const cible = garde(URL_CIBLE, USAGE);

  // Garde sans exception : quoi qu'on confirme, la production n'est jamais une cible de remplissage.
  if (isProductionUrl(cible.url)) {
    throw new HostRefusedError(`${USAGE} : la cible est la PRODUCTION. Cette commande la viderait. Refus définitif.`);
  }

  const dossierSortie = resoudreSortie(args.valeurs.get("--out"));
  const durees: Duree[] = [];

  console.log(`${USAGE} — cible ${cible.hote} · base ${cible.base} · sorties ${dossierSortie}`);

  // 1. Instantané de l'ancien monde : fourni, ou extrait de la production en lecture seule stricte.
  let dossierInstantane: string;
  let manifeste: Manifeste;
  const fourni = args.valeurs.get("--instantane");
  if (fourni) {
    dossierInstantane = resoudreEntree(fourni);
    manifeste = lireManifeste(dossierInstantane);
    console.log(`${USAGE} — instantané fourni : ${dossierInstantane} (${manifeste.source.hote}/${manifeste.source.base})`);
  } else {
    if (!URL_SOURCE) {
      throw new ErreurUsage(
        "SOURCE_DATABASE_URL est obligatoire (l'URL de production, jamais lue dans `.env`), " +
          "ou passe --instantane <dossier> pour rejouer un instantané déjà pris.",
      );
    }
    if (hostOf(URL_SOURCE) === cible.hote) {
      throw new HostRefusedError(`${USAGE} : la source et la cible sont le même hôte. Refus.`);
    }
    dossierInstantane = path.join(dossierSortie, "instantane");
    const extraction = await chronometrer(durees, "instantané (lecture seule)", () =>
      extraireInstantane(URL_SOURCE, dossierInstantane),
    );
    manifeste = extraction.manifeste;
  }
  const lignes = manifeste.tables.reduce((acc, t) => acc + t.lignes, 0);
  console.log(`  ${manifeste.tables.length} tables, ${lignes} lignes`);

  // 2. Vidage de la cible, en UNE transaction : ni `public` ni `legacy` ne sont supprimés.
  const objets = await chronometrer(durees, "vidage de la cible", async () => {
    const db = await ouvrirBase(cible.url);
    try {
      const schemas = await schemasPresents(db, SCHEMAS);
      return await db.$transaction(
        async (tx) => {
          const resultat = await viderSchemas(tx, schemas);
          if (resultat.restants.length > 0) {
            throw new Error(
              `${USAGE} : objets encore présents après le balayage — ${resultat.restants
                .map((o) => `${o.schema}.${o.nom}`)
                .join(", ")}. Rien n'est vidé (transaction annulée).`,
            );
          }
          return resultat.objets;
        },
        { maxWait: 30_000, timeout: 30 * 60_000 },
      );
    } finally {
      await db.$disconnect();
    }
  });
  console.log(`  ${objets.length} objets supprimés`);

  // 3. L'ancien monde : migrations d'avant l'expand, puis les lignes de l'instantané.
  await chronometrer(durees, "ancien schéma", () => appliquerAncienSchema(cible.url, (l) => console.log(l), garde));
  const bilan = await chronometrer(durees, "données", () => chargerInstantane(cible.url, dossierInstantane, manifeste, garde));
  for (const t of bilan.tables) console.log(`  ${t.nom.padEnd(28)} ${t.lignes}`);

  // 4. La bascule, avec les scripts réels, dans des processus séparés — comme le jour J.
  const env = environnementPour(cible.url, ENV_INITIAL);
  const reference = path.join(dossierSortie, "reference.json");
  const chaine: [string, string, string[]][] = [
    ["reference", "scripts/migration/reference.ts", ["--out", dossierSortie]],
    ["expand", "scripts/migration/apply-sql-migration.ts", ["refonte_expand"]],
    ["reprise --apply", "scripts/migration/reprise.ts", ["--apply", "--reference", reference, "--report", dossierSortie]],
    ["contract", "scripts/migration/apply-sql-migration.ts", ["refonte_contract"]],
    ["verify", "scripts/migration/verify-post.ts", ["--reference", reference, "--report", dossierSortie]],
  ];
  for (const [etape, script, argsScript] of chaine) {
    const execution = await chronometrer(durees, etape, () =>
      lancerScript(script, [...argsScript, "--confirm-host", confirmHost], env, { capturer: false }),
    );
    if (execution.code !== 0) {
      ecrireFichier(path.join(dossierSortie, "durees.json"), json(durees));
      console.error(`${USAGE} — échec à l'étape « ${etape} » (code ${execution.code}).`);
      return 1;
    }
  }

  ecrireFichier(path.join(dossierSortie, "durees.json"), json(durees));
  console.log(`${USAGE} — durées :`);
  for (const d of durees) console.log(`  ${d.etape.padEnd(26)} ${formater(d.ms)}`);
  console.log(`  ${"total".padEnd(26)} ${formater(durees.reduce((a, d) => a + d.ms, 0))}`);
  console.log(`${USAGE} — préproduction remplie avec les données réelles. Rapport : ${dossierSortie}`);
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
