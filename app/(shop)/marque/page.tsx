import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { MarqueFaqJsonLd } from "@/components/seo/MarqueFaqJsonLd";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { buttonClass } from "@/components/ui/Button";
import { BottleMosaic } from "@/components/editorial/BottleMosaic";
import { BrandIndex } from "@/components/editorial/BrandIndex";
import { Chapters, type Chapter } from "@/components/editorial/Chapters";
import { FaqAccordion } from "@/components/editorial/FaqAccordion";
import { FlaconLabel } from "@/components/editorial/FlaconLabel";
import { Monogram } from "@/components/editorial/Monogram";
import { OrderSteps } from "@/components/editorial/OrderSteps";
import { Seal } from "@/components/editorial/Seal";
import { getCachedCatalogue } from "@/lib/catalogue-service";
import { choisirFlacons } from "@/lib/catalog/choisirFlacons";
import { MARQUE_FAQ } from "@/lib/marqueFaq";
import { pageOg, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Qui sommes-nous — parfumerie à Marseille",
  description: `${SITE_NAME}, parfumerie à Marseille : les plus grands parfums, choisis un par un, au meilleur prix. Homme et femme, remis dans nos flacons Nuréa.`,
  keywords: ["Nuréa Parfums", "parfumerie marseille", "parfum pas cher", "grandes marques"],
  alternates: { canonical: "/marque" },
  openGraph: pageOg("/marque"),
};

/** Comme l'accueil : les flacons et l'index des marques suivent le catalogue, jamais un HTML figé au build. */
export const dynamic = "force-dynamic";

