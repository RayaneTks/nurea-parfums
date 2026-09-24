import type { Perfume } from "@/lib/data";

/**
 * Les flacons qui illustrent une page éditoriale.
 *
 * Ordre de préférence : les parfums mis en avant depuis la gestion d'abord —
 * c'est le choix de l'opérateur, il prime —, puis le reste du catalogue. Une
 * marque n'apparaît qu'une fois : trois flacons de la même marque diraient
 * « une marque », pas « une parfumerie ».
 *
 * Les gammes complètes sont écartées : leur « visuel » est celui de la marque,
 * pas celui d'un flacon, et ces pages montrent des flacons.
 *
 * Déterministe : même catalogue, mêmes flacons. Une page qui changerait
 * d'images à chaque visite paraîtrait instable, et ne se mettrait pas en cache.
 */
export function choisirFlacons(perfumes: readonly Perfume[], combien: number): Perfume[] {
  const flacons = perfumes.filter((p) => p.category !== "Gammes Complètes" && p.image.trim() !== "");
  const ordonnes = [...flacons.filter((p) => p.isFeatured), ...flacons.filter((p) => !p.isFeatured)];

  const vues = new Set<string>();
  const choisis: Perfume[] = [];
  for (const parfum of ordonnes) {
    const marque = parfum.brand.trim().toLowerCase();
    if (vues.has(marque)) continue;
    vues.add(marque);
    choisis.push(parfum);
    if (choisis.length === combien) break;
  }
  return choisis;
}

/**
 * Le parfum désigné par les paramètres d'une URL (`?parfum=…&marque=…`), s'il est
 * au catalogue. Comparaison sans casse ni espaces de bord : l'URL a pu être
 * recopiée à la main.
 */
export function trouverParfum(
  perfumes: readonly Perfume[],
  nom: string,
  marque: string,
): Perfume | undefined {
  const n = nom.trim().toLowerCase();
  const m = marque.trim().toLowerCase();
  if (!n) return undefined;
  return perfumes.find(
    (p) =>
      p.category !== "Gammes Complètes" &&
      p.name.trim().toLowerCase() === n &&
      (!m || p.brand.trim().toLowerCase() === m),
  );
}
