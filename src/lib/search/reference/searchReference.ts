import { normalizeForFuzzy } from "../../data";
import { scoreExternalPerfumeRelevance, MIN_PERFUME_EXTERNAL_SCORE } from "../searchExternalPerfumeApi";

/** Une marque du référentiel : une ligne commerciale (Emporio Armani ≠ Giorgio Armani). */
export interface ReferenceBrand {
  brand: string;
  /** Variantes tapées par les clients, sans accents ni casse (« paco rabanne », « ysl »). */
  aliases?: string[];
  perfumes: string[];
}

export type ReferenceMatch =
  | { kind: "perfume"; name: string; brand: string }
  | { kind: "brand"; brand: string };

interface IndexedBrand {
  brand: string;
  names: string[];
  perfumes: { name: string; norm: string }[];
}

/** Score que `scoreExternalPerfumeRelevance` rend quand seule la marque correspond. */
const BRAND_ONLY_SCORE = 78;

const indexCache = new WeakMap<readonly ReferenceBrand[], IndexedBrand[]>();

function indexOf(data: readonly ReferenceBrand[]): IndexedBrand[] {
  let index = indexCache.get(data);
  if (!index) {
    index = data.map((b) => ({
      brand: b.brand,
      names: [b.brand, ...(b.aliases ?? [])].map(normalizeForFuzzy).filter(Boolean),
      perfumes: b.perfumes.map((name) => ({ name, norm: normalizeForFuzzy(name) })),
    }));
    indexCache.set(data, index);
  }
  return index;
}

/** Score de la saisie contre une marque (nom ou alias) : exact seulement, la marque se tape en entier. */
function brandScore(nq: string, names: readonly string[]): number {
  let best = 0;
  for (const n of names) {
    if (n === nq) best = Math.max(best, 100);
    else if (n.startsWith(nq) && nq.length >= 4) best = Math.max(best, 90);
  }
  return best;
}

/**
 * La référence du référentiel la plus proche de la saisie, ou null.
 *
 * Le référentiel recense des parfums qui ne sont PAS au catalogue : il ne sert qu'à reconnaître ce
 * que le client cherche pour l'inviter à nous écrire. Une saisie qui vise une marque seule
 * (« emporio armani ») renvoie la marque ; une saisie qui vise un parfum, avec ou sans marque
 * (« stronger with you », « armani stronger »), renvoie le parfum.
 */
export function searchReference(
  data: readonly ReferenceBrand[],
  query: string,
): ReferenceMatch | null {
  const nq = normalizeForFuzzy(query);
  if (nq.length < 3) return null;

  let bestPerfume: { score: number; name: string; brand: string } | null = null;
  let bestBrand: { score: number; brand: string } | null = null;

  for (const entry of indexOf(data)) {
    const bs = brandScore(nq, entry.names);
    if (bs > (bestBrand?.score ?? 0)) bestBrand = { score: bs, brand: entry.brand };

    for (const p of entry.perfumes) {
      // Le nom seul d'abord (« Aventus »), puis marque + nom (« creed aventus »).
      const withBrand = scoreExternalPerfumeRelevance(query, p.name, entry.brand);
      const nameOnly = scoreExternalPerfumeRelevance(query, p.name, "");
      const score = withBrand === BRAND_ONLY_SCORE ? nameOnly : Math.max(withBrand, nameOnly);
      // 78 = « la marque contient la saisie » : ce n'est pas un parfum, c'est une saisie de marque.
      if (score >= MIN_PERFUME_EXTERNAL_SCORE && score > (bestPerfume?.score ?? 0)) {
        bestPerfume = { score, name: p.name, brand: entry.brand };
      }
    }
  }

  if (bestBrand && bestBrand.score >= 90 && (!bestPerfume || bestPerfume.score < 100)) {
    return { kind: "brand", brand: bestBrand.brand };
  }
  if (bestPerfume) return { kind: "perfume", name: bestPerfume.name, brand: bestPerfume.brand };
  return null;
}
