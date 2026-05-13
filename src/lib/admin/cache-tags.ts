/**
 * Cache tags pour revalidation ciblée (Next App Router).
 *
 * Pattern :
 * - `unstable_cache(...).withTags([tagFor.orders()])` côté queries serveur.
 * - `revalidateTag(tagFor.orders())` après chaque mutation pertinente.
 *
 * Centralise les tags pour éviter typos. Tous lowercase, séparateur ':'.
 */
export const tagFor = {
  orders: () => "admin:orders",
  order: (id: string) => `admin:order:${id}`,
  sales: () => "admin:sales",
  sale: (id: string) => `admin:sale:${id}`,
  customers: () => "admin:customers",
  customer: (id: string) => `admin:customer:${id}`,
  perfumes: () => "admin:perfumes",
  perfume: (id: number) => `admin:perfume:${id}`,
  brands: () => "admin:brands",
  pricings: () => "admin:pricings",
  pricing: (perfumeId: number) => `admin:pricing:${perfumeId}`,
  kpi: () => "admin:kpi",
  pipeline: () => "admin:pipeline",
} as const;

export type AdminCacheTag = ReturnType<(typeof tagFor)[keyof typeof tagFor]>;
