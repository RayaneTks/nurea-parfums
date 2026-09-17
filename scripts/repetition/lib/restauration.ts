/**
 * Restauration d'une base LOCALE à l'ancien schéma (docs/refonte/07-PLAN-EXECUTION.md §2.1, §2.4, J2).
 *
 * 1. `recreerBase` : DROP puis CREATE DATABASE en UTF-8 (des migrations héritées contiennent des
 *    caractères absents de WIN1252), collation "C" ;
 * 2. `appliquerAncienSchema` : chaque dossier de `prisma/migrations/` jusqu'à
 *    `20260901120000_retire_gestion_v2` inclus (les deux dossiers « socle » compris), un par un :
 *    `prisma db execute` puis `prisma migrate resolve --applied` — jamais `migrate deploy`, qui
 *    enchaînerait l'expand et le contract ;
 * 3. `chargerInstantane` : dans UNE transaction, lignes insérées par
 *    `INSERT INTO "<t>" (<colonnes>) SELECT <colonnes> FROM json_populate_recordset(NULL::"<t>", $1::json)`
 *    (équivalent ensembliste de json_populate_record, par paquets), tables dans l'ordre des clés
 *    étrangères ; `_prisma_migrations` est REMPLACÉE par celle de la source (copie fidèle) ; puis
 *    séquences remises à niveau (`setval`) et comptages vérifiés.
 * Toutes les fonctions refusent une cible non locale, de production, ou mal nommée (garde-cible.ts).
 */
import path from "node:path";
import { ident, lignes, ouvrirBase } from "../../migration/lib/base";
import { MIGRATIONS_DIR, listMigrationFolders } from "../../migration/lib/prisma-cli";
import { assertCibleLocale, urlMaintenance } from "./garde-cible";
import { lignesDeTable, type Manifeste } from "./instantane";
import { lancerPrisma } from "./processus";

export const DERNIERE_MIGRATION_ANCIENNE = "20260901120000_retire_gestion_v2";
const USAGE = "Restauration de répétition";

export function dossiersAncienSchema(): string[] {
  return listMigrationFolders().filter((nom) => nom <= DERNIERE_MIGRATION_ANCIENNE);
}

export async function recreerBase(url: string): Promise<void> {
  const cible = assertCibleLocale(url, USAGE);
  const admin = await ouvrirBase(urlMaintenance(cible));
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${ident(cible.base)} WITH (FORCE)`);
    await admin.$executeRawUnsafe(
      `CREATE DATABASE ${ident(cible.base)} TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'`,
    );
  } finally {
    await admin.$disconnect();
  }
}

