import { revalidatePath, revalidateTag } from "next/cache";
import { ADMIN_CATALOGUE_CACHE_TAG } from "./getCatalogueSnapshot";

/**
 * Après mutation catalogue : purge le snapshot `unstable_cache` et la page admin catalogue.
 * `{ expire: 0 }` : invalidation immédiate (requis Next 16 pour les route handlers, évite un hit « stale »).
 */
export function revalidateAdminCatalogue(): void {
  revalidateTag(ADMIN_CATALOGUE_CACHE_TAG, { expire: 0 });
  revalidatePath("/admin/catalogue");
}
