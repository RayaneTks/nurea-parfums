import type { Metadata } from "next";
import Link from "next/link";
import { EditorialPhoto } from "@/components/editorial/EditorialPhoto";
import { FaqAccordion } from "@/components/editorial/FaqAccordion";
import { OrderSteps } from "@/components/editorial/OrderSteps";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarqueFaqJsonLd } from "@/components/seo/MarqueFaqJsonLd";
import { buttonClass } from "@/components/ui/Button";
import { MARQUE_FAQ } from "@/lib/marqueFaq";
import { MENTION_FLACONS } from "@/lib/mentions";
import { pageOg, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Qui sommes-nous — parfumerie à Marseille",
  description: `${SITE_NAME}, parfumerie à Marseille : chaque parfum vous est remis dans un flacon Nuréa personnalisé. Commande sur Snapchat, remise en main propre ou envoi partout en France.`,
  keywords: ["Nuréa Parfums", "parfumerie marseille", "nurea parfum"],
  alternates: { canonical: "/marque" },
  openGraph: pageOg("/marque"),
};

const DOMAINE = SITE_URL.replace(/^https?:\/\//, "");

/**
 * La parfumerie — qui est Nuréa, comment on commande, comment la reconnaître.
 *
 *   ouverture  — le titre, une phrase, la photo de l'atelier (`EditorialPhoto`) ;
 *   commander  — trois temps, chacun avec sa photo ;
 *   photos     — ce que montrent les photos du catalogue (`MENTION_FLACONS`) — loin des photos du
 *                flacon Nuréa, dont elle passerait sinon pour la légende ;
 *   site       — l'adresse et l'orthographe, contre les homonymes ;
 *   questions  — repliées ;
 *   clôture    — le seul bouton plein : le catalogue.
 *
 * Rien n'y est inventé : chaque phrase est un fait du gérant. Aucune contenance, aucun prix.
 */
export default function MarquePage() {
  return (
    <div className="page-x pb-[var(--space-section)] pt-2">
      <MarqueFaqJsonLd />

      <Breadcrumbs
        items={[
          { name: "Accueil", path: "/" },
          { name: "La parfumerie", path: "/marque" },
        ]}
      />
      <section className="mt-2 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:items-center md:gap-16">
        <div className="flex flex-col gap-4">
          <h1 className="t-title enter">La parfumerie</h1>
          <p className="t-body t-measure enter">
            {SITE_NAME} vous remet chaque parfum du catalogue dans un flacon Nuréa. On commande sur Snapchat ; la
            remise se fait en main propre à Marseille, ou par envoi partout en France.
          </p>
        </div>

        <EditorialPhoto name="atelier" priority sizes="(min-width: 768px) 24rem, 100vw" className="aspect-[2/3] rounded-lg max-md:aspect-[4/5]" />
      </section>

      <section aria-labelledby="commander-titre" className="mt-[var(--space-section)]">
        <h2 id="commander-titre" className="t-title mb-6">
          Commander
        </h2>
        <OrderSteps wide />
      </section>

      <section aria-labelledby="photos-titre" className="mt-[var(--space-section)] flex flex-col gap-2">
        <h2 id="photos-titre" className="t-subtitle">
          Les photos du catalogue
        </h2>
        <p className="t-body t-measure">{MENTION_FLACONS}</p>
      </section>

      <section aria-labelledby="site-titre" className="mt-[var(--space-section)]">
        <h2 id="site-titre" className="t-title mb-6">
          Le site officiel
        </h2>
        <dl className="grid gap-6 md:grid-cols-2">
          <div className="border-t border-line pt-4">
            <dt className="t-caption">L&apos;adresse</dt>
            <dd className="t-subtitle mt-1">{DOMAINE}</dd>
            <dd className="t-body mt-1">Toute autre adresse n&apos;est pas la nôtre.</dd>
          </div>
          <div className="border-t border-line pt-4">
            <dt className="t-caption">L&apos;orthographe</dt>
            <dd className="t-subtitle mt-1">Nuréa, avec un é</dd>
            <dd className="t-body mt-1">
              Parfums, avec un s. « Nurae Parfum », marque britannique au nom voisin, n&apos;a aucun lien avec nous.
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="questions-titre" className="mt-[var(--space-section)]">
        <h2 id="questions-titre" className="t-title mb-6">
          Questions fréquentes
        </h2>
        <FaqAccordion entries={MARQUE_FAQ} />
      </section>

      <section className="mt-[var(--space-section)] flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Link href="/#collection" className={buttonClass("solid", "w-full sm:w-auto")}>
          Voir le catalogue
        </Link>
        <Link href="/contact" className={buttonClass("link")}>
          Nous écrire
        </Link>
      </section>
    </div>
  );
}
