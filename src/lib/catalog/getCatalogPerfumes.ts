import type { Perfume } from "@/lib/data";
import { getCachedCatalogue } from "@/lib/catalogue-service";

/**
 * Parfums affichés sur le catalogue public (données via cache tag `public-catalogue`).
 */
export async function getCatalogPerfumes(): Promise<Perfume[]> {
  const { perfumes } = await getCachedCatalogue();
  return perfumes;
}
