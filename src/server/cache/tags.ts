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

/**
 * Ce qu'une écriture invalide : les deux familles de `cached()`, et `admin-catalogue` seul pour un modèle
 * que la gestion lit dans l'instantané du catalogue mais que la vitrine ne lit pas (04 §10.1).
 */
export type InvalidationFamily = CacheFamily | "admin-catalogue";

/** Le catalogue apparaît aussi dans les écrans de gestion (stock, liens vers les parfums). */
const CATALOGUE_MODELS = new Set(["Brand", "Perfume", "PerfumePricing"]);

/** Visuels story : pastille de E15 et fiche E16, jamais la vitrine (03 §6.2) — pas de `revalidateAdminCatalogue()`. */
const ADMIN_CATALOGUE_MODELS = new Set(["PerfumeMedia"]);

/** Écritures sans lecture cachée : le compte de connexion n'apparaît dans aucun écran. */
const UNCACHED_MODELS = new Set(["AdminUser"]);

/**
 * Familles à invalider après ces écritures. Un modèle inconnu de cette table (ajouté au schéma
 * depuis) invalide `gestion` : une invalidation de trop coûte une requête, une de moins un chiffre faux.
 */
export function familiesOf(models: Iterable<string>): Set<InvalidationFamily> {
  const families = new Set<InvalidationFamily>();
  for (const model of models) {
    if (UNCACHED_MODELS.has(model)) continue;
    families.add("gestion");
    if (CATALOGUE_MODELS.has(model)) families.add("catalogue");
    if (ADMIN_CATALOGUE_MODELS.has(model)) families.add("admin-catalogue");
  }
  return families;
}
