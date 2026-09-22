/**
 * Retour arrière de la bascule (docs/refonte/07-PLAN-EXECUTION.md §1.7, critère « Retour arrière
 * éprouvé » de J16). C'est le filet du jour J : sans lui, la reprise est irréversible.
 *
 *   npm run migration:rollback -- --instantane <dossier> [--reference <fichier>] [--out <dossier>] [--confirm-host <hôte>]
 *
 * Ne demande que **Node et le client Prisma** : ni `pg_restore`, ni `psql`, absents du poste
 * d'exploitation. La source n'est donc pas un dump binaire mais l'INSTANTANÉ JSON de l'ancien monde
 * (`scripts/repetition/lib/instantane.ts`), celui-là même qu'extrait la répétition en lecture seule
 * stricte — le jour J, il est pris en B4, juste avant l'expand.
 *
 * Quatre phases, chronométrées, avec un code de sortie non nul au moindre écart :
 *
 * 1. **vidage** (UNE transaction) : les schémas `public` ET `legacy` sont vidés de tous leurs objets
 *    — sans être supprimés : `public` porte les droits par défaut et les extensions posées par
 *    Supabase (raison écrite en §1.7), et l'expand recrée `legacy` par `CREATE SCHEMA IF NOT EXISTS`.
 *    Partent avec : la vue `DocumentBalance`, les fonctions `nurea_*`, les triggers, les types
 *    énumérés devenus orphelins, les tables neuves (`SaleDocument`, `SaleLine`, `Payment`, `Setting`)
 *    et les anciennes que le contract avait déplacées dans `legacy` (`scripts/migration/lib/vidage.ts`) ;
 * 2. **schéma** : les dossiers de `prisma/migrations/` qui PRÉCÈDENT `…_refonte_expand`, un par un
 *    (`prisma db execute` puis `migrate resolve --applied`) — l'ancien monde tel que le dépôt le décrit ;
 * 3. **données** (UNE transaction) : les lignes de l'instantané, dans l'ordre des clés étrangères,
 *    `_prisma_migrations` REMPLACÉE par celle de l'instantané (l'historique tel qu'il était : aucune
 *    des deux migrations de la refonte n'y figure), puis séquences remises à niveau ;
 * 4. **contrôle** : plus aucun objet de la refonte ; chaque table de l'instantané à son compte exact ;
 *    séquences au-dessus du plus grand identifiant ; et surtout la référence RECALCULÉE
 *    (`scripts/migration/reference.ts`, même instant de mesure) comparée au bloc `mesures` d'avant la
 *    bascule — **un centime d'écart et la commande sort en erreur**.
 *
 * Bloc `mesures` attendu, dans l'ordre : `--reference <fichier>` s'il est donné ; sinon la référence
 * que la reprise a insérée dans `legacy."MigrationReference"` (lue AVANT le vidage) ; sinon
 * `reference-attendue.json` du dossier de sortie, écrit par une exécution précédente. Car le vidage
 * emporte `legacy."MigrationReference"` : la référence attendue est recopiée dans le dossier de sortie
 * dès qu'elle est lue, et une relance après échec la retrouve là — la commande est relançable telle
 * quelle, l'instantané n'étant jamais modifié.
 *
 * Ce que ce retour arrière ne promet PAS : les phases 2 et 3 ne peuvent pas entrer dans la
 * transaction du vidage (le CLI Prisma applique chaque migration dans son propre processus). Entre la
 * fin du vidage et la fin du chargement, `public` est vide. C'est sans conséquence le jour J : la
 * gestion est gelée depuis B1 et l'ancienne app n'est repromue qu'après (B9 du retour arrière) ; la
 * durée de cette fenêtre est mesurée en J16 et comptée dans la fenêtre de bascule.
 *
 * Base visée : `DIRECT_URL`, sinon `DATABASE_URL`, lues dans l'environnement du processus (ce script
 * ne lit jamais `.env`). La production n'est acceptée qu'avec `--confirm-host` reproduisant exactement
 * son hôte (`scripts/lib/garde-hote.ts`, `assertHostConfirmed`).
 */
