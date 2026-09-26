import type { Perfume } from "@/lib/data";

/**
 * L'ordre du catalogue à l'arrivée sur l'accueil : différent à chaque visite, et varié en tête.
 *
 * L'accueil affichait les fiches dans l'ordre de la base — les douze plus anciennes, toujours les
 * mêmes, à chaque visite. Un client qui revient ne voyait rien de neuf sans faire défiler.
 *
 * Un mélange au hasard ne suffit pas : il sortirait volontiers quatre Louis Vuitton d'affilée. On
 * mélange donc, puis on distribue marque par marque, comme on distribue des cartes : un parfum de
 * chaque marque, dans un ordre de marques lui aussi tiré au sort, puis un deuxième de chacune, etc.
 * Tant qu'il reste des marques, deux voisins ne sont jamais de la même.
 *
 * Tirage côté serveur (l'accueil est rendu à chaque requête) : la grille arrive déjà dans son ordre,
 * le client l'hydrate telle quelle — ni clignotement, ni écart d'hydratation. Les tris explicites
 * (nom, marque) et la pertinence d'une recherche passent toujours devant cet ordre.
 */
export function discoveryOrder(perfumes: readonly Perfume[], random: () => number = Math.random): Perfume[] {
  const shuffled = shuffle(perfumes, random);

  const byBrand = new Map<string, Perfume[]>();
  for (const perfume of shuffled) {
    const key = perfume.brandSlug ?? perfume.brand;
    byBrand.set(key, [...(byBrand.get(key) ?? []), perfume]);
  }

  // L'ordre des marques est celui de leur première apparition dans le mélange : tiré au sort aussi.
  const piles = [...byBrand.values()];
  const out: Perfume[] = [];
  for (let round = 0; out.length < shuffled.length; round++) {
    for (const pile of piles) {
      const next = pile[round];
      if (next) out.push(next);
    }
  }
  return out;
}

/** Fisher-Yates sur une copie : le catalogue en cache n'est jamais modifié. */
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}
