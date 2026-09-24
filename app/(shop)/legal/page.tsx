import type { Metadata } from "next";
import Link from "next/link";
import { Monogram } from "@/components/editorial/Monogram";
import { buttonClass } from "@/components/ui/Button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
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

export default function LegalPage() {
  return (
    <>
      <section className="nurea-page border-b border-nurea-border pb-18 pt-32 md:pt-40">
        <div className="flex items-end justify-between gap-10">
          <ScrollReveal className="flex flex-col items-start">
            <p className="nurea-label">Informations légales</p>
            <h1 className="nurea-title mt-4 text-nurea-text">En préparation</h1>
            <p className="nurea-lead nurea-prose mt-6">
              Nos conditions sont en cours de rédaction. Une question d&apos;ici là : écrivez-nous.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/contact" className={buttonClass("outline")}>
                Nous écrire
              </Link>
              <Link href="/" className={buttonClass("link")}>
                Retour au catalogue
              </Link>
            </div>
          </ScrollReveal>
          <Monogram className="hidden w-40 shrink-0 text-nurea-border-strong md:block" />
        </div>
      </section>

      <section className="nurea-page border-b border-nurea-border py-18">
        <ScrollReveal>
          <p className="nurea-label">Déjà établi</p>
        </ScrollReveal>
        <dl className="nurea-filets mt-10 md:grid-cols-3">
          {ETABLI.map(({ title, text }, index) => (
            <div key={title} className="py-8 md:px-10 md:py-10 md:first:pl-0 md:last:pr-0">
              <ScrollReveal delay={index * 80}>
                <dt className="nurea-name text-nurea-text">{title}</dt>
                <dd className="nurea-body mt-4">{text}</dd>
              </ScrollReveal>
            </div>
          ))}
        </dl>
      </section>

      <section className="nurea-page py-18">
        <ScrollReveal>
          <p className="nurea-label">À venir</p>
        </ScrollReveal>
        <ul className="mt-10 border-t border-nurea-border">
          {A_VENIR.map((document) => (
            <li
              key={document}
              className="flex items-baseline justify-between gap-6 border-b border-nurea-border py-6"
            >
              <span className="nurea-name text-nurea-text">{document}</span>
              <span className="nurea-caption shrink-0">En préparation</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
