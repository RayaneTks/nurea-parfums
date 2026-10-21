import Link from "next/link";
import { Search } from "lucide-react";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { buttonClass } from "@/components/ui/Button";
import { FIELD_CLASS } from "@/components/ui/Field";
import { brandFontClassName } from "@/design/fonts";
// Le root layout n'embarque aucune CSS (voir `app/layout.tsx`) : la page 404
// globale charge donc elle-même la feuille vitrine.
import "./globals.css";

/**
 * Page introuvable.
 *
 * Elle vit hors du groupe `(shop)` : ni barre haute ni pied de page. Elle doit donc suffire seule —
 * dire où l'on est (le logo), ce qui s'est passé (une phrase), et rendre la main : la recherche du
 * catalogue d'abord (le parfum cherché a pu changer d'adresse), puis deux sorties.
 *
 * La recherche est un formulaire GET vers `/?q=…#collection`, que le catalogue lit dans l'URL
 * (`useCatalogFilters`) : elle marche sans JavaScript.
 */
export default function NotFound() {
  return (
    <ThemeProvider>
      <main
        className={`${brandFontClassName} page-x flex min-h-svh flex-col items-center justify-center gap-8 bg-bg py-12 text-center`}
      >
        <Link href="/" aria-label="Nuréa Parfums — accueil" className="flex h-11 items-center">
          <BrandLogo className="h-10" />
        </Link>

        <div className="flex flex-col items-center gap-3">
          <h1 className="t-title">Page introuvable</h1>
          <p className="t-body t-measure">L&apos;adresse a pu changer, ou le parfum quitter le catalogue.</p>
        </div>

        <form action="/#collection" method="get" role="search" className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
          <label className="relative block flex-1">
            <span className="sr-only">Rechercher un parfum ou une marque</span>
            <Search size={18} strokeWidth={1.5} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
            <input type="search" name="q" required placeholder="Un parfum, une marque" className={`${FIELD_CLASS} pl-10 text-left`} />
          </label>
          <button type="submit" className={buttonClass("solid")}>
            Chercher
          </button>
        </form>

        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-6">
          <Link href="/" className={buttonClass("link")}>
            Voir le catalogue
          </Link>
          <Link href="/contact" className={buttonClass("link")}>
            Écrire à Nuréa
          </Link>
        </div>
      </main>
    </ThemeProvider>
  );
}
