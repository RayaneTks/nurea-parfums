import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { MarqueFaqJsonLd } from "@/components/seo/MarqueFaqJsonLd";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { buttonClass } from "@/components/ui/Button";
import { MARQUE_FAQ } from "@/lib/marqueFaq";
import { DEFAULT_DESCRIPTION, pageOg, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "La parfumerie",
  description: `${SITE_NAME} — Retrouvez les plus grands parfums au meilleur prix. Une sélection rigoureuse des meilleures marques, homme et femme.`,
  keywords: [
    "Nuréa Parfums",
    "parfumerie marseille",
    "parfum pas cher",
    "grandes marques",
  ],
  alternates: { canonical: "/marque" },
  openGraph: pageOg("/marque"),
};

const domain = SITE_URL.replace(/^https?:\/\//, "");

const PRINCIPLES = [
  {
    title: "Une sélection des plus grandes marques",
    body: "Le catalogue réunit les fragrances les plus demandées du moment. Grand classique ou nouveauté, chaque référence est choisie une par une, pour homme comme pour femme.",
  },
  {
    title: "Des prix justes",
    body: "Nous travaillons au quotidien pour proposer les tarifs les plus justes sur l'ensemble du catalogue, sans jamais transiger sur la qualité de ce que nous vendons.",
  },
  {
    title: "Le conseil avant la commande",
    body: "Un parfum est un choix personnel. Le site est une vitrine : la commande passe par un échange direct, où l'on répond aux questions avant de conclure.",
  },
] as const;

export default function MarquePage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", path: "/" },
          { name: "La parfumerie", path: "/marque" },
        ]}
      />
      <MarqueFaqJsonLd />

      <section className="nurea-page border-b border-nurea-border py-18 pt-32 md:pt-40">
        <ScrollReveal>
          <p className="nurea-label">La parfumerie</p>
          <h1 className="nurea-title mt-4 text-nurea-text">
            L&apos;excellence à votre portée
          </h1>
          <p className="nurea-body nurea-prose mt-6">
            Chez {SITE_NAME}, vous trouvez les plus grands parfums au meilleur
            prix. Nous sélectionnons chaque référence une par une, pour en
            garantir la qualité et l&apos;authenticité.
          </p>
        </ScrollReveal>
      </section>

      <section aria-label="Nos principes" className="border-b border-nurea-border">
        <div className="nurea-page">
          <dl className="grid gap-px bg-nurea-border md:grid-cols-3">
            {PRINCIPLES.map(({ title, body }, index) => (
              <div key={title} className="bg-nurea-bg py-12 md:px-8 md:py-18">
                <ScrollReveal delay={index * 80}>
                  <dt className="nurea-name text-nurea-text">{title}</dt>
                  <dd className="nurea-body mt-4">{body}</dd>
                </ScrollReveal>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="nurea-page border-b border-nurea-border py-18">
        <ScrollReveal>
          <h2 className="nurea-section-title text-nurea-text">Notre identité</h2>
          <div className="nurea-prose mt-6 flex flex-col gap-6">
            <p className="nurea-body">
              Basés à Marseille, nous cultivons la proximité et la réactivité.
              Pour vous assurer de l&apos;authenticité de nos produits, consultez
              toujours notre site officiel :{" "}
              <span className="text-nurea-text">{domain}</span>.
            </p>
            <p className="nurea-body">
              Notre nom s&apos;écrit avec soin :{" "}
              <strong className="font-semibold text-nurea-accent">
                Nuréa Parfums
              </strong>
              . Un accent sur le « é », un « s » à Parfums. Cette précision dit
              l&apos;attention que nous portons à chaque détail de votre commande.
            </p>
          </div>
        </ScrollReveal>
      </section>

      <section className="nurea-page border-b border-nurea-border py-18">
        <ScrollReveal>
          <h2 className="nurea-section-title text-nurea-text">
            Questions fréquentes
          </h2>
        </ScrollReveal>
        <dl className="mt-10 border-t border-nurea-border">
          {MARQUE_FAQ.map(({ question, answer }) => (
            <div
              key={question}
              className="border-b border-nurea-border py-6 md:grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:gap-10"
            >
              <dt className="nurea-name text-nurea-text">{question}</dt>
              <dd className="nurea-body mt-3 md:mt-0">{answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="nurea-page py-18">
        <ScrollReveal className="flex flex-col items-start">
          <h2 className="nurea-section-title text-nurea-text">
            Trouvez votre prochain parfum
          </h2>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link href="/" className={buttonClass("solid")}>
              Voir le catalogue
            </Link>
            <Link href="/contact" className={buttonClass("outline")}>
              Nous écrire
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </>
  );
}
