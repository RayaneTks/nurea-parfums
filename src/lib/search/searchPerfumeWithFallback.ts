import type { Category, Perfume } from "../data";
import type { PerfumeSearchResponse } from "./perfumeSearchTypes";
import { getCatalogPerfumes } from "../catalog/getCatalogPerfumes";
import { getUnlistedPerfumes, type UnlistedPerfume } from "../catalogue-service";
import { cleNom } from "../nommage";
import { getReferenceCatalogue } from "./reference/referenceCatalogue";
import { searchReference } from "./reference/searchReference";
import { searchLocalCatalog } from "./searchLocalCatalog";

/**
 * Orchestration, tout en interne : catalogue en ligne → parfums au catalogue sans carte publique →
 * référentiel des marques et parfums du monde (`reference/`). Aucun service tiers : la réponse ne
 * dépend ni d'une clé, ni d'un quota, ni d'une panne extérieure.
 */
export async function searchPerfumeWithFallback(
  query: string,
  options?: { category?: Category },
): Promise<PerfumeSearchResponse> {
  const cat = options?.category ?? "Tout voir";

  const catalog = await getCatalogPerfumes();
  const local = searchLocalCatalog(catalog, query, { category: cat });
  if (local.length > 0) {
    return { type: "local_results", query, results: local };
  }

  const q = query.trim();
  if (q.length < 3) {
    return { type: "no_results", query: q };
  }

  // Masqué, ou visuel pas encore prêt : la référence existe chez nous, on invite à écrire.
  const unlisted = searchUnlisted(await getUnlistedPerfumes(), q);
  if (unlisted) {
    return { type: "unlisted_match", query: q, match: unlisted };
  }

  // Pas chez nous : on reconnaît peut-être ce que le client cherche ; on l'invite à écrire.
  const reference = searchReference(getReferenceCatalogue(), q);
  if (reference) {
    return { type: "reference_match", query: q, match: reference };
  }

  return { type: "no_results", query: q };
}

/**
 * La référence hors vitrine la plus proche de la saisie, ou null. Le nom et la marque seulement ; `on` dit si la
 * saisie vise le parfum ou seulement sa marque.
 */
export function searchUnlisted(
  unlisted: readonly UnlistedPerfume[],
  query: string,
): (UnlistedPerfume & { on: "perfume" | "brand" }) | null {
  const asPerfumes: Perfume[] = unlisted.map((p, index) => ({
    id: index,
    name: p.name,
    brand: p.brand,
    category: "Sélections Individuelles",
    image: "",
  }));
  const [best] = searchLocalCatalog(asPerfumes, query);
  if (!best) return null;
  const key = cleNom(query);
  const brandOnly = key !== "" && cleNom(best.brand).includes(key) && !cleNom(best.name).includes(key);
  return { name: best.name, brand: best.brand, on: brandOnly ? "brand" : "perfume" };
}
