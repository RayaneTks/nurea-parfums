/**
 * Vidage d'un schéma sans le supprimer (docs/refonte/07-PLAN-EXECUTION.md §1.7).
 *
 * Le retour arrière ne peut pas `DROP SCHEMA public CASCADE` : Supabase y a posé des droits par
 * défaut et y installe ses extensions. On supprime donc les OBJETS du schéma, un par un, et on
 * laisse le schéma en place. Idem pour `legacy` : l'expand le recrée (`CREATE SCHEMA IF NOT EXISTS`),
 * et un schéma vide ne gêne personne.
 *
 * Ce que le balayage emporte, dans cet ordre : vues et vues matérialisées (dont `DocumentBalance`),
 * tables (CASCADE : index, contraintes, clés étrangères, triggers `nurea_*`, séquences possédées),
 * séquences restées seules, fonctions et procédures (dont `nurea_period_start`, `nurea_period_end`,
 * `nurea_append_only`, `nurea_movement_consistency`…), enfin les types énumérés — anciens comme
 * nouveaux, tous devenus orphelins puisque plus aucune table ne les porte.
 *
 * Ce qu'il ne touche JAMAIS : tout objet qui appartient à une extension (`pg_depend.deptype = 'e'`),
 * le schéma lui-même, et tout autre schéma que ceux qu'on lui nomme.
 *
 * Les instructions sont fabriquées par `format()` côté PostgreSQL : aucun nom d'objet n'est mis entre
 * guillemets par nos soins, et les noms sont lus dans le catalogue, jamais devinés.
 */
import { lignes, type Sql } from "./base";

export type Genre = "vue" | "table" | "séquence" | "routine" | "type";

export interface ObjetSupprime {
  schema: string;
  genre: Genre;
  nom: string;
}

export interface Vidage {
  /** Objets supprimés, dans l'ordre d'exécution. */
  objets: ObjetSupprime[];
  /** Objets encore présents après le balayage : toujours vide, sinon le retour arrière échoue. */
  restants: ObjetSupprime[];
}

interface Candidat {
  schema: string;
  genre: Genre;
  nom: string;
  instruction: string;
}

/** Relations (vues, tables, séquences) d'un schéma, hors extensions, dans l'ordre de suppression. */
const SQL_RELATIONS = `
  SELECT n.nspname AS schema,
         CASE c.relkind WHEN 'v' THEN 'vue' WHEN 'm' THEN 'vue' WHEN 'S' THEN 'séquence' ELSE 'table' END AS genre,
         c.relname AS nom,
         format('DROP %s IF EXISTS %I.%I CASCADE',
                CASE c.relkind WHEN 'v' THEN 'VIEW' WHEN 'm' THEN 'MATERIALIZED VIEW'
                               WHEN 'S' THEN 'SEQUENCE' ELSE 'TABLE' END,
                n.nspname, c.relname) AS instruction
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = ANY ($1::text[])
    AND c.relkind IN ('v', 'm', 'r', 'p', 'S')
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e')
  ORDER BY CASE c.relkind WHEN 'v' THEN 0 WHEN 'm' THEN 0 WHEN 'S' THEN 2 ELSE 1 END,
           n.nspname, c.relname COLLATE "C"`;

/** Fonctions et procédures d'un schéma, hors extensions. */
const SQL_ROUTINES = `
  SELECT n.nspname AS schema, 'routine' AS genre,
         p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS nom,
         format('DROP ROUTINE IF EXISTS %I.%I(%s) CASCADE', n.nspname, p.proname,
                pg_get_function_identity_arguments(p.oid)) AS instruction
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = ANY ($1::text[])
    AND p.prokind IN ('f', 'p')
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  ORDER BY n.nspname, p.proname COLLATE "C"`;

/** Types énumérés d'un schéma, hors extensions (le type tableau part avec le type). */
const SQL_TYPES = `
  SELECT n.nspname AS schema, 'type' AS genre, t.typname AS nom,
         format('DROP TYPE IF EXISTS %I.%I CASCADE', n.nspname, t.typname) AS instruction
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = ANY ($1::text[])
    AND t.typtype = 'e'
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = t.oid AND d.deptype = 'e')
  ORDER BY n.nspname, t.typname COLLATE "C"`;

async function candidats(db: Sql, schemas: readonly string[]): Promise<Candidat[]> {
  const liste = [...schemas];
  return [
    ...(await lignes<Candidat>(db, SQL_RELATIONS, liste)),
    ...(await lignes<Candidat>(db, SQL_ROUTINES, liste)),
    ...(await lignes<Candidat>(db, SQL_TYPES, liste)),
  ];
}

/**
 * Vide les schémas donnés de tout objet qui ne vient pas d'une extension, en laissant les schémas
 * en place. À appeler DANS une transaction : un échec n'a alors rien vidé.
 */
export async function viderSchemas(db: Sql, schemas: readonly string[]): Promise<Vidage> {
  const aSupprimer = await candidats(db, schemas);
  const objets: ObjetSupprime[] = [];
  for (const candidat of aSupprimer) {
    await db.$executeRawUnsafe(candidat.instruction);
    objets.push({ schema: candidat.schema, genre: candidat.genre, nom: candidat.nom });
  }
  const restants = (await candidats(db, schemas)).map(({ schema, genre, nom }) => ({ schema, genre, nom }));
  return { objets, restants };
}

/** Schémas existants parmi ceux demandés (`legacy` peut ne pas exister : échec avant l'expand). */
export async function schemasPresents(db: Sql, schemas: readonly string[]): Promise<string[]> {
  const trouves = await lignes<{ nom: string }>(
    db,
    `SELECT nspname AS nom FROM pg_namespace WHERE nspname = ANY ($1::text[]) ORDER BY nspname`,
    [...schemas],
  );
  return trouves.map((s) => s.nom);
}