import fs from "node:fs";
import path from "node:path";
import { hostOf } from "../lib/garde-hote";
import { gardeHoteConfirme } from "../repetition/lib/garde-cible";
import { lireManifeste, type Manifeste } from "../repetition/lib/instantane";
import { environnementPour, lancerScript } from "../repetition/lib/processus";
import { appliquerAncienSchema, chargerInstantane, dossiersAncienSchema } from "../repetition/lib/restauration";
import { ecrireFichier, json, resoudreEntree, resoudreSortie } from "./lib/artefacts";
import { FORMAT_DATE, HostRefusedError, ident, lignes, lireCible, ouvrirBase, premiere, type Base, type Sql } from "./lib/base";
import { ErreurUsage, lireArguments } from "./lib/cli";
import type { Controle } from "./lib/controles";
import { FORMAT_REFERENCE, lireReference, type Mesures, type Reference } from "./lib/reference-format";
import { schemasPresents, viderSchemas, type ObjetSupprime } from "./lib/vidage";

// Lu AVANT tout import de @prisma/client (chargé plus tard par `ouvrirBase`), qui verse `.env`
// — la production — dans process.env.
const ENV_INITIAL: NodeJS.ProcessEnv = { ...process.env };

const USAGE = "migration:rollback";

/** Les deux schémas vidés. `legacy` peut ne pas exister (échec avant l'expand) : il est alors ignoré. */
const SCHEMAS = ["public", "legacy"] as const;

/** Tables de la refonte : aucune ne doit subsister. */
const TABLES_REFONTE = ["SaleDocument", "SaleLine", "Payment", "Setting"] as const;
/** Types énumérés de la refonte. */
const ENUMS_REFONTE = ["DocumentOrigin", "DocumentStatus", "PaymentKind", "CashMovementKindV2"] as const;
/** Nom du fichier de secours du bloc `mesures` attendu, écrit dans le dossier de sortie. */
const REFERENCE_ATTENDUE = "reference-attendue.json";
/** Format de `horodatages.calculeLe` : l'instant est repassé tel quel à `reference.ts`. */
const FORMAT_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

interface Duree {
  phase: string;
  ms: number;
}

interface Ecart {
  chemin: string;
  attendu: unknown;
  obtenu: unknown;
}

interface Rollback {
  format: "nurea-rollback/1";
  statut: "vert" | "rouge";
  horodatages: { lanceLe: string; hote: string; referenceCalculeeLe: string };
  instantane: { dossier: string; source: Manifeste["source"]; tables: { nom: string; lignes: number }[] };
  referenceAttendue: { origine: string; copie: string };
  vidage: { schemas: string[]; objets: ObjetSupprime[] };
  schema: { migrations: string[]; historiqueAbsent: string[] };
  donnees: { tables: { nom: string; lignes: number }[] };
  controles: Controle[];
  durees: Duree[];
}

