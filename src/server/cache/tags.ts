import "server-only";
import { ADMIN_CATALOGUE_CACHE_TAG, PUBLIC_CATALOGUE_CACHE_TAG } from "@/lib/catalogue-service";

/**
 * Deux familles de tags, pas plus (04 §10.1). Les noms du contrat vitrine viennent de
 * `catalogue-service.ts` et ne sont jamais redéfinis ici.
 */

export { ADMIN_CATALOGUE_CACHE_TAG, PUBLIC_CATALOGUE_CACHE_TAG };

/** Toute donnée métier de la gestion et tous les chiffres. */
export const GESTION_TAG = "gestion";

export type CacheFamily = "gestion" | "catalogue";

/** Le catalogue apparaît aussi dans les écrans de gestion (stock, liens vers les parfums). */
const CATALOGUE_MODELS = new Set(["Brand", "Perfume", "PerfumePricing"]);

/** Écritures sans lecture cachée : le compte de connexion n'apparaît dans aucun écran. */
const UNCACHED_MODELS = new Set(["AdminUser"]);

/**
 * Familles à invalider après ces écritures. Un modèle inconnu de cette table (ajouté au schéma
 * depuis) invalide `gestion` : une invalidation de trop coûte une requête, une de moins un chiffre faux.
 */
export function familiesOf(models: Iterable<string>): Set<CacheFamily> {
  const families = new Set<CacheFamily>();
  for (const model of models) {
    if (UNCACHED_MODELS.has(model)) continue;
    families.add("gestion");
    if (CATALOGUE_MODELS.has(model)) families.add("catalogue");
  }
  return families;
}
