import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { BottleMosaic } from "@/components/editorial/BottleMosaic";
import { OrderSteps } from "@/components/editorial/OrderSteps";
import { ContactForm } from "@/components/features/ContactForm";
import { PerfumeImage } from "@/components/features/PerfumeImage";
import { buttonClass } from "@/components/ui/Button";
import { ChannelSoon } from "@/components/ui/ChannelSoon";
import { SnapchatIcon } from "@/components/ui/Icons";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { getCachedCatalogue } from "@/lib/catalogue-service";
import { choisirFlacons, trouverParfum } from "@/lib/catalog/choisirFlacons";
import { CONTACT } from "@/lib/data";
import { MENTION_FLACONS } from "@/lib/mentions";
import { pageOg, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact & commande",
  description: `Contactez ${SITE_NAME} pour passer commande ou obtenir un conseil. Stock disponible immédiatement, réponse rapide sur Snapchat.`,
  alternates: { canonical: "/contact" },
  openGraph: pageOg("/contact"),
};

interface ContactPageProps {
  /** Pré-remplissage venu d'une fiche produit. */
  searchParams: Promise<{ parfum?: string | string[]; marque?: string | string[] }>;
}

const texte = (value: string | string[] | undefined): string => (typeof value === "string" ? value : "");

/* L'adresse se coupe après l'arobase, jamais au milieu du domaine : « .fr » seul
   sur sa ligne se lisait comme une faute de mise en page. */
const [EMAIL_LOCAL, EMAIL_DOMAINE] = CONTACT.email.split("@");

/**
 * Contact & commande.
 *
 * La page était un titre, un paragraphe, puis deux colonnes de texte. Elle suit
 * désormais l'ordre dans lequel on s'en sert :
 *
 *   1. la voie rapide — Snapchat, le seul bouton plein de la page ;
 *   2. les autres voies, et ce qu'on reçoit ;
 *   3. le déroulé d'une commande ;
 *   4. la voie lente — le formulaire.
 *
 * Venue d'une fiche produit (`?parfum=…&marque=…`), elle montre le flacon
 * choisi en grand : on commande ce qu'on voit. Sans parfum, trois flacons du
 * catalogue donnent l'image.
 */
export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = await searchParams;
  const parfum = texte(params.parfum);
  const marque = texte(params.marque);

  const { perfumes } = await getCachedCatalogue();
  const choisi = trouverParfum(perfumes, parfum, marque);
  const selection = [marque, parfum].filter(Boolean).join(" — ");

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", path: "/" },
          { name: "Contact", path: "/contact" },
        ]}
      />

      {/* ─── La voie rapide ──────────────────────────────────────────────── */}
      <section className="nurea-page border-b border-nurea-border pb-18 pt-32 md:pt-40">
        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-18">
          <ScrollReveal className="flex flex-col items-start">
            <p className="nurea-label">Contact & commande</p>
            <h1 className="nurea-title mt-4 text-nurea-text">Passer commande</h1>

            {selection ? (
              <div className="mt-10 w-full border border-nurea-border-strong p-6">
                <p className="nurea-caption">Votre sélection</p>
                <p className="nurea-name mt-1 text-nurea-text">{parfum || marque}</p>
                {parfum && marque ? <p className="nurea-caption">{marque}</p> : null}
              </div>
            ) : null}

            <p className="nurea-lead nurea-prose mt-10">Le plus rapide : écrivez-nous sur Snapchat.</p>

            <a
              href={CONTACT.snapchat}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("solid", "mt-6 w-full sm:w-auto")}
            >
              <SnapchatIcon className="h-4 w-4 shrink-0" aria-hidden />
              Écrire sur Snapchat
            </a>
            <p className="nurea-caption mt-4">{CONTACT.snapchatHandle} · réponse rapide</p>

            {!CONTACT.whatsapp && <ChannelSoon className="mt-6" />}
          </ScrollReveal>

          {choisi ? (
            <figure className="max-md:-mx-6">
              <div className="nurea-visuel-parfum relative">
                <PerfumeImage perfume={choisi} sizes="(max-width: 767px) 100vw, 40vw" priority />
              </div>
              <figcaption className="nurea-caption mt-4 max-md:px-6">{MENTION_FLACONS}</figcaption>
            </figure>
          ) : (
            <BottleMosaic perfumes={choisirFlacons(perfumes, 3)} priority className="max-md:-mx-6" />
          )}
        </div>
      </section>

      {/* ─── Les autres voies ────────────────────────────────────────────── */}
      <section aria-labelledby="coordonnees" className="nurea-page border-b border-nurea-border">
        <h2 id="coordonnees" className="sr-only">
          Coordonnées
        </h2>
        <dl className="nurea-filets md:grid-cols-3">
          <div className="py-10 md:py-18 md:pr-10">
            <dt className="nurea-label">Courrier électronique</dt>
            <dd className="mt-4">
              <a
                href={`mailto:${CONTACT.email}`}
                className="nurea-name text-nurea-text transition-colors duration-nurea ease-out hover:text-nurea-accent"
              >
                {EMAIL_LOCAL}@<wbr />
                {EMAIL_DOMAINE}
              </a>
            </dd>
          </div>
          <div className="py-10 md:px-10 md:py-18">
            <dt className="nurea-label">Zone</dt>
            <dd className="nurea-name mt-4 text-nurea-text">{CONTACT.location}</dd>
            <dd className="nurea-caption mt-2">Envoi partout en France sur demande.</dd>
          </div>
          <div className="py-10 md:py-18 md:pl-10">
            <dt className="nurea-label">Vos flacons</dt>
            <dd className="nurea-name mt-4 text-nurea-text">Flacons Nuréa personnalisés</dd>
            <dd className="nurea-caption mt-2">10, 50 ou 80 ml.</dd>
          </div>
        </dl>
      </section>

      {/* ─── Le déroulé ──────────────────────────────────────────────────── */}
      <section className="nurea-page border-b border-nurea-border py-18">
        <ScrollReveal>
          <p className="nurea-label">Comment ça se passe</p>
          <h2 className="nurea-section-title mt-4 text-nurea-text">En trois temps</h2>
        </ScrollReveal>
        <OrderSteps className="mt-10" />
      </section>

      {/* ─── La voie lente ───────────────────────────────────────────────── */}
      <section className="nurea-page py-18">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-18">
          <ScrollReveal>
            <p className="nurea-label">Formulaire</p>
            <h2 className="nurea-section-title mt-4 text-nurea-text">Laissez un message</h2>
            <p className="nurea-caption mt-4 max-w-xs">
              Précisez la marque et le nom du parfum : la réponse n&apos;en sera que plus précise.
            </p>
          </ScrollReveal>
          <ContactForm parfum={parfum} marque={marque} />
        </div>
      </section>
    </>
  );
}
