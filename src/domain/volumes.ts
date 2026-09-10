/**
 * Contenances des flacons — source unique.
 *
 * Cette liste vivait en six exemplaires (schémas Zod, validation d'API, menu
 * du formulaire commande, du ticket de vente, de la vente directe, du panneau
 * de tarifs). Six copies d'une même règle, c'est six occasions de diverger :
 * changer l'offre obligeait à retrouver chacune, et celle qu'on oubliait
 * refusait en silence une contenance que les autres proposaient.
 *
 * L'offre réelle est aujourd'hui 10 / 50 / 80 ml. Les anciennes fiches parlent
 * de 30 et de 100 ml : ce sont les mêmes flacons, désignés par une contenance
 * approximative. On ne les efface donc pas, on les traduit — voir
 * `LEGACY_VOLUME_ML` et `normalizeVolumeMl`.
 */

/** Contenances proposées à la saisie, dans l'ordre d'affichage. */
export const VOLUMES_ML = [10, 50, 80] as const;

export type VolumeMl = (typeof VOLUMES_ML)[number];

/**
 * Anciennes contenances et leur équivalent actuel.
 *
 * Historique : le catalogue annonçait 30 ml pour ce qui est en réalité un
 * flacon de 10 ml, et 100 ml pour un 80 ml. La correspondance est portée ici
 * plutôt que dans la migration SQL seule, parce qu'une base restaurée depuis
 * une sauvegarde ancienne, ou une ligne créée par un import, peut encore
 * remonter une valeur héritée bien après la migration.
 */
export const LEGACY_VOLUME_ML: Readonly<Record<number, VolumeMl>> = {
  30: 10,
  100: 80,
};

/** Contenance par défaut d'une nouvelle ligne. */
export const DEFAULT_VOLUME_ML: VolumeMl = 80;

export function isVolumeMl(v: number): v is VolumeMl {
  return (VOLUMES_ML as readonly number[]).includes(v);
}

/**
 * Traduit une contenance héritée, laisse passer une contenance courante,
 * et rend `null` pour tout le reste.
 *
 * `null` est un refus, pas une valeur par défaut : l'appelant doit décider
 * s'il rejette la saisie (une API) ou s'il affiche la valeur telle quelle (un
 * menu qui ne doit pas réécrire silencieusement une ligne déjà enregistrée).
 */
export function normalizeVolumeMl(v: number | null | undefined): VolumeMl | null {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  if (isVolumeMl(v)) return v;
  return LEGACY_VOLUME_ML[v] ?? null;
}

/** Vrai si la valeur est acceptable en entrée — contenance courante ou héritée. */
export function isAcceptedVolumeMl(v: number): boolean {
  return normalizeVolumeMl(v) !== null;
}

/**
 * Options d'un menu de contenance pour une ligne existante.
 *
 * Si la ligne porte une valeur hors offre que l'on n'a pas su traduire, on
 * l'ajoute à la liste au lieu de l'ignorer : un menu qui n'a pas d'option
 * correspondant à sa valeur affiche la première de la liste, et le prochain
 * enregistrement écrase une donnée que personne n'a voulu changer.
 */
export function volumeOptions(current: number | null | undefined): number[] {
  const base = [...VOLUMES_ML] as number[];
  if (current === null || current === undefined) return base;
  const normalized = normalizeVolumeMl(current);
  if (normalized !== null) return base;
  return [...base, current].sort((a, b) => a - b);
}

/** Libellé court d'une contenance (« 80 ml »). */
export function volumeLabel(v: number): string {
  return `${v} ml`;
}
