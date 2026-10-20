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
 * qu'une. Le dernier maillon est la page courante : texte, pas lien. Chaque lien garde 44 px de
 * haut : sur téléphone, c'est le chemin du retour.
 */
export const Breadcrumbs: FC<{ items: Crumb[] }> = ({ items }) => (
  <>
    <BreadcrumbJsonLd items={items} />
    <nav aria-label="Fil d'Ariane">
      <ol className="t-caption flex flex-wrap items-center gap-x-2">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={item.path} className="flex min-w-0 items-center gap-2">
              {last ? (
                <span aria-current="page" className="flex min-h-11 items-center text-fg-2 [overflow-wrap:anywhere]">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link
                    href={item.path}
                    className="flex min-h-11 items-center underline-offset-4 transition-colors duration-dur-1 ease-soft mouse-hover:text-fg-1 mouse-hover:underline"
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
