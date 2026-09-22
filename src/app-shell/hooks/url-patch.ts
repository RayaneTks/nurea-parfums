/**
 * Écriture d'une query sans bruit (04 §3.7, 05 §5.4 « deep-links stables ») : `null` ou `""`
 * retire la clé, une valeur égale au défaut aussi — l'URL de l'état par défaut reste nue.
 */

export type UrlPatch = Record<string, string | number | boolean | null | undefined>;

export function applyUrlPatch(
  pathname: string,
  search: string,
  patch: UrlPatch,
  defaults: Record<string, string> = {},
): string {
  const params = new URLSearchParams(search);
  for (const [key, raw] of Object.entries(patch)) {
    if (raw === undefined) continue;
    const value = raw === null || raw === false ? "" : raw === true ? "1" : String(raw);
    if (value === "" || defaults[key] === value) params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Lit un paramètre à valeurs fermées ; toute valeur inconnue retombe sur le défaut. */
export function readEnum<T extends string>(value: string | null, values: readonly T[], fallback: T): T {
  return value !== null && (values as readonly string[]).includes(value) ? (value as T) : fallback;
}
