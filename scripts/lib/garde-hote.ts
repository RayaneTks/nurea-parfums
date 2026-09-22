/**
 * Garde d'hôte partagée par les scripts de migration et les tests sur base réelle
 * (docs/refonte/07-PLAN-EXECUTION.md §1.3, garde-fou 5).
 *
 * `.env` et `.env.local` pointent sur la production, et Prisma lit `.env` tout
 * seul : un script lancé sans `DATABASE_URL` explicite écrirait en production.
 * Tout ce qui écrit passe donc par ici.
 */

export const PRODUCTION_PROJECT_REF = "lkdhqqzocmxtyarseizc";

export class HostRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HostRefusedError";
  }
}

export function hostOf(databaseUrl: string): string {
  try {
    return new URL(databaseUrl).hostname;
  } catch {
    throw new HostRefusedError("URL de base illisible : impossible d'en vérifier l'hôte.");
  }
}

/**
 * Vrai si l'URL désigne la production. Le pooler Supabase partage son hôte entre
 * projets : la référence du projet se lit alors dans l'utilisateur
 * (`postgres.<ref>`), d'où la recherche dans l'URL entière.
 */
export function isProductionUrl(databaseUrl: string): boolean {
  return databaseUrl.includes(PRODUCTION_PROJECT_REF);
}

/** Refuse sans exception toute cible de production (tests, répétition). */
export function assertNotProduction(databaseUrl: string | undefined, usage: string): string {
  if (!databaseUrl) {
    throw new HostRefusedError(`${usage} : aucune URL de base fournie.`);
  }
  if (isProductionUrl(databaseUrl)) {
    throw new HostRefusedError(
      `${usage} : cible refusée, c'est la base de production (${hostOf(databaseUrl)}).`,
    );
  }
  return databaseUrl;
}

/**
 * Autorise la production seulement si `--confirm-host <hôte>` reproduit exactement
 * l'hôte visé. Pas d'invite interactive : exécutable par un agent, jamais par
 * inadvertance.
 */
export function assertHostConfirmed(
  databaseUrl: string | undefined,
  confirmedHost: string | undefined,
  usage: string,
): string {
  if (!databaseUrl) {
    throw new HostRefusedError(`${usage} : aucune URL de base fournie.`);
  }
  if (!isProductionUrl(databaseUrl)) return databaseUrl;
  const host = hostOf(databaseUrl);
  if (confirmedHost !== host) {
    throw new HostRefusedError(
      `${usage} : la cible est la production (${host}). Relance avec --confirm-host ${host} si c'est voulu.`,
    );
  }
  return databaseUrl;
}
