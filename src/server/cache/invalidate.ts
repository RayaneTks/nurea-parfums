import "server-only";
import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { logEvent } from "@/server/core/log";
import { ADMIN_CATALOGUE_CACHE_TAG, GESTION_TAG, PUBLIC_CATALOGUE_CACHE_TAG, familiesOf } from "@/server/cache/tags";

/**
 * Seul appelant de `updateTag`, `revalidateTag` et `revalidatePath` (04 §7.1, test `cache-calls`).
 * Appelé par le `finally` de `defineAction` : jamais par une lecture.
 */

/**
 * Après une écriture du catalogue : caches public et admin, pages concernées. Corps repris tel quel
 * de `src/lib/admin/revalidateAdminCatalogue.ts` (contrat vitrine, 04 §12).
 * `{ expire: 0 }` : invalidation immédiate (Next 16, route handlers).
 */
export function revalidateAdminCatalogue(): void {
  revalidateTag(PUBLIC_CATALOGUE_CACHE_TAG, { expire: 0 });
  revalidateTag(ADMIN_CATALOGUE_CACHE_TAG, { expire: 0 });
  revalidatePath("/admin/catalogue");
  revalidatePath("/");
}

/**
 * Modèles écrits → tags (04 §10.2). Sûr après un ROLLBACK (recalcul inutile) ; ne lève jamais, pour
 * ne pas transformer en échec une écriture déjà validée.
 */
export function invalidateWrittenModels(models: ReadonlySet<string>): void {
  const families = familiesOf(models);
  // `updateTag` : la page renvoyée par l'action relit ses propres écritures (V-lib-2, 04 §10.2).
  const steps: (() => void)[] = [];
  if (families.has("gestion")) steps.push(() => updateTag(GESTION_TAG));
  if (families.has("catalogue")) {
    steps.push(() => updateTag(ADMIN_CATALOGUE_CACHE_TAG));
    steps.push(revalidateAdminCatalogue);
  } else if (families.has("admin-catalogue")) {
    // Visuels story seuls : l'instantané de la gestion, sans recalculer la vitrine (04 §10.1).
    steps.push(() => updateTag(ADMIN_CATALOGUE_CACHE_TAG));
  }
  for (const step of steps) {
    try {
      step();
    } catch (cause) {
      logEvent("error", "invalidation", {
        models: [...models],
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }
}
