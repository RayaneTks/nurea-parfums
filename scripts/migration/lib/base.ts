/**
 * Accès base des scripts de migration.
 *
 * PIÈGE : importer `@prisma/client` charge `.env` (la production) dans `process.env`. Ce module
 * n'importe Prisma qu'en type ; le client est chargé dynamiquement par `ouvrirBase`, APRÈS que le
 * script a lu et gardé son URL cible (`lireCible`). Aucun script ne passe par `DATABASE_URL`
 * implicite : l'URL est toujours donnée au client.
 */
import type { PrismaClient } from "@prisma/client";
import { HostRefusedError, assertHostConfirmed } from "../../lib/garde-hote";

export type Base = PrismaClient;
/** Client racine ou client d'une transaction interactive. */
export type Sql = Pick<PrismaClient, "$queryRawUnsafe" | "$executeRawUnsafe">;

/** Format des horodatages échangés avec la base : ISO à la milliseconde, sans fuseau (UTC). */
export const FORMAT_DATE = `'YYYY-MM-DD"T"HH24:MI:SS.MS'`;

/**
 * URL cible d'un script de migration : `DIRECT_URL`, sinon `DATABASE_URL`, lues dans l'environnement
 * du processus — à appeler avant tout import de Prisma. La production exige `--confirm-host`.
 */
export function lireCible(usage: string, confirmHost: string | undefined): string {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  return assertHostConfirmed(url, confirmHost, usage);
}

export async function ouvrirBase(url: string): Promise<Base> {
  const { PrismaClient } = await import("@prisma/client");
  return new PrismaClient({ datasourceUrl: url });
}

export async function lignes<T>(db: Sql, requete: string, ...parametres: unknown[]): Promise<T[]> {
  return db.$queryRawUnsafe<T[]>(requete, ...parametres);
}

export async function premiere<T>(db: Sql, requete: string, ...parametres: unknown[]): Promise<T> {
  const [ligne] = await lignes<T>(db, requete, ...parametres);
  if (ligne === undefined) throw new Error(`Requête sans résultat : ${requete.slice(0, 120)}`);
  return ligne;
}

/** Identifiant SQL entre guillemets. */
export function ident(nom: string): string {
  return `"${nom.replaceAll('"', '""')}"`;
}

/** Découpe une liste en paquets (écritures en masse par json_to_recordset). */
export function paquets<T>(liste: readonly T[], taille = 1000): T[][] {
  const resultat: T[][] = [];
  for (let i = 0; i < liste.length; i += taille) resultat.push(liste.slice(i, i + taille));
  return resultat;
}

export { HostRefusedError };
