/**
 * Garde de la cible de répétition, variante locale (docs/refonte/07-PLAN-EXECUTION.md §2.2, §2.4).
 *
 * `repetition:refresh` DÉTRUIT puis recrée sa base cible. Il n'accepte donc, sans aucune exception :
 * - ni une URL de production (référence du projet n'importe où dans l'URL, pooler compris) ;
 * - ni un hôte non local ;
 * - ni une base dont le nom n'est pas un nom de répétition ou de test (`nurea_repetition…`, `nurea_test…`).
 */
import { HostRefusedError, assertNotProduction, hostOf } from "../../lib/garde-hote";

export const HOTES_LOCAUX = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const NOM_BASE = /^nurea_(repetition|test)[a-z0-9_]*$/;

export interface CibleLocale {
  url: string;
  hote: string;
  port: string;
  base: string;
}

export function nomDeBase(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  } catch {
    throw new HostRefusedError("URL de base illisible.");
  }
}

export function assertCibleLocale(url: string | undefined, usage: string): CibleLocale {
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
  return { url: verifiee, hote, port: new URL(verifiee).port || "5432", base };
}

/** URL de la base de maintenance (`postgres`) du même serveur, pour DROP / CREATE DATABASE. */
export function urlMaintenance(cible: CibleLocale): string {
  const url = new URL(cible.url);
  url.pathname = "/postgres";
  return url.toString();
}
