import {
  fuzzySearchMatch,
  compareSearchRelevance,
  categories,
  type Category,
  type Perfume,
} from "./data";

export function parseCategoryParam(raw: string | null): Category {
  if (!raw) return "Tout voir";
  try {
    const decoded = decodeURIComponent(raw);
    return categories.includes(decoded as Category) ? (decoded as Category) : "Tout voir";
  } catch {
    return "Tout voir";
  }
}

/**
 * Recherche dans une liste catalogue (DB ou mock) : fuzzy + filtre catégorie.
 */
export function searchLocalCatalog(
  perfumes: Perfume[],
  query: string,
  options?: { category?: Category }
): Perfume[] {
  const q = query.trim();
  const cat = options?.category ?? "Tout voir";

  const list = perfumes.filter((perfume) => {
    const matchCategory =
      cat === "Tout voir" || perfume.category === cat;
    const matchSearch = fuzzySearchMatch(perfume, q);
    return matchSearch && matchCategory;
  });

  if (!q) {
    return list;
  }

  return [...list].sort((a, b) => compareSearchRelevance(a, b, q));
}
