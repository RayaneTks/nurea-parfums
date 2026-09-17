/**
 * Instantané JSON d'une base à l'ancien schéma (variante locale de la répétition, 07-PLAN-EXECUTION.md §2.4).
 *
 * Extraction, sur la SOURCE, en lecture seule stricte — les seules instructions envoyées sont :
 *   BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY
 *   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' …
 *   SELECT row_to_json(t) FROM "<table>" t          (une par table, `_prisma_migrations` comprise)
 *   ROLLBACK
 * Aucune instruction de session, aucune écriture, aucun objet créé. Les lignes sont écrites telles que
 * PostgreSQL les rend (JSON texte, une par ligne) : aucun montant ne passe par un nombre JavaScript.
 *
 * Format du dossier : `manifest.json` + un fichier `<n>-<table>.ndjson` par table, avec son empreinte SHA-256.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ConnexionLectureSeule } from "./pg-lecture-seule";

export const FORMAT_INSTANTANE = "nurea-instantane/1";

export const SQL_DEBUT = "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY";
export const SQL_TABLES =
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name";
export const sqlLignes = (table: string) => `SELECT row_to_json(t) FROM "${table.replaceAll('"', '""')}" t`;
export const SQL_FIN = "ROLLBACK";

export interface TableInstantane {
  nom: string;
  fichier: string;
  lignes: number;
  /** Colonnes lues sur la première ligne (row_to_json rend toutes les colonnes) ; vide si la table est vide. */
  colonnes: string[];
  sha256: string;
}

export interface Manifeste {
  format: typeof FORMAT_INSTANTANE;
  extraitLe: string;
  source: { hote: string; port: string; base: string };
  tables: TableInstantane[];
}

export interface OptionsExtraction {
  /**
   * Appelé DANS la transaction de lecture, après la dernière table et avant la fin : sert aux tests à
   * prouver qu'une écriture y serait refusée. Jamais utilisé par `repetition:refresh`.
   */
  avantFin?: (connexion: ConnexionLectureSeule) => Promise<void>;
}

export async function extraireInstantane(
  urlSource: string,
  dossier: string,
  options: OptionsExtraction = {},
): Promise<{ manifeste: Manifeste; journal: string[] }> {
  fs.mkdirSync(dossier, { recursive: true });
  if (fs.readdirSync(dossier).length > 0) throw new Error(`Le dossier d'instantané ${dossier} n'est pas vide.`);

  const url = new URL(urlSource);
  const connexion = await ConnexionLectureSeule.ouvrir(urlSource);
  const tables: TableInstantane[] = [];
  const extraitLe = new Date().toISOString();
  try {
    await connexion.requete(SQL_DEBUT);
    try {
      const noms: string[] = [];
      await connexion.requete(SQL_TABLES, ([nom]) => noms.push(nom as string));
      noms.sort();
      for (const [index, nom] of noms.entries()) {
        const fichier = `${String(index + 1).padStart(3, "0")}-${nom.replace(/[^A-Za-z0-9_-]/g, "_")}.ndjson`;
        const chemin = path.join(dossier, fichier);
        const descripteur = fs.openSync(chemin, "w");
        const empreinte = crypto.createHash("sha256");
        let lignes = 0;
        let colonnes: string[] = [];
        let paquet = "";
        const vider = () => {
          if (paquet === "") return;
          fs.writeSync(descripteur, paquet, null, "utf8");
          empreinte.update(paquet, "utf8");
          paquet = "";
        };
        try {
          await connexion.requete(sqlLignes(nom), ([json]) => {
            if (lignes === 0) colonnes = Object.keys(JSON.parse(json as string) as object);
            paquet += `${json}\n`;
            lignes += 1;
            if (paquet.length > 1_000_000) vider();
          });
          vider();
        } finally {
          fs.closeSync(descripteur);
        }
        tables.push({ nom, fichier, lignes, colonnes, sha256: empreinte.digest("hex") });
      }
      if (options.avantFin) await options.avantFin(connexion);
    } finally {
      await connexion.requete(SQL_FIN);
    }
  } finally {
    await connexion.fermer();
  }

  const manifeste: Manifeste = {
    format: FORMAT_INSTANTANE,
    extraitLe,
    source: { hote: url.hostname, port: url.port || "5432", base: decodeURIComponent(url.pathname.replace(/^\//, "")) },
    tables,
  };
  fs.writeFileSync(path.join(dossier, "manifest.json"), `${JSON.stringify(manifeste, null, 2)}\n`, "utf8");
  return { manifeste, journal: [...connexion.journal] };
}

export function lireManifeste(dossier: string): Manifeste {
  const manifeste = JSON.parse(fs.readFileSync(path.join(dossier, "manifest.json"), "utf8")) as Manifeste;
  if (manifeste?.format !== FORMAT_INSTANTANE) throw new Error(`${dossier} ne contient pas un instantané ${FORMAT_INSTANTANE}.`);
  for (const table of manifeste.tables) {
    const contenu = fs.readFileSync(path.join(dossier, table.fichier));
    const empreinte = crypto.createHash("sha256").update(contenu).digest("hex");
    if (empreinte !== table.sha256) throw new Error(`Instantané altéré : empreinte de ${table.fichier} différente du manifeste.`);
  }
  return manifeste;
}

/** Lignes JSON d'une table, en texte brut (jamais re-sérialisées). */
export function* lignesDeTable(dossier: string, table: TableInstantane): Generator<string> {
  const contenu = fs.readFileSync(path.join(dossier, table.fichier), "utf8");
  for (const ligne of contenu.split("\n")) if (ligne !== "") yield ligne;
}
