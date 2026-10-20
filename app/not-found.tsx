import Link from "next/link";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { buttonClass } from "@/components/ui/Button";
import { brandFontClassName } from "@/design/fonts";
// Le root layout n'embarque aucune CSS (voir `app/layout.tsx`) : la page 404
// globale charge donc elle-même la feuille vitrine.
import "./globals.css";

/**
 * Page introuvable.
 *
 * Elle vit hors du groupe `(shop)` : ni barre haute ni pied de page. Elle doit
 * donc suffire seule — dire où l'on est (le logo), ce qui s'est passé (une
 * phrase), et où aller (un bouton primaire, deux sorties secondaires).
 */
export default function NotFound() {
  return (
    <ThemeProvider>
      <main
        className={`${brandFontClassName} page-x flex min-h-svh flex-col items-center justify-center gap-6 bg-bg py-12 text-center`}
      >
        <Link href="/" aria-label="Nuréa Parfums — accueil" className="flex h-11 items-center">
          <BrandLogo className="h-6" />
        </Link>

        <div className="flex flex-col items-center gap-3">
          <p className="t-caption">Erreur 404</p>
          <h1 className="t-title">Page introuvable</h1>
          <p className="t-body t-measure">
            L&apos;adresse a pu changer, ou le parfum quitter le catalogue.
          </p>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
          <Link href="/" className={buttonClass("solid")}>
            Voir le catalogue
          </Link>
          <Link href="/contact" className={buttonClass("outline")}>
            Écrire à Nuréa
          </Link>
        </div>
        <Link href="/marque" className={buttonClass("link")}>
          La parfumerie
        </Link>
      </main>
    </ThemeProvider>
  );
}