function formaterDuree(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function controle(
  code: string,
  libelle: string,
  ecarts: Record<string, unknown>[],
  valeurs: Record<string, string | number> = {},
): Controle {
  return { code, libelle, bloquant: true, ok: ecarts.length === 0, valeurs, ecarts };
}

// ─── Comparaison du bloc `mesures` ────────────────────────────────────────────────────────────────

/**
 * Différences entre deux blocs `mesures`, chemin par chemin. L'ordre des clés est ignoré : la
 * référence lue dans `legacy."MigrationReference"` est passée par `jsonb`, qui réordonne les clés.
 */
export function differences(attendu: unknown, obtenu: unknown, chemin = "mesures"): Ecart[] {
  if (Array.isArray(attendu) || Array.isArray(obtenu)) {
    if (!Array.isArray(attendu) || !Array.isArray(obtenu)) return [{ chemin, attendu, obtenu }];
    if (attendu.length !== obtenu.length) {
      return [{ chemin: `${chemin}.length`, attendu: attendu.length, obtenu: obtenu.length }];
    }
    return attendu.flatMap((valeur, i) => differences(valeur, obtenu[i], `${chemin}[${i}]`));
  }
  const objet = (valeur: unknown) => typeof valeur === "object" && valeur !== null;
  if (objet(attendu) || objet(obtenu)) {
    if (!objet(attendu) || !objet(obtenu)) return [{ chemin, attendu, obtenu }];
    const a = attendu as Record<string, unknown>;
    const b = obtenu as Record<string, unknown>;
    const cles = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    return cles.flatMap((cle) => differences(a[cle], b[cle], `${chemin}.${cle}`));
  }
  return attendu === obtenu ? [] : [{ chemin, attendu, obtenu }];
}

// ─── Référence attendue ───────────────────────────────────────────────────────────────────────────

interface Attendue {
  reference: Reference;
  origine: string;
}

function valider(valeur: unknown, origine: string): Reference {
  const reference = valeur as Reference;
  if (reference?.format !== FORMAT_REFERENCE || !reference.mesures || !reference.horodatages) {
    throw new ErreurUsage(`${origine} ne contient pas une référence de reprise (${FORMAT_REFERENCE}).`);
  }
  return reference;
}

/** Référence insérée par la reprise dans `legacy."MigrationReference"` (la dernière), si elle est là. */
async function referenceEnBase(db: Sql): Promise<Attendue | null> {
  const { presente } = await premiere<{ presente: boolean }>(
    db,
    `SELECT to_regclass('legacy."MigrationReference"') IS NOT NULL AS presente`,
  );
  if (!presente) return null;
  const [ligne] = await lignes<{ texte: string }>(
    db,
    `SELECT reference::text AS texte FROM legacy."MigrationReference" ORDER BY id DESC LIMIT 1`,
  );
  if (!ligne) return null;
  const origine = `legacy."MigrationReference"`;
  return { reference: valider(JSON.parse(ligne.texte), origine), origine };
}

async function referenceAttendue(db: Sql, fichier: string | undefined, dossierSortie: string): Promise<Attendue> {
  if (fichier) {
    const chemin = resoudreEntree(fichier);
    return { reference: lireReference(chemin).reference, origine: chemin };
  }
  const enBase = await referenceEnBase(db);
  if (enBase) return enBase;
  const secours = path.join(dossierSortie, REFERENCE_ATTENDUE);
  if (fs.existsSync(secours)) return { reference: lireReference(secours).reference, origine: secours };
  throw new ErreurUsage(
    `aucun bloc « mesures » d'avant la bascule : ni --reference <fichier>, ni legacy."MigrationReference" ` +
      `(la reprise n'a pas été appliquée, ou le vidage l'a déjà emportée), ni ${secours}. ` +
      `Le contrôle final serait impossible : le retour arrière refuse de commencer.`,
  );
}

// ─── Contrôles de structure ───────────────────────────────────────────────────────────────────────

async function controlerObjetsRefonte(db: Sql): Promise<Controle> {
  const ecarts: Record<string, unknown>[] = [];
  const presentes = await lignes<{ nom: string }>(
    db,
    `SELECT nom FROM unnest($1::text[]) AS t(nom) WHERE to_regclass(format('public.%I', t.nom)) IS NOT NULL`,
    [...TABLES_REFONTE, "DocumentBalance"],
  );
  for (const { nom } of presentes) ecarts.push({ objet: nom, regle: "table ou vue de la refonte encore dans public" });

  const routines = await lignes<{ nom: string }>(
    db,
    `SELECT n.nspname || '.' || p.proname AS nom FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = ANY ($1::text[]) AND p.proname LIKE 'nurea\\_%' ORDER BY nom`,
    [...SCHEMAS],
  );
  for (const { nom } of routines) ecarts.push({ objet: nom, regle: "fonction nurea_* encore présente" });

  const triggers = await lignes<{ nom: string }>(
    db,
    `SELECT c.relname || '.' || t.tgname AS nom FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE NOT t.tgisinternal AND n.nspname = ANY ($1::text[]) ORDER BY nom`,
    [...SCHEMAS],
  );
  for (const { nom } of triggers) ecarts.push({ objet: nom, regle: "trigger de la refonte encore présent" });

  const enums = await lignes<{ nom: string }>(
    db,
    `SELECT t.typname AS nom FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE t.typtype = 'e' AND n.nspname = ANY ($1::text[]) AND t.typname = ANY ($2::text[]) ORDER BY nom`,
    [...SCHEMAS],
    [...ENUMS_REFONTE],
  );
  for (const { nom } of enums) ecarts.push({ objet: nom, regle: "type énuméré de la refonte encore présent" });

  const restesLegacy = await lignes<{ nom: string }>(
    db,
    `SELECT c.relname AS nom FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'legacy' AND c.relkind IN ('v', 'm', 'r', 'p', 'S') ORDER BY c.relname COLLATE "C"`,
  );
  for (const { nom } of restesLegacy) ecarts.push({ objet: `legacy.${nom}`, regle: "le schéma legacy n'est pas vide" });

  return controle("R1", "Aucun objet de la refonte ne subsiste (tables, vue, fonctions, triggers, enums, legacy vide)", ecarts, {
    tablesRefonte: presentes.length,
    routinesNurea: routines.length,
    triggers: triggers.length,
    enumsRefonte: enums.length,
    objetsLegacy: restesLegacy.length,
  });
}

async function controlerAncienMonde(db: Sql, manifeste: Manifeste): Promise<Controle> {
  const ecarts: Record<string, unknown>[] = [];
  for (const table of manifeste.tables) {
    const { presente } = await premiere<{ presente: boolean }>(
      db,
      `SELECT to_regclass(format('public.%I', $1::text)) IS NOT NULL AS presente`,
      table.nom,
    );
    if (!presente) {
      ecarts.push({ table: table.nom, regle: "table de l'ancien monde absente de public" });
      continue;
    }
    const { n } = await premiere<{ n: number }>(db, `SELECT count(*)::int AS n FROM ${ident(table.nom)}`);
    if (n !== table.lignes) ecarts.push({ table: table.nom, instantane: table.lignes, base: n });
  }
  return controle("R2", "Chaque table de l'instantané est de retour dans public, à son compte exact", ecarts, {
    tables: manifeste.tables.length,
    lignes: manifeste.tables.reduce((acc, t) => acc + t.lignes, 0),
  });
}

async function controlerHistorique(db: Sql, dossier: string, manifeste: Manifeste): Promise<Controle> {
  const ecarts: Record<string, unknown>[] = [];
  const table = manifeste.tables.find((t) => t.nom === "_prisma_migrations");
  const appliquees = await lignes<{ nom: string }>(db, `SELECT migration_name AS nom FROM "_prisma_migrations" ORDER BY nom`);
  const noms = new Set(appliquees.map((m) => m.nom));
  for (const nom of noms) {
    if (nom.endsWith("_refonte_expand") || nom.endsWith("_refonte_contract")) {
      ecarts.push({ migration: nom, regle: "migration de la refonte encore dans _prisma_migrations" });
    }
  }
  if (table) {
    const attendues = new Set(
      fs
        .readFileSync(path.join(dossier, table.fichier), "utf8")
        .split("\n")
        .filter((l) => l !== "")
        .map((l) => (JSON.parse(l) as { migration_name: string }).migration_name),
    );
    for (const nom of attendues) if (!noms.has(nom)) ecarts.push({ migration: nom, regle: "présente dans l'instantané, absente de la base" });
    for (const nom of noms) if (!attendues.has(nom)) ecarts.push({ migration: nom, regle: "présente dans la base, absente de l'instantané" });
  }
  return controle("R3", "_prisma_migrations est celle de l'instantané, sans les deux migrations de la refonte", ecarts, {
    migrations: noms.size,
  });
}

async function controlerSequences(db: Sql): Promise<Controle> {
  const colonnes = await lignes<{ table: string; colonne: string }>(
    db,
    `SELECT table_name AS "table", column_name AS colonne FROM information_schema.columns
     WHERE table_schema = 'public' AND (column_default LIKE 'nextval(%' OR is_identity = 'YES')
     ORDER BY table_name, column_name`,
  );
  const ecarts: Record<string, unknown>[] = [];
  for (const { table, colonne } of colonnes) {
    // `is_called` ne vit PAS dans la vue `pg_sequences` (elle n'expose que `last_value`, et le rend
    // NULL tant que la séquence n'a pas été lue) : on interroge la séquence elle-même, dont le nom
    // vient du catalogue (`pg_get_serial_sequence`, déjà qualifié et échappé).
    const { sequence } = await premiere<{ sequence: string | null }>(
      db,
      `SELECT pg_get_serial_sequence($1, $2)::text AS sequence`,
      ident(table),
      colonne,
    );
    if (sequence === null) {
      ecarts.push({ table, colonne, regle: "séquence introuvable" });
      continue;
    }
    const { maxi } = await premiere<{ maxi: string }>(
      db,
      `SELECT COALESCE((SELECT MAX(${ident(colonne)}) FROM ${ident(table)}), 0)::text AS maxi`,
    );
    // `setval(seq, max + 1, false)` (restauration) laisse `is_called` faux : la prochaine valeur
    // rendue est alors `last_value` tel quel, et non `last_value + 1`.
    const { prochaine } = await premiere<{ prochaine: string }>(
      db,
      `SELECT (CASE WHEN is_called THEN last_value + 1 ELSE last_value END)::text AS prochaine FROM ${sequence}`,
    );
    if (BigInt(prochaine) <= BigInt(maxi)) {
      ecarts.push({ table, colonne, plusGrandId: maxi, prochaineValeur: prochaine });
    }
  }
  return controle("R4", "Chaque séquence rend une valeur au-dessus du plus grand identifiant restauré", ecarts, {
    sequences: colonnes.length,
  });
}

// ─── Contrôle final : la référence recalculée ─────────────────────────────────────────────────────

function controlerReference(attendue: Attendue, obtenue: Mesures | null, message: string): Controle {
  if (!obtenue) {
    return controle("R5", "Référence recalculée identique au bloc « mesures » d'avant la bascule (au centime)", [
      { regle: "la référence n'a pas pu être recalculée", detail: message },
    ]);
  }
  const ecarts = differences(attendue.reference.mesures, obtenue);
  return controle(
    "R5",
    "Référence recalculée identique au bloc « mesures » d'avant la bascule (au centime)",
    ecarts.map((e) => ({ ...e })),
    {
      attendue: attendue.origine,
      encaisseAttendu: attendue.reference.mesures.encaisse.ancien,
      encaisseRecalcule: obtenue.encaisse.ancien,
      tresorerieAttendue: attendue.reference.mesures.tresorerie.totalNonArchivees,
      tresorerieRecalculee: obtenue.tresorerie.totalNonArchivees,
      ecarts: ecarts.length,
    },
  );
}

// ─── Rapport ──────────────────────────────────────────────────────────────────────────────────────

function markdown(r: Rollback): string {
  const out = [`# Retour arrière — ${r.statut === "vert" ? "vert" : "ROUGE"}\n`];
  out.push(`Lancé le ${r.horodatages.lanceLe} sur ${r.horodatages.hote}.`);
  out.push(`Instantané : \`${r.instantane.dossier}\` (${r.instantane.source.hote}/${r.instantane.source.base}).`);
  out.push(`Référence attendue : \`${r.referenceAttendue.origine}\` (du ${r.horodatages.referenceCalculeeLe}).\n`);
  out.push(`| phase | durée |\n| --- | --- |`);
  for (const d of r.durees) out.push(`| ${d.phase} | ${formaterDuree(d.ms)} |`);
  out.push(`| **total** | **${formaterDuree(r.durees.reduce((acc, d) => acc + d.ms, 0))}** |\n`);
  out.push(`| code | contrôle | résultat |\n| --- | --- | --- |`);
  for (const c of r.controles) out.push(`| ${c.code} | ${c.libelle} | ${c.ok ? "vert" : "ROUGE"} |`);
  out.push(`\n## Vidage (${r.vidage.schemas.join(", ")}) — ${r.vidage.objets.length} objets\n`);
  for (const o of r.vidage.objets) out.push(`- ${o.genre} \`${o.schema}.${o.nom}\``);
  out.push(`\n## Données restaurées\n`);
  for (const t of r.donnees.tables) out.push(`- ${t.nom} : ${t.lignes}`);
  if (r.schema.historiqueAbsent.length > 0) {
    out.push(`\n## Migrations appliquées mais absentes de l'historique de l'instantané\n`);
    for (const nom of r.schema.historiqueAbsent) out.push(`- ${nom}`);
  }
  for (const c of r.controles.filter((x) => !x.ok)) {
    out.push(`\n## ${c.code} — écarts\n\n\`\`\`json\n${JSON.stringify(c.ecarts, null, 2)}\n\`\`\``);
  }
  return `${out.join("\n")}\n`;
}

// ─── Exécution ────────────────────────────────────────────────────────────────────────────────────

async function main(): Promise<number> {
  const args = lireArguments(process.argv.slice(2), {
    valeurs: ["--instantane", "--reference", "--out", "--confirm-host"],
  });
  const fourni = args.valeurs.get("--instantane");
  if (!fourni) throw new ErreurUsage("--instantane <dossier> est obligatoire (instantané de l'ancien monde, pris en B4).");
  const confirmHost = args.valeurs.get("--confirm-host");
  const url = lireCible(USAGE, confirmHost);
  const garde = gardeHoteConfirme(confirmHost);
  const hote = hostOf(url);
  const dossierSortie = resoudreSortie(args.valeurs.get("--out"));
  const dossierInstantane = resoudreEntree(fourni);

  // Empreintes de l'instantané vérifiées avant toute écriture : une altération de fichier arrête ici.
  const manifeste = lireManifeste(dossierInstantane);

  const durees: Duree[] = [];
  const chronometrer = async <T>(phase: string, action: () => T | Promise<T>): Promise<T> => {
    console.log(`${USAGE} — ${phase}…`);
    const debut = Date.now();
    try {
      return await action();
    } finally {
      const ms = Date.now() - debut;
      durees.push({ phase, ms });
      console.log(`${USAGE} — ${phase} : ${formaterDuree(ms)}`);
    }
  };

  console.log(`${USAGE} — cible ${hote} · instantané ${dossierInstantane} · sorties ${dossierSortie}`);

  // Phases 0 et 1 sur une seule connexion, fermée avant que le CLI Prisma prenne la main.
  const { lanceLe, attendue, vidage } = await (async () => {
    const db: Base = await ouvrirBase(url);
    try {
      const { lanceLe } = await premiere<{ lanceLe: string }>(
        db,
        `SELECT to_char(now() AT TIME ZONE 'UTC', ${FORMAT_DATE}) || 'Z' AS "lanceLe"`,
      );

      // 0. Bloc `mesures` attendu, lu AVANT le vidage puis recopié : la relance le retrouvera.
      const attendue = await referenceAttendue(db, args.valeurs.get("--reference"), dossierSortie);
      const copie = path.join(dossierSortie, REFERENCE_ATTENDUE);
      ecrireFichier(copie, json(attendue.reference));
      console.log(`${USAGE} — référence attendue : ${attendue.origine} (du ${attendue.reference.horodatages.calculeLe})`);
      console.log(`${USAGE} — recopiée dans ${copie} — une relance la reprendra là, ou par --reference.`);

      // 1. Vidage de public et legacy, en une transaction.
      const schemas = await schemasPresents(db, SCHEMAS);
      const vidage = await chronometrer(`vidage (${schemas.join(", ")})`, () =>
        db.$transaction(
          async (tx) => {
            const resultat = await viderSchemas(tx, schemas);
            if (resultat.restants.length > 0) {
              throw new Error(
                `${USAGE} : objets encore présents après le balayage — ${resultat.restants
                  .map((o) => `${o.schema}.${o.nom}`)
                  .join(", ")}. Rien n'est vidé (transaction annulée).`,
              );
            }
            return { schemas, objets: resultat.objets };
          },
          { maxWait: 30_000, timeout: 30 * 60_000 },
        ),
      );
      console.log(`  ${vidage.objets.length} objets supprimés`);
      return { lanceLe, attendue, vidage };
    } finally {
      await db.$disconnect();
    }
  })();

  // 2. Ancien schéma : les dossiers de migration qui précèdent l'expand, un par un.
  await chronometrer("schéma (migrations d'avant l'expand)", () =>
    appliquerAncienSchema(url, (l) => console.log(l), garde),
  );

  // 3. Données de l'instantané et historique des migrations, en une transaction.
  const bilan = await chronometrer("données (instantané)", () => chargerInstantane(url, dossierInstantane, manifeste, garde));
  for (const t of bilan.tables) console.log(`  ${t.nom.padEnd(28)} ${t.lignes}`);
  if (bilan.historiqueAbsent.length > 0) {
    console.warn(
      `${USAGE} — migrations appliquées mais absentes de l'historique de l'instantané ` +
        `(attendu : les deux « socle ») : ${bilan.historiqueAbsent.join(", ")}`,
    );
  }

  // 4. Contrôles.
  const controles: Controle[] = [];
  const dossierControle = path.join(dossierSortie, "controle");
  let mesures: Mesures | null = null;
  let messageReference = "";
  await chronometrer("contrôle", async () => {
    const apres = await ouvrirBase(url);
    try {
      controles.push(await controlerObjetsRefonte(apres));
      controles.push(await controlerAncienMonde(apres, manifeste));
      controles.push(await controlerHistorique(apres, dossierInstantane, manifeste));
      controles.push(await controlerSequences(apres));
    } finally {
      await apres.$disconnect();
    }

    // La référence est recalculée par le VRAI script, dans son propre processus, au même instant de
    // mesure que celle d'avant la bascule (sinon le mois courant et son Encaissé pourraient différer).
    const instant = attendue.reference.horodatages.calculeLe;
    const argsReference = ["--out", dossierControle];
    if (FORMAT_INSTANT.test(instant)) {
      argsReference.push("--instant", instant);
    } else {
      console.warn(`${USAGE} — instant de la référence attendue illisible (« ${instant} ») : recalcul à l'instant courant.`);
    }
    if (confirmHost) argsReference.push("--confirm-host", confirmHost);
    const execution = lancerScript("scripts/migration/reference.ts", argsReference, environnementPour(url, ENV_INITIAL), {
      capturer: false,
    });
    if (execution.code !== 0) {
      messageReference = `migration:reference a échoué (code ${execution.code})`;
    } else {
      mesures = lireReference(path.join(dossierControle, "reference.json")).reference.mesures;
    }
    controles.push(controlerReference(attendue, mesures, messageReference));
  });

  const rapport: Rollback = {
    format: "nurea-rollback/1",
    statut: controles.every((c) => c.ok) ? "vert" : "rouge",
    horodatages: { lanceLe, hote, referenceCalculeeLe: attendue.reference.horodatages.calculeLe },
    instantane: {
      dossier: dossierInstantane,
      source: manifeste.source,
      tables: manifeste.tables.map((t) => ({ nom: t.nom, lignes: t.lignes })),
    },
    referenceAttendue: { origine: attendue.origine, copie: path.join(dossierSortie, REFERENCE_ATTENDUE) },
    vidage,
    schema: { migrations: dossiersAncienSchema(), historiqueAbsent: bilan.historiqueAbsent },
    donnees: { tables: bilan.tables },
    controles,
    durees,
  };
  ecrireFichier(path.join(dossierSortie, "rollback.json"), json(rapport));
  ecrireFichier(path.join(dossierSortie, "rollback.md"), markdown(rapport));

  for (const c of controles) {
    const ligne = `  ${c.ok ? "vert " : "ROUGE"} ${c.code} ${c.libelle}`;
    if (c.ok) console.log(ligne);
    else console.error(`${ligne}\n${JSON.stringify(c.ecarts.slice(0, 20), null, 2)}`);
  }
  console.log(`${USAGE} — durées :`);
  for (const d of durees) console.log(`  ${d.phase.padEnd(34)} ${formaterDuree(d.ms)}`);
  console.log(`  ${"total".padEnd(34)} ${formaterDuree(durees.reduce((acc, d) => acc + d.ms, 0))}`);
  console.log(`${USAGE} — ${rapport.statut} · ${path.join(dossierSortie, "rollback.md")}`);
  if (rapport.statut !== "vert") {
    console.error(`${USAGE} — NE PAS ROUVRIR : la base n'est pas revenue à l'état d'avant l'expand. L'instantané reste intact.`);
  }
  return rapport.statut === "vert" ? 0 : 1;
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
