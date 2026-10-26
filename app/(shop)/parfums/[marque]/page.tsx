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
import { ambientStyle, averageAmbient } from "@/lib/catalog/ambient";
import { toCardPerfume, type SeoBrand } from "@/lib/catalog/seoCatalogue";
import { brandPath, CATALOGUE_PATH, fullPerfumeName, perfumePath } from "@/lib/seo/paths";
import { pageOg, SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

type BrandPageProps = { params: Promise<{ marque: string }> };

/** Combien d'autres marques proposer en pied de page : assez pour mailler, pas au point d'en faire un index bis. */
const NEIGHBOURS = 12;

/** La marque en tête — c'est le mot cherché —, puis ce qu'on en propose, puis comment l'obtenir. */
function description(brand: SeoBrand): string {
  const offre = "les références répertoriées au catalogue et d'autres références à vérifier sur demande";
  return `Parfums ${brand.name} à Marseille chez ${SITE_NAME} : ${offre}. Remise en main propre à Marseille ou envoi en France, commande directe sur Snapchat.`;
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
 * L'en-tête prend l'ambiance moyenne de ses parfums (§ B.3.8), la surface neutre en repli.
 */
export default async function BrandPage({ params }: BrandPageProps) {
  const { marque } = await params;
  const all = await getSeoCatalogue();
  const brand = all.find((b) => b.slug === marque);
  if (!brand) notFound();

  const path = brandPath(brand.slug);
  const cards = brand.perfumes.map((p) => ({ perfume: toCardPerfume(brand, p), href: perfumePath(brand.slug, p.name, p.id) }));
  const neighbours = neighboursOf(all, brand.slug);
  const formHref = `/contact?${new URLSearchParams({ marque: brand.name })}`;

  return (
    <div className="page-x flex flex-col gap-[var(--space-section)] pb-[var(--space-section)] pt-2">
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

      <section className="flex flex-col gap-2">
        <Breadcrumbs
          items={[
            { name: "Accueil", path: "/" },
            { name: "Les marques", path: CATALOGUE_PATH },
            { name: brand.name, path },
          ]}
        />

        <header
          style={ambientStyle(averageAmbient(brand.perfumes) ?? {})}
          className="amb flex flex-col gap-4 rounded-lg bg-ambient px-4 py-8 md:px-8 md:py-12"
        >
          <h1 className="t-title">Parfums {brand.name}</h1>
          <p className="t-body t-measure hyphens-manual">
            {`Les parfums ${brand.name} du catalogue ${SITE_NAME}. Le prix et la disponibilité se confirment en message privé, avant toute commande.`}{" "}
            Remise en main propre à Marseille, ou envoi partout en France.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <a href={CONTACT.snapchat} target="_blank" rel="noopener noreferrer" className={buttonClass("solid")}>
              <SnapchatIcon className="h-4 w-4 shrink-0" aria-hidden />
              Commander sur Snapchat
            </a>
            <Link href={formHref} className={buttonClass("link", "self-center sm:self-auto")}>
              Passer par le formulaire
            </Link>
          </div>
        </header>
      </section>

      {cards.length > 0 ? (
        <section aria-labelledby="flacons" className="flex flex-col gap-4">
          <h2 id="flacons" className="t-subtitle">
            {cards.length} parfum{cards.length > 1 ? "s" : ""} {brand.name}
          </h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {cards.map(({ perfume, href }, i) => (
              <li key={perfume.id} className="flex">
                <PerfumeLinkCard perfume={perfume} href={href} imagePriority={i < 2} />
              </li>
            ))}
          </ul>
          <p className="t-caption border-t border-line pt-4">{MENTION_FLACONS}</p>
        </section>
      ) : null}

      <section
        aria-labelledby="autre-reference"
        className="grid gap-6 border-t border-line pt-[var(--space-section)] md:grid-cols-[minmax(0,20rem)_1fr] md:items-center md:gap-8"
      >
        {brand.visual ? (
          <div className="relative aspect-[2/3] w-full max-w-xs overflow-hidden rounded-md bg-surface-2">
            <Image
              src={brand.visual}
              alt={`Visuel de collection ${brand.name}`}
              fill
              sizes="20rem"
              className={`object-cover ${brand.visualLight ? "hidden dark:block" : ""}`}
            />
            {brand.visualLight ? (
              <Image
                src={brand.visualLight}
                alt={`Visuel de collection ${brand.name}`}
                fill
                sizes="20rem"
                className="block object-cover dark:hidden"
              />
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-col gap-4">
          <h2 id="autre-reference" className="t-subtitle">
            Vous cherchez une autre référence {brand.name} ?
          </h2>
          <p className="t-body t-measure hyphens-manual">
            D&apos;autres références de cette marque peuvent aussi être au catalogue. Écrivez-nous pour vérifier la
            référence, son prix et sa disponibilité.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <a href={CONTACT.snapchat} target="_blank" rel="noopener noreferrer" className={buttonClass("outline")}>
              <SnapchatIcon className="h-4 w-4 shrink-0" aria-hidden />
              Demander sur Snapchat
            </a>
            <Link href={formHref} className={buttonClass("link", "self-center sm:self-auto")}>
              Passer par le formulaire
            </Link>
          </div>
        </div>
      </section>

      {neighbours.length > 0 ? (
        <section aria-labelledby="autres-marques" className="flex flex-col gap-2 border-t border-line pt-[var(--space-section)]">
          <h2 id="autres-marques" className="t-subtitle">
            Autres marques
          </h2>
          <ul className="flex flex-wrap gap-x-6">
            {neighbours.map((b) => (
              <li key={b.slug}>
                <Link href={brandPath(b.slug)} className={buttonClass("link", "text-fg-2 mouse-hover:text-fg-1")}>
                  {b.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href={CATALOGUE_PATH} className={buttonClass("link", "underline")}>
                Toutes les marques
              </Link>
            </li>
          </ul>
        </section>
      ) : null}
    </div>
  );
}
