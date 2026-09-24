import Link from "next/link";
import { Monogram } from "@/components/editorial/Monogram";
import { buttonClass } from "@/components/ui/Button";
import { brandFontClassName } from "@/design/fonts";
// Le root layout n'embarque aucune CSS (voir `app/layout.tsx`) : la page 404
// globale charge donc elle-même la feuille vitrine.
import "./globals.css";

/**
 * Page introuvable.
 *
 * Elle vit hors du groupe `(shop)` : ni barre de navigation ni pied de page. Elle
 * doit donc suffire seule — dire où l'on est (le monogramme), ce qui s'est passé
 * (une phrase), et où aller (trois sorties, une seule en plein).
 *
 * Le monogramme est posé sur le fond uni de la page, jamais sur une photo : la
 * charte l'interdit nu sur une image.
 */
export default function NotFound() {
  return (
    <div
      className={`${brandFontClassName} flex min-h-svh flex-col items-center justify-center bg-nurea-bg px-6 py-18 text-center text-nurea-text`}
    >
      <Monogram className="w-24 text-nurea-accent md:w-32" />

      <p className="nurea-label mt-10">Erreur 404</p>
      <h1 className="nurea-title mt-4">Page introuvable</h1>
      <p className="nurea-lead nurea-prose mt-6">
        L&apos;adresse a pu changer, ou le parfum quitter le catalogue.
      </p>

      <div className="mt-10 flex w-full max-w-xs flex-col gap-4 sm:max-w-none sm:w-auto sm:flex-row sm:items-center">
        <Link href="/" className={buttonClass("solid")}>
          Voir le catalogue
        </Link>
        <Link href="/contact" className={buttonClass("outline")}>
          Nous écrire
        </Link>
      </div>
      <Link href="/marque" className={buttonClass("link", "mt-6")}>
        La parfumerie
      </Link>
    </div>
  );
}
