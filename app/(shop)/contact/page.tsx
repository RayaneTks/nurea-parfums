import type { Metadata } from "next";
import { OrderSteps } from "@/components/editorial/OrderSteps";
import { ContactForm } from "@/components/features/ContactForm";
import { PerfumeImage } from "@/components/features/PerfumeImage";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buttonClass } from "@/components/ui/Button";
import { ChannelSoon } from "@/components/ui/ChannelSoon";
import { SnapchatIcon } from "@/components/ui/Icons";
import { getCachedCatalogue } from "@/lib/catalogue-service";
import { trouverParfum } from "@/lib/catalog/choisirFlacons";
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

/* L'adresse se coupe après l'arobase, jamais au milieu du domaine. */
const [EMAIL_LOCAL, EMAIL_DOMAINE] = CONTACT.email.split("@");

/**
 * Contact & commande, dans l'ordre où l'on s'en sert :
 *
 *   1. la voie rapide — Snapchat, le seul bouton plein de la page ; venue d'une fiche
 *      (`?parfum=…&marque=…`), le parfum choisi au-dessus, avec la mention des flacons ;
 *   2. les autres voies et ce qu'on reçoit (`MENTION_FLACONS`), puis les trois temps ;
 *   3. la voie lente — le formulaire : dessous sur téléphone, à droite dès 1024 px.
 */
export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = await searchParams;
  const parfum = texte(params.parfum);
  const marque = texte(params.marque);

  const { perfumes } = await getCachedCatalogue();
  const choisi = trouverParfum(perfumes, parfum, marque);
  const selection = Boolean(parfum || marque);

  return (
    <div className="page-x pb-[var(--space-section)] pt-2">
      <div className="grid gap-[var(--space-section)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div className="flex flex-col">
          <Breadcrumbs
            items={[
              { name: "Accueil", path: "/" },
              { name: "Contact", path: "/contact" },
            ]}
          />
          <h1 className="t-title enter mt-4">Passer commande</h1>

          {selection ? (
            <div className="mt-6 flex items-center gap-4 rounded-lg border border-line bg-surface-1 p-3">
              {choisi ? (
                <div className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-md bg-surface-2">
                  <PerfumeImage perfume={choisi} sizes="64px" />
                </div>
              ) : null}
              <div className="min-w-0">
                <p className="t-caption">Votre sélection</p>
                {choisi || (parfum && marque) ? <p className="t-caption text-fg-2">{choisi?.brand ?? marque}</p> : null}
                <p className="t-subtitle [overflow-wrap:anywhere]">{choisi?.name ?? (parfum || marque)}</p>
              </div>
            </div>
          ) : null}

          <p className="t-body enter mt-6">Le plus rapide : écrivez-nous sur Snapchat.</p>
          <a
            href={CONTACT.snapchat}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("solid", "mt-4 w-full sm:w-auto sm:self-start")}
          >
            <SnapchatIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
            Écrire sur Snapchat
          </a>
          <p className="t-caption mt-2">{CONTACT.snapchatHandle} · réponse rapide</p>
          {!CONTACT.whatsapp && <ChannelSoon className="mt-4" />}

          <section aria-labelledby="coordonnees" className="mt-[var(--space-section)]">
            <h2 id="coordonnees" className="sr-only">
              Coordonnées
            </h2>
            <dl className="grid gap-6 sm:grid-cols-2">
              <div className="border-t border-line pt-4">
                <dt className="t-caption">E-mail</dt>
                <dd className="mt-1">
                  <a
                    href={`mailto:${CONTACT.email}`}
                    className="t-subtitle inline-flex min-h-11 items-center underline-offset-4 decoration-accent decoration-1 mouse-hover:underline"
                  >
                    <span>
                      {EMAIL_LOCAL}@<wbr />
                      {EMAIL_DOMAINE}
                    </span>
                  </a>
                </dd>
              </div>
              <div className="border-t border-line pt-4">
                <dt className="t-caption">Zone</dt>
                <dd className="t-subtitle mt-1">{CONTACT.location}</dd>
                <dd className="t-body mt-1">Envoi partout en France sur demande.</dd>
              </div>
              <div className="border-t border-line pt-4 sm:col-span-2">
                <dt className="t-caption">Vos flacons</dt>
                <dd className="t-body t-measure mt-1">{MENTION_FLACONS}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="deroule" className="mt-[var(--space-section)]">
            <h2 id="deroule" className="t-title mb-6">
              Comment ça se passe
            </h2>
            <OrderSteps />
          </section>
        </div>

        <section aria-labelledby="formulaire" className="lg:pt-16">
          <h2 id="formulaire" className="t-title">
            Laisser un message
          </h2>
          <p className="t-body mb-6 mt-2">
            Précisez la marque et le nom du parfum : la réponse n&apos;en sera que plus précise.
          </p>
          <ContactForm parfum={parfum} marque={marque} />
        </section>
      </div>
    </div>
  );
}
