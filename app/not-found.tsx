import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { brandFontClassName } from "@/design/fonts";
// Le root layout n'embarque aucune CSS (voir `app/layout.tsx`) : la page 404
// globale charge donc elle-même la feuille vitrine.
import "./globals.css";

export default function NotFound() {
  return (
    <div
      className={`${brandFontClassName} flex min-h-svh flex-col items-center justify-center bg-nurea-bg px-6 py-20 text-center text-nurea-text`}
    >
      <p className="nurea-label">Erreur 404</p>
      <h1 className="nurea-title mt-4">Page introuvable</h1>
      <p className="nurea-body nurea-prose mt-6">
        Cette adresse ne correspond à aucun parfum ni à aucune page du catalogue.
      </p>
      <Link href="/" className={buttonClass("outline", "mt-10")}>
        Voir le catalogue
      </Link>
    </div>
  );
}
