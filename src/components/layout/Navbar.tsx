"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Heart, Moon, Search, Sun } from "lucide-react";
import { useSyncExternalStore, type FC } from "react";
import { BrandLogo } from "./BrandLogo";
import { parseSelection, readSelectionRaw, subscribeSelection } from "@/lib/selection";
import { cn } from "@/lib/utils";

/** Événement écouté par `CatalogSection` pour ouvrir les filtres (bouton retiré de la barre en T5, filtres refaits en T11). */
export const OPEN_CATALOG_FILTERS_EVENT = "nurea:open-catalog-filters";

/** Diffusé par le cœur de la barre ; la feuille « Ma sélection » (T13) l'écoute. */
export const OPEN_SELECTION_EVENT = "nurea:open-selection";

const NAV_LINKS = [
  { href: "/", label: "Catalogue" },
  { href: "/parfums", label: "Marques" },
  { href: "/marque", label: "La parfumerie" },
  { href: "/contact", label: "Contact" },
] as const;

/** « Marques » reste allumé sur une page marque ou parfum ; l'accueil, lui, n'a pas de descendant. */
function isCurrent(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function readSelectionCount(): number {
  return parseSelection(readSelectionRaw()).length;
}

const ICON_BUTTON =
  "press relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-fg-1 transition-[background-color,transform] duration-dur-2 ease-soft mouse-hover:bg-surface-2";

/**
 * Barre haute de la vitrine, en verre (DESIGN.md § Matière) : logo, recherche
 * permanente, Ma sélection, thème. Collante plutôt que fixe : elle tient sa
 * place dans le flux, aucune page n'a à compenser sa hauteur.
 *
 * Sur téléphone, le champ passe sous le logo, pleine largeur ; dès 768 px il
 * rejoint la ligne. Le champ envoie `?q=` à l'accueil, que le catalogue lit
 * déjà ; les résultats en direct arrivent en T10.
 */
export const Navbar: FC = () => {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const count = useSyncExternalStore(subscribeSelection, readSelectionCount, () => 0);

  return (
    <header className="glass sticky top-0 z-sticky border-b border-line pt-[env(safe-area-inset-top,0px)]">
      <div className="page-x flex flex-wrap items-center gap-x-2 md:h-16 md:flex-nowrap md:gap-x-4">
        <Link
          href="/"
          aria-label="Nuréa Parfums — accueil"
          className="mr-auto flex h-14 shrink-0 items-center md:mr-0 md:h-auto"
        >
          <BrandLogo priority className="h-6" />
        </Link>

        <nav aria-label="Navigation principale" className="hidden lg:block">
          <ul className="flex items-center">
            {NAV_LINKS.map(({ href, label }) => {
              const current = isCurrent(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center px-3 transition-colors duration-dur-2 ease-soft",
                      current ? "text-fg-1" : "text-fg-3 mouse-hover:text-fg-1"
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <form
          action="/"
          method="get"
          role="search"
          className="order-last mb-3 basis-full md:order-none md:mb-0 md:ml-auto md:max-w-sm md:flex-1 md:basis-auto"
        >
          <label className="relative block">
            <span className="sr-only">Rechercher un parfum ou une marque</span>
            <Search
              size={18}
              strokeWidth={1.5}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3"
            />
            <input
              type="search"
              name="q"
              enterKeyHint="search"
              autoComplete="off"
              placeholder="Parfum, marque…"
              className="h-11 w-full rounded-md border border-line bg-surface-1 pl-10 pr-3 text-fg-1 transition-colors duration-dur-2 ease-soft placeholder:text-fg-3"
            />
          </label>
        </form>

        <div className="flex items-center">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SELECTION_EVENT))}
            aria-label={
              count > 0
                ? `Ma sélection, ${count} parfum${count > 1 ? "s" : ""}`
                : "Ma sélection, vide"
            }
            className={ICON_BUTTON}
          >
            <Heart size={20} strokeWidth={1.5} aria-hidden />
            {count > 0 && (
              <span
                aria-hidden
                className="t-caption absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-fg-1 px-1 text-bg"
              >
                {count}
              </span>
            )}
          </button>

          {/* L'icône suit le thème en CSS ; seul le geste lit `resolvedTheme`. */}
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
            aria-label="Changer de thème (clair ou sombre)"
            className={ICON_BUTTON}
          >
            <Sun size={20} strokeWidth={1.5} aria-hidden className="[.light_&]:hidden" />
            <Moon size={20} strokeWidth={1.5} aria-hidden className="hidden [.light_&]:block" />
          </button>
        </div>
      </div>
    </header>
  );
};
