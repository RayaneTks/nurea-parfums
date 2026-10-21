import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buttonClass } from "@/components/ui/Button";
import { MENTION_PHOTOS } from "@/lib/mentions";
import { pageOg, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Informations légales",
  description: `Mentions légales, conditions de vente et politique de confidentialité de ${SITE_NAME}.`,
  alternates: { canonical: "/legal" },
  // Sans cette ligne, la page heritait de l'og du layout et annoncait l'URL de
  // l'accueil comme etant la sienne.
  openGraph: pageOg("/legal"),
  /* Page d'attente : rien à indexer tant que le contenu n'est pas rédigé. */
  robots: { index: false, follow: true },
};

/**
 * Ce qui est déjà établi, et qu'on peut dire dès aujourd'hui.
 *
 * Seulement des faits connus. Les mentions légales proprement dites (éditeur,
 * immatriculation, hébergeur), les conditions de vente et la politique de
 * confidentialité restent « en préparation » tant qu'elles ne sont pas rédigées
 * à partir des vraies informations : un texte légal inventé engage plus qu'une
 * page d'attente honnête.
 */
const ETABLI = [
  { title: "Photographies", text: `${MENTION_PHOTOS} Elles restent notre propriété, même partagées.` },
  {
    title: "Flacons",
    text: "Nos parfums sont remis dans nos flacons Nuréa personnalisés. Les flacons photographiés, ceux des marques, illustrent chaque référence : ce ne sont pas ceux que vous recevez.",
  },
  {
    title: "Marques citées",
    text: "Les noms de marques et de parfums cités appartiennent à leurs titulaires respectifs.",
  },
] as const;

/** Les documents annoncés par le pied de page. */
const A_VENIR = ["Mentions légales", "Politique de confidentialité", "CGV / CGU", "Livraison & retours"] as const;

/**
 * Mise en page (refonte 2026-10) : titre, statut et sorties ; ce qui est établi, en trois filets ;
 * les documents à venir, en liste. Le texte juridique n'a pas changé d'un mot.
 */
export default function LegalPage() {
  return (
    <div className="page-x pb-[var(--space-section)] pt-2">
      <section className="flex flex-col items-start gap-4">
        <Breadcrumbs
          items={[
            { name: "Accueil", path: "/" },
            { name: "Informations légales", path: "/legal" },
          ]}
        />
        <h1 className="t-title enter">Informations légales</h1>
        <p className="t-body t-measure enter">
          En préparation. Nos conditions sont en cours de rédaction. Une question d&apos;ici là : écrivez-nous.
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-6">
          <Link href="/contact" className={buttonClass("outline")}>
            Nous écrire
          </Link>
          <Link href="/" className={buttonClass("link")}>
            Retour au catalogue
          </Link>
        </div>
      </section>

      <section aria-labelledby="etabli" className="mt-[var(--space-section)]">
        <h2 id="etabli" className="t-title mb-6">
          Déjà établi
        </h2>
        <dl className="grid gap-6 md:grid-cols-3">
          {ETABLI.map(({ title, text }) => (
            <div key={title} className="border-t border-line pt-4">
              <dt className="t-subtitle">{title}</dt>
              <dd className="t-body mt-1">{text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="a-venir" className="mt-[var(--space-section)]">
        <h2 id="a-venir" className="t-title mb-6">
          À venir
        </h2>
        <ul className="border-t border-line">
          {A_VENIR.map((document) => (
            <li key={document} className="flex min-h-11 items-baseline justify-between gap-6 border-b border-line py-3">
              <span className="t-body text-fg-1">{document}</span>
              <span className="t-caption shrink-0">En préparation</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
