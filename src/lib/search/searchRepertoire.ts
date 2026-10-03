import type { Perfume } from "../data";
import { cleNom } from "../nommage";
import repertoire from "./repertoire-parfums.json";
import { searchLocalCatalog } from "./searchLocalCatalog";

/**
 * Répertoire des parfums qui existent ailleurs que chez nous : marque, ligne, nom et graphies
 * courantes (`repertoire-parfums.json`, ~3 700 références, constitué le 03/10/2026).
 *
 * Il sert un seul but : qu'une recherche sur la vitrine ne tombe jamais dans le vide. Un parfum
 * absent du catalogue mais reconnu ici donne « Vous cherchez Khamrah de Lattafa ? » et une demande
 * pré-remplie, au lieu de « Aucun résultat ». Rien de ce répertoire ne s'affiche en grille, et rien
 * n'y affirme une disponibilité : c'est une invitation à écrire.
 *
 * Lu côté serveur seulement (route `/api/perfume-search`) : il ne pèse pas sur la page.
 */
type ReferenceEntry = { brand: string; line?: string; name: string; aliases?: string[] };

export type ReferenceMatch = { name: string; brand: string; line?: string; on: "perfume" | "brand" };

const ENTRIES: Perfume[] = (repertoire as ReferenceEntry[]).map((entry, index) => ({
  id: index,
  name: entry.name,
  brand: entry.brand,
  line: entry.line,
  aliases: entry.aliases,
  category: "Sélections Individuelles",
  image: "",
}));

/** La référence du répertoire la plus proche de la saisie, ou null. */
export function searchRepertoire(query: string, entries: Perfume[] = ENTRIES): ReferenceMatch | null {
  const [best] = searchLocalCatalog(entries, query);
  if (!best) return null;
  const key = cleNom(query);
  const brand = cleNom(best.brand);
  // « lattafa » vise la marque, même si un de ses parfums porte son nom (« Fakhar Lattafa Black »).
  const brandOnly = key !== "" && (brand === key || (brand.includes(key) && !cleNom(best.name).includes(key)));
  return {
    name: best.name,
    brand: best.brand,
    ...(best.line ? { line: best.line } : {}),
    on: brandOnly ? "brand" : "perfume",
  };
}
