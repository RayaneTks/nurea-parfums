/**
 * Garde de la cible d'une restauration (docs/refonte/07-PLAN-EXECUTION.md §1.7, §2.2, §2.4).
 *
 * Deux gardes, un seul type de cible — les fonctions de `restauration.ts` reçoivent l'une ou l'autre :
 *
 * - `assertCibleLocale` (répétition, tests) : `repetition:refresh` DÉTRUIT puis recrée sa base cible.
 *   Il n'accepte donc, sans aucune exception, ni une URL de production (référence du projet n'importe
 *   où dans l'URL, pooler compris), ni un hôte non local, ni une base dont le nom n'est pas un nom de
 *   répétition ou de test (`nurea_repetition…`, `nurea_test…`) ;
 * - `gardeHoteConfirme` (retour arrière, `migration:rollback`) : la cible EST la production le jour J.
 *   Elle n'est acceptée que si `--confirm-host <hôte>` reproduit exactement son hôte
 *   (`scripts/lib/garde-hote.ts`) ; le retour arrière ne détruit aucune base, il vide des schémas.
 */
import { HostRefusedError, assertHostConfirmed, assertNotProduction, hostOf } from "../../lib/garde-hote";

export const HOTES_LOCAUX = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const NOM_BASE = /^nurea_(repetition|test)[a-z0-9_]*$/;

export interface Cible {
  url: string;
  hote: string;
  port: string;
  base: string;
}

/** Une garde : rend la cible décrite par l'URL, ou jette `HostRefusedError`. */
export type Garde = (url: string | undefined, usage: string) => Cible;

export function nomDeBase(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  } catch {
    throw new HostRefusedError("URL de base illisible.");
  }
}

function cible(url: string): Cible {
  return { url, hote: hostOf(url), port: new URL(url).port || "5432", base: nomDeBase(url) };
}

export const assertCibleLocale: Garde = (url, usage) => {
  const verifiee = assertNotProduction(url, usage);
  const hote = hostOf(verifiee);
  if (!HOTES_LOCAUX.has(hote)) {
    throw new HostRefusedError(`${usage} : ${hote} n'est pas un serveur local — la répétition ne cible qu'une base locale.`);
  }
  const base = nomDeBase(verifiee);
  if (!NOM_BASE.test(base)) {
    throw new HostRefusedError(
      `${usage} : « ${base} » n'est pas un nom de base de répétition (nurea_repetition… ou nurea_test…) — elle serait détruite.`,
    );
  }
  return cible(verifiee);
};

/**
 * Garde du retour arrière : toute cible est acceptée, SAUF la production sans `--confirm-host <hôte>`
 * exact. Aucune base n'est détruite (seuls des schémas sont vidés), d'où l'absence de contrainte de
 * nom ; c'est `assertHostConfirmed` qui porte le refus.
 */
export function gardeHoteConfirme(confirmHost: string | undefined): Garde {
  return (url, usage) => cible(assertHostConfirmed(url, confirmHost, usage));
}

/** URL de la base de maintenance (`postgres`) du même serveur, pour DROP / CREATE DATABASE. */
export function urlMaintenance(cible: Cible): string {
  const url = new URL(cible.url);
  url.pathname = "/postgres";
  return url.toString();
}
