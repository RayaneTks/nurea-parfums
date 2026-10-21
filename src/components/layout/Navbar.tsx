"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useSyncExternalStore, type FC } from "react";
import { BrandLogo } from "./BrandLogo";
import { SearchBox } from "./SearchBox";
import { OPEN_SELECTION_EVENT } from "./searchEvents";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { parseSelection, readSelectionRaw, subscribeSelection } from "@/lib/selection";
import { cn } from "@/lib/utils";

/* Les événements de la barre vivent dans `searchEvents.ts` ; ré-exportés ici pour le catalogue. */
export { OPEN_CATALOG_FILTERS_EVENT, OPEN_SELECTION_EVENT, QUERY_SYNC_EVENT, SEARCH_EVENT } from "./searchEvents";

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
 * Sur téléphone, le champ (`SearchBox`, avec ses suggestions) passe sous le logo,
 * pleine largeur ; dès 768 px il rejoint la ligne. Sur l'accueil, la grille suit la
 * frappe (`SEARCH_EVENT`) ; ailleurs, le champ envoie `/?q=`.
 */
export const Navbar: FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const count = useSyncExternalStore(subscribeSelection, readSelectionCount, () => 0);

  return (
    <header className="glass sticky top-0 z-sticky border-b border-line pt-[env(safe-area-inset-top,0px)]">
      <div className="page-x flex flex-wrap items-center gap-x-2 md:h-16 md:flex-nowrap md:gap-x-4">
        <Link
          href="/"
          aria-label="Nuréa Parfums — accueil"
          className="mr-auto flex h-14 shrink-0 items-center md:mr-0 md:h-auto"
        >
          <BrandLogo priority className="h-10" />
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
                      current ? "text-fg-1 underline decoration-accent decoration-2 underline-offset-8" : "text-fg-3 mouse-hover:text-fg-1"
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <SearchBox />

        <div className="flex items-center">
          <button
            type="button"
            onClick={() =>
              pathname === "/"
                ? window.dispatchEvent(new CustomEvent(OPEN_SELECTION_EVENT))
                : router.push("/?selection=1")
            }
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
                className="t-caption absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-on-accent"
              >
                {count}
              </span>
            )}
          </button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
