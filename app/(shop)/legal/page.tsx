import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Informations légales",
  description: `Mentions légales, conditions de vente et politique de confidentialité de ${SITE_NAME}.`,
  alternates: { canonical: "/legal" },
  /* Page d'attente : rien à indexer tant que le contenu n'est pas rédigé. */
  robots: { index: false, follow: true },
};

export default function LegalPage() {
  return (
    <section className="nurea-page py-18 pt-32 md:pt-40">
      <p className="nurea-label">Informations légales</p>
      <h1 className="nurea-title mt-4 text-nurea-text">Bientôt disponible</h1>
      <p className="nurea-body nurea-prose mt-6">
        Nous rédigeons cette section pour vous apporter toutes les précisions sur
        nos conditions et nos engagements. En attendant, écrivez-nous : nous
        répondons à toute question sur une commande ou une livraison.
      </p>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <Link href="/contact" className={buttonClass("outline")}>
          Nous écrire
        </Link>
        <Link href="/" className={buttonClass("link")}>
          Retour au catalogue
        </Link>
      </div>
    </section>
  );
}
