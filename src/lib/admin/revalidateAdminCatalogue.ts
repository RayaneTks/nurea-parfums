import { revalidatePath, revalidateTag } from "next/cache";
import {
  ADMIN_CATALOGUE_CACHE_TAG,
  PUBLIC_CATALOGUE_CACHE_TAG,
} from "@/lib/catalogue-service";

/**
 * Après mutation catalogue admin : purge caches public + admin et pages concernées.
 * `{ expire: 0 }` : invalidation immédiate (Next 16, route handlers).
 */
export function revalidateAdminCatalogue(): void {
  revalidateTag(PUBLIC_CATALOGUE_CACHE_TAG, { expire: 0 });
  revalidateTag(ADMIN_CATALOGUE_CACHE_TAG, { expire: 0 });
  revalidatePath("/admin/catalogue");
  revalidatePath("/");
}
