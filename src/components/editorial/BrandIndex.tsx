import type { FC } from "react";
import Link from "next/link";
import type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";

/**
 * L'index des marques du catalogue, en toutes lettres.
 *
 * « Une sélection des plus grandes marques » se disait en une phrase ; ici elle
 * se montre. Chaque nom mène au catalogue déjà filtré sur la marque (`?maison=`,
 * lu par `useCatalogFilters`) et descend jusqu'à la grille.
 *
 * Une typographie plutôt que des logos : les marques n'ont pas toutes un logo
 * en base, et un mur à trous ferait moins sérieux qu'une liste nette. Les noms
 * s'enchaînent comme dans l'index d'un livre, séparés par un tiret cuivre.
 *
 * Chaque lien fait 44 px de haut au minimum : c'est une liste qu'on touche du
 * pouce, pas seulement qu'on lit.
 *
 * Le séparateur précède chaque nom, et la liste est décalée à gauche de sa
 * largeur exacte (tiret de 8 px + écart de 16 px = `-ml-6`) dans un cadre qui
 * rogne ce qui dépasse. Le tiret du premier nom de CHAQUE ligne tombe donc hors
 * du cadre, quel que soit l'endroit où la ligne se coupe — sans mesurer quoi que
 * ce soit en JavaScript.
 */
export const BrandIndex: FC<{ brands: readonly CatalogBrowseBrand[] }> = ({ brands }) => {
  const tri = [...brands].sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));

  return (
    <div className="overflow-hidden">
      <ul className="-ml-6 flex flex-wrap items-center gap-x-4">
        {tri.map((brand) => (
          <li key={brand.id} className="flex items-center gap-x-4">
            <span aria-hidden className="h-px w-2 bg-nurea-accent" />
            <Link
              href={`/?maison=${encodeURIComponent(brand.slug)}#collection`}
              className="nurea-name inline-flex min-h-11 items-center text-nurea-text transition-colors duration-nurea ease-out hover:text-nurea-accent"
            >
              {brand.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
