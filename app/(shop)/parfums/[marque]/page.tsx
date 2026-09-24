import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PerfumeLinkCard } from "@/components/features/PerfumeLinkCard";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { buttonClass } from "@/components/ui/Button";
import { SnapchatIcon } from "@/components/ui/Icons";
import { CONTACT } from "@/lib/data";
import { MENTION_FLACONS } from "@/lib/mentions";
import { getSeoBrand, getSeoCatalogue } from "@/lib/catalogue-service";
import { toCardPerfume, type SeoBrand } from "@/lib/catalog/seoCatalogue";
import { brandPath, CATALOGUE_PATH, fullPerfumeName, perfumePath } from "@/lib/seo/paths";
import { pageOg, SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

type BrandPageProps = { params: Promise<{ marque: string }> };

/** Combien d'autres marques proposer en pied de page : assez pour mailler, pas au point d'en faire un index bis. */
const NEIGHBOURS = 12;

/** La marque en tête — c'est le mot cherché —, puis ce qu'on en propose, puis comment l'obtenir. */
function description(brand: SeoBrand): string {
  const n = brand.perfumes.length;
  const offre = brand.complete ? "toute la gamme disponible" : `${n} parfum${n > 1 ? "s" : ""} au catalogue`;
  return `Parfums ${brand.name} au meilleur prix à Marseille chez ${SITE_NAME} : ${offre}. Remise en main propre à Marseille ou envoi en France, commande directe sur Snapchat.`;
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { marque } = await params;
  const brand = await getSeoBrand(marque);
  if (!brand) return { title: "Marque introuvable", robots: { index: false, follow: true } };

  const path = brandPath(brand.slug);
  const cover = brand.perfumes[0]?.image ?? brand.visual;
  return {
    title: `Parfums ${brand.name} à Marseille`,
    description: description(brand),
    alternates: { canonical: path },
    openGraph: { ...pageOg(path), ...(cover ? { images: [{ url: cover, alt: `Parfums ${brand.name}` }] } : {}) },
  };
}

/** Les marques voisines dans l'ordre alphabétique, en boucle : chaque page marque en reçoit d'autres. */
function neighboursOf(all: SeoBrand[], slug: string): SeoBrand[] {
  const index = all.findIndex((b) => b.slug === slug);
  if (index < 0 || all.length < 2) return [];
  const count = Math.min(NEIGHBOURS, all.length - 1);
  return Array.from({ length: count }, (_, k) => all[(index + 1 + k) % all.length]!);
}

/**
 * Page d'une marque : `/parfums/<slug>`.
 *
 * Elle répond aux recherches « parfum <marque> Marseille », que l'accueil — une seule page pour
 * tout le catalogue — ne pouvait pas toutes porter. Rien n'y est inventé : le nom de la marque,
 * ses flacons au catalogue, et les conditions de vente réelles (Marseille, envoi, Snapchat).
 */
export default async function BrandPage({ params }: BrandPageProps) {
  const { marque } = await params;
  const all = await getSeoCatalogue();
  const brand = all.find((b) => b.slug === marque);
  if (!brand) notFound();

  const path = brandPath(brand.slug);
  const cards = brand.perfumes.map((p) => ({ perfume: toCardPerfume(brand, p), href: perfumePath(brand.slug, p.name, p.id) }));
  const neighbours = neighboursOf(all, brand.slug);

  return (
    <>
      <JsonLdScript
        data={{
          "@type": "CollectionPage",
          name: `Parfums ${brand.name} — ${SITE_NAME}`,
          url: `${SITE_URL}${path}`,
          isPartOf: { "@id": `${SITE_URL}/#website` },
          about: { "@type": "Brand", name: brand.name },
          ...(cards.length > 0
            ? {
                mainEntity: {
                  "@type": "ItemList",
                  numberOfItems: cards.length,
                  itemListElement: cards.map(({ perfume, href }, i) => ({
                    "@type": "ListItem",
                    position: i + 1,
                    name: fullPerfumeName(brand.name, perfume.name),
                    url: `${SITE_URL}${href}`,
                  })),
                },
              }
            : {}),
        }}
      />

      <section className="nurea-page border-b border-nurea-border py-18 pt-32 md:pt-40">
        <Breadcrumbs
          items={[
            { name: "Accueil", path: "/" },
            { name: "Les marques", path: CATALOGUE_PATH },
            { name: brand.name, path },
          ]}
        />

        <p className="nurea-label mt-6">{brand.complete ? "Gamme complète" : "Sélection"}</p>
        <h1 className="nurea-title mt-4 text-nurea-text">Parfums {brand.name}</h1>

        <p className="nurea-body nurea-prose mt-6">
          {brand.complete
            ? `Nous proposons l'ensemble de la gamme ${brand.name}. Dites-nous la référence que vous cherchez : nous confirmons le prix et la disponibilité en message privé.`
            : `Les parfums ${brand.name} du catalogue ${SITE_NAME}, au meilleur prix. Le prix et la disponibilité se confirment en message privé, avant toute commande.`}{" "}
          Remise en main propre à Marseille, ou envoi partout en France.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <a href={CONTACT.snapchat} target="_blank" rel="noopener noreferrer" className={buttonClass("solid")}>
            <SnapchatIcon className="h-4 w-4 shrink-0" aria-hidden />
            Commander sur Snapchat
          </a>
          <Link href={`/contact?${new URLSearchParams({ marque: brand.name })}`} className={buttonClass("link")}>
            Passer par le formulaire
          </Link>
        </div>
      </section>

      {cards.length === 0 && brand.visual ? (
        <section className="nurea-page py-18">
          <div className="nurea-visuel-parfum relative w-full max-w-sm overflow-hidden border border-nurea-border">
            <Image
              src={brand.visual}
              alt={`Parfums ${brand.name}`}
              fill
              sizes="(max-width: 640px) 100vw, 24rem"
              className={`object-cover ${brand.visualLight ? "hidden dark:block" : ""}`}
            />
            {brand.visualLight ? (
              <Image
                src={brand.visualLight}
                alt={`Parfums ${brand.name}`}
                fill
                sizes="(max-width: 640px) 100vw, 24rem"
                className="block object-cover dark:hidden"
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {cards.length > 0 ? (
        <section className="nurea-page py-18" aria-labelledby="flacons">
          <h2 id="flacons" className="nurea-label">
            {cards.length} parfum{cards.length > 1 ? "s" : ""} {brand.name} au catalogue
          </h2>
          <ul className="nurea-catalogue-grid mt-6">
            {cards.map(({ perfume, href }, i) => (
              <li key={perfume.id}>
                <PerfumeLinkCard perfume={perfume} href={href} imagePriority={i < 2} />
              </li>
            ))}
          </ul>
          <p className="nurea-caption mt-6 border-t border-nurea-border pt-4">{MENTION_FLACONS}</p>
        </section>
      ) : null}

      {neighbours.length > 0 ? (
        <section className="nurea-page border-t border-nurea-border py-18" aria-labelledby="autres-marques">
          <h2 id="autres-marques" className="nurea-label">
            Autres marques
          </h2>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
            {neighbours.map((b) => (
              <li key={b.slug}>
                <Link
                  href={brandPath(b.slug)}
                  className="nurea-body text-nurea-muted transition-colors duration-nurea ease-out hover:text-nurea-accent"
                >
                  {b.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href={CATALOGUE_PATH} className="nurea-body text-nurea-accent">
                Toutes les marques
              </Link>
            </li>
          </ul>
        </section>
      ) : null}
    </>
  );
}
