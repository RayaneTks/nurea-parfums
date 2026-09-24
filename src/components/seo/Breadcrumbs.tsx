import type { FC } from "react";
import Link from "next/link";
import { BreadcrumbJsonLd } from "./JsonLd";

export interface Crumb {
  name: string;
  path: string;
}

/**
 * Fil d'Ariane visible ET balisé, depuis la même liste.
 *
 * Google n'accepte un `BreadcrumbList` que s'il reflète ce que la page montre ; deux listes
 * tenues à la main finissent par diverger (c'est arrivé à la FAQ de /marque). Ici il n'y en a
 * qu'une. Le dernier maillon est la page courante : texte, pas lien.
 */
export const Breadcrumbs: FC<{ items: Crumb[] }> = ({ items }) => (
  <>
    <BreadcrumbJsonLd items={items} />
    <nav aria-label="Fil d'Ariane">
      <ol className="nurea-caption flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="text-nurea-text">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link
                    href={item.path}
                    className="transition-colors duration-nurea ease-out hover:text-nurea-text"
                  >
                    {item.name}
                  </Link>
                  <span aria-hidden>/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  </>
);
