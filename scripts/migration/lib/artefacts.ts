/**
 * Sorties des scripts de migration et de répétition (docs/refonte/07-PLAN-EXECUTION.md §1.6, §2.2).
 *
 * Tout ce qui contient des données réelles va dans `migration-artifacts/<AAAA-MM-JJ>/`, dossier
 * ignoré par Git. Règle des chemins passés en argument :
 * - un dossier de SORTIE relatif (`--out prod/`, `--report prod/`) est rangé sous le dossier du
 *   jour : `migration-artifacts/<date>/prod/` — jamais à côté du code, où il risquerait d'être commité ;
 * - un fichier d'ENTRÉE relatif (`--reference prod/reference.json`) est cherché d'abord depuis le
 *   répertoire courant, puis sous le dossier du jour ;
 * - un chemin absolu est pris tel quel.
 */
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "./prisma-cli";

export const RACINE_ARTEFACTS = path.join(PROJECT_ROOT, "migration-artifacts");

/** Date locale AAAA-MM-JJ. */
export function dateLocale(instant: Date = new Date()): string {
  const deux = (n: number) => String(n).padStart(2, "0");
  return `${instant.getFullYear()}-${deux(instant.getMonth() + 1)}-${deux(instant.getDate())}`;
}

/** Heure locale HHMMSS. */
export function heureLocale(instant: Date = new Date()): string {
  const deux = (n: number) => String(n).padStart(2, "0");
  return `${deux(instant.getHours())}${deux(instant.getMinutes())}${deux(instant.getSeconds())}`;
}

export function dossierDuJour(): string {
  return path.join(RACINE_ARTEFACTS, dateLocale());
}

export function resoudreSortie(chemin: string | undefined): string {
  if (!chemin) return dossierDuJour();
  return path.isAbsolute(chemin) ? chemin : path.join(dossierDuJour(), chemin);
}

export function resoudreEntree(chemin: string): string {
  if (path.isAbsolute(chemin)) return chemin;
  const depuisCourant = path.resolve(chemin);
  if (fs.existsSync(depuisCourant)) return depuisCourant;
  return path.join(dossierDuJour(), chemin);
}

export function ecrireFichier(chemin: string, contenu: string): void {
  fs.mkdirSync(path.dirname(chemin), { recursive: true });
  fs.writeFileSync(chemin, contenu, "utf8");
}

/** JSON indenté, ordre des clés = ordre de construction (les objets sont construits dans un ordre fixe). */
export function json(valeur: unknown): string {
  return `${JSON.stringify(valeur, null, 2)}\n`;
}

/** Tri stable par identifiant, ordre des unités de code (= collation "C" pour des identifiants ASCII). */
export function parId<T>(lignes: readonly T[], cle: (ligne: T) => string | number): T[] {
  return [...lignes].sort((a, b) => {
    const ka = cle(a);
    const kb = cle(b);
    if (typeof ka === "number" && typeof kb === "number") return ka - kb;
    const sa = String(ka);
    const sb = String(kb);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });
}