const DOMAINE = SITE_URL.replace(/^https?:\/\//, "");

const ENGAGEMENTS: readonly Chapter[] = [
  {
    title: "Les plus grandes marques",
    text: "Les parfums qu'on nous demande, pour homme et pour femme, choisis un à un.",
  },
  {
    title: "Le juste prix",
    text: "Des tarifs travaillés sur tout le catalogue, sans rogner sur la qualité.",
  },
  {
    title: "Le conseil d'abord",
    text: "La commande passe par un échange direct : on répond, puis on conclut.",
  },
];

/**
 * La parfumerie — la page qui dit qui nous sommes.
 *
 * Elle était un texte continu : trois paragraphes, deux autres, cinq réponses
 * dépliées. Elle se lit désormais comme un carnet en chapitres, chacun porté
 * par une image ou un signe plutôt que par un paragraphe :
 *
 *   ouverture   — trois flacons du catalogue, le titre, une phrase ;
 *   engagements — 01 · 02 · 03, une phrase chacun ;
 *   flacons     — l'étiquette Nuréa : ce que le client reçoit vraiment ;
 *   marques     — l'index du catalogue, chaque nom mène à ses parfums ;
 *   sceau       — l'aplat bordeaux de la charte, qui authentifie le site ;
 *   commander   — trois temps sur une ligne ;
 *   questions   — repliées, on ouvre celle qui nous concerne.
 *
 * Un seul bouton plein, tout en bas (charte § 05).
 */
export default async function MarquePage() {
  const { perfumes, browseBrands } = await getCachedCatalogue();
  const flacons = choisirFlacons(perfumes, 3);
  const exemple = flacons[0]?.name ?? "Votre parfum";

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", path: "/" },
          { name: "La parfumerie", path: "/marque" },
        ]}
      />
      <MarqueFaqJsonLd />

      {/* ─── Ouverture ───────────────────────────────────────────────────── */}
      <section className="nurea-page border-b border-nurea-border pb-18 pt-32 md:pt-40">
        <div className="grid items-end gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-18">
          <ScrollReveal className="md:pb-10">
            <p className="nurea-label">La parfumerie</p>
            <h1 className="nurea-title mt-4 max-w-[14ch] text-nurea-text">
              Les grands parfums, choisis un par un.
            </h1>
            <p className="nurea-lead nurea-prose mt-6">
              Une parfumerie marseillaise, un catalogue tenu à la main, des prix justes.
            </p>
            <p className="nurea-label mt-10 text-nurea-subtle">
              {perfumes.length} références · {browseBrands.length} marques · Marseille
            </p>
          </ScrollReveal>

          {/* Téléphone : la mosaïque sort de la marge de page et tient tout l'écran. */}
          <BottleMosaic perfumes={flacons} priority className="max-md:-mx-6" />
        </div>
      </section>

      {/* ─── Engagements ─────────────────────────────────────────────────── */}
      <section aria-labelledby="engagements" className="nurea-page border-b border-nurea-border">
        <h2 id="engagements" className="sr-only">
          Nos engagements
        </h2>
        <Chapters chapters={ENGAGEMENTS} />
      </section>

      {/* ─── Nos flacons ─────────────────────────────────────────────────── */}
      <section className="nurea-page border-b border-nurea-border py-18">
        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-18">
          <ScrollReveal className="mx-auto w-full max-w-[15rem]">
            <FlaconLabel name={exemple} />
          </ScrollReveal>

          <ScrollReveal>
            <p className="nurea-label">Nos flacons</p>
            <h2 className="nurea-section-title mt-4 text-nurea-text">
              Votre parfum, dans un flacon Nuréa.
            </h2>
            <p className="nurea-lead nurea-prose mt-6">
              Chaque parfum vous est remis dans nos flacons personnalisés, à notre étiquette : 10, 50 ou 80 ml.
            </p>
            <p className="nurea-caption nurea-prose mt-6">
              Les photographies du catalogue montrent les flacons d&apos;origine des marques, pour illustrer chaque
              référence : ce ne sont pas les flacons que vous recevez. Elles sont réalisées par nos soins.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Les marques ─────────────────────────────────────────────────── */}
      {browseBrands.length > 0 && (
        <section className="nurea-page border-b border-nurea-border py-18">
          <ScrollReveal>
            <p className="nurea-label">Les marques</p>
            <h2 className="nurea-section-title mt-4 text-nurea-text">
              {browseBrands.length} marques au catalogue
            </h2>
            <p className="nurea-caption mt-4">Touchez un nom pour voir ses parfums.</p>
          </ScrollReveal>
          <div className="mt-10">
            <BrandIndex brands={browseBrands} />
          </div>
        </section>
      )}

      {/* ─── Le sceau ────────────────────────────────────────────────────── */}
      <section className="nurea-page border-b border-nurea-border py-18">
        <div className="grid items-center gap-10 md:grid-cols-[auto_minmax(0,1fr)] md:gap-18">
          <ScrollReveal className="mx-auto w-48 md:w-60">
            <Seal />
          </ScrollReveal>

          <ScrollReveal>
            <p className="nurea-label">Site officiel</p>
            <h2 className="nurea-section-title mt-4 text-nurea-text">Un seul site. Un seul nom.</h2>

            <dl className="nurea-filets mt-10 sm:grid-cols-2">
              <div className="py-6 sm:pr-6">
                <dt className="nurea-caption">L&apos;adresse</dt>
                <dd className="nurea-lead mt-2">{DOMAINE}</dd>
                <dd className="nurea-caption mt-2">Toute autre adresse n&apos;est pas la nôtre.</dd>
              </div>
              <div className="py-6 sm:pl-6">
                <dt className="nurea-caption">L&apos;orthographe</dt>
                <dd className="nurea-lead mt-2">Nuréa, avec un é.</dd>
                <dd className="nurea-caption mt-2">Parfums, avec un s.</dd>
              </div>
            </dl>

            <p className="nurea-caption nurea-prose mt-6">
              « Nurae Parfum », marque britannique au nom voisin, n&apos;a aucun lien avec nous.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Commander ───────────────────────────────────────────────────── */}
      <section className="nurea-page border-b border-nurea-border py-18">
        <ScrollReveal>
          <p className="nurea-label">Commander</p>
          <h2 className="nurea-section-title mt-4 text-nurea-text">En trois temps</h2>
        </ScrollReveal>
        <OrderSteps className="mt-10" />
      </section>

      {/* ─── Questions ───────────────────────────────────────────────────── */}
      <section className="nurea-page border-b border-nurea-border py-18">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-18">
          <ScrollReveal>
            <p className="nurea-label">Questions</p>
            <h2 className="nurea-section-title mt-4 text-nurea-text">Questions fréquentes</h2>
          </ScrollReveal>
          <FaqAccordion entries={MARQUE_FAQ} />
        </div>
      </section>

      {/* ─── Clôture ─────────────────────────────────────────────────────── */}
      <section className="nurea-page py-18">
        <div className="flex items-center justify-between gap-10">
          <ScrollReveal className="flex flex-col items-start">
            <h2 className="nurea-section-title text-nurea-text">Trouvez votre prochain parfum</h2>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link href="/" className={buttonClass("solid")}>
                Voir le catalogue
              </Link>
              <Link href="/contact" className={buttonClass("outline")}>
                Nous écrire
              </Link>
            </div>
          </ScrollReveal>
          <Monogram className="hidden w-40 shrink-0 text-nurea-border-strong md:block" />
        </div>
      </section>
    </>
  );
}
