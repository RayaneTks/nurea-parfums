/** `searchParams` d'une page du shell (Next 16 : une promesse). */
export type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Première valeur d'un paramètre de recherche (`?doc=a&doc=b` → « a »). */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