export async function supprimerBase(url: string): Promise<void> {
  const cible = assertCibleLocale(url, USAGE);
  const admin = await ouvrirBase(urlMaintenance(cible));
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${ident(cible.base)} WITH (FORCE)`);
  } finally {
    await admin.$disconnect();
  }
}

export function appliquerAncienSchema(url: string, journal: (ligne: string) => void = () => {}): void {
  const cible = assertCibleLocale(url, USAGE);
  for (const nom of dossiersAncienSchema()) {
    const fichier = path.join(MIGRATIONS_DIR, nom, "migration.sql");
    const execution = lancerPrisma(["db", "execute", "--schema", "prisma/schema.prisma", "--file", fichier], cible.url);
    if (execution.code !== 0) {
      throw new Error(`${nom} : prisma db execute a échoué.\n${execution.sortie}\n${execution.erreurs}`);
    }
    const resolution = lancerPrisma(["migrate", "resolve", "--applied", nom], cible.url);
    if (resolution.code !== 0) {
      throw new Error(`${nom} : prisma migrate resolve a échoué.\n${resolution.sortie}\n${resolution.erreurs}`);
    }
    journal(`  ${nom} (${execution.dureeMs + resolution.dureeMs} ms)`);
  }
}

/** Tables de `public` dans l'ordre des clés étrangères (parents d'abord), noms triés à égalité. */
async function ordreDesTables(db: Awaited<ReturnType<typeof ouvrirBase>>): Promise<string[]> {
  const tables = (await lignes<{ nom: string }>(db, `SELECT tablename AS nom FROM pg_tables WHERE schemaname = 'public'`))
    .map((t) => t.nom)
    .sort();
  const liens = await lignes<{ enfant: string; parent: string }>(
    db,
    `SELECT e.relname AS enfant, p.relname AS parent
     FROM pg_constraint c JOIN pg_class e ON e.oid = c.conrelid JOIN pg_class p ON p.oid = c.confrelid
     WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace AND c.conrelid <> c.confrelid`,
  );
  const parents = new Map(tables.map((t) => [t, new Set<string>()]));
  for (const { enfant, parent } of liens) parents.get(enfant)?.add(parent);
  const ordre: string[] = [];
  const restantes = new Set(tables);
  while (restantes.size > 0) {
    const pretes = [...restantes].filter((t) => [...(parents.get(t) ?? [])].every((p) => !restantes.has(p))).sort();
    if (pretes.length === 0) throw new Error(`Cycle de clés étrangères entre : ${[...restantes].join(", ")}.`);
    for (const t of pretes) {
      ordre.push(t);
      restantes.delete(t);
    }
  }
  return ordre;
}

export interface BilanChargement {
  tables: { nom: string; lignes: number }[];
  historiqueAbsent: string[];
}

export async function chargerInstantane(url: string, dossier: string, manifeste: Manifeste): Promise<BilanChargement> {
  const cible = assertCibleLocale(url, USAGE);
  const db = await ouvrirBase(cible.url);
  try {
    const ordre = await ordreDesTables(db);
    const parNom = new Map(manifeste.tables.map((t) => [t.nom, t]));
    const absentes = manifeste.tables.map((t) => t.nom).filter((nom) => !ordre.includes(nom));
    if (absentes.length > 0) {
      throw new Error(`Tables de l'instantané absentes de la cible (schéma différent) : ${absentes.join(", ")}.`);
    }
    const colonnesCible = new Map<string, Set<string>>();
    for (const { table, colonne } of await lignes<{ table: string; colonne: string }>(
      db,
      `SELECT table_name AS "table", column_name AS colonne FROM information_schema.columns WHERE table_schema = 'public'`,
    )) {
      colonnesCible.set(table, (colonnesCible.get(table) ?? new Set()).add(colonne));
    }
    for (const table of manifeste.tables) {
      const manquantes = table.colonnes.filter((c) => !colonnesCible.get(table.nom)?.has(c));
      if (manquantes.length > 0) {
        throw new Error(`Colonnes de ${table.nom} absentes de la cible (données perdues) : ${manquantes.join(", ")}.`);
      }
    }

    await db.$transaction(
      async (tx) => {
        if (parNom.has("_prisma_migrations")) await tx.$executeRawUnsafe(`DELETE FROM "_prisma_migrations"`);
        for (const nom of ordre) {
          const table = parNom.get(nom);
          if (!table || table.lignes === 0) continue;
          const colonnes = table.colonnes.map(ident).join(", ");
          let paquet: string[] = [];
          let taille = 0;
          const inserer = async () => {
            if (paquet.length === 0) return;
            await tx.$executeRawUnsafe(
              `INSERT INTO ${ident(nom)} (${colonnes}) OVERRIDING SYSTEM VALUE
               SELECT ${colonnes} FROM json_populate_recordset(NULL::${ident(nom)}, $1::json)`,
              `[${paquet.join(",")}]`,
            );
            paquet = [];
            taille = 0;
          };
          for (const ligne of lignesDeTable(dossier, table)) {
            paquet.push(ligne);
            taille += ligne.length;
            if (paquet.length >= 2_000 || taille > 4_000_000) await inserer();
          }
          await inserer();
        }
        const sequences = await lignes<{ table: string; colonne: string }>(
          tx,
          `SELECT table_name AS "table", column_name AS colonne FROM information_schema.columns
           WHERE table_schema = 'public' AND (column_default LIKE 'nextval(%' OR is_identity = 'YES')`,
        );
        for (const { table, colonne } of sequences) {
          await tx.$queryRawUnsafe(
            `SELECT setval(pg_get_serial_sequence($1, $2), COALESCE((SELECT MAX(${ident(colonne)}) FROM ${ident(table)}), 0) + 1, false)`,
            ident(table),
            colonne,
          );
        }
      },
      { maxWait: 10_000, timeout: 30 * 60_000 },
    );

    const bilan: BilanChargement = { tables: [], historiqueAbsent: [] };
    for (const table of [...manifeste.tables].sort((a, b) => (a.nom < b.nom ? -1 : 1))) {
      const [{ n }] = (await lignes<{ n: number }>(db, `SELECT count(*)::int AS n FROM ${ident(table.nom)}`)) as [{ n: number }];
      if (n !== table.lignes) throw new Error(`${table.nom} : ${n} lignes restaurées pour ${table.lignes} dans l'instantané.`);
      bilan.tables.push({ nom: table.nom, lignes: n });
    }
    if (parNom.has("_prisma_migrations")) {
      const appliquees = new Set(
        (await lignes<{ nom: string }>(db, `SELECT migration_name AS nom FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`)).map(
          (m) => m.nom,
        ),
      );
      bilan.historiqueAbsent = dossiersAncienSchema().filter((nom) => !appliquees.has(nom));
    }
    return bilan;
  } finally {
    await db.$disconnect();
  }
}
