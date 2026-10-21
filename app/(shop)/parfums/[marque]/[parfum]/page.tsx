import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { OrderChannels } from "@/components/features/OrderChannels";
import { PerfumeImage } from "@/components/features/PerfumeImage";
import { PerfumeLinkCard } from "@/components/features/PerfumeLinkCard";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buttonClass } from "@/components/ui/Button";
import { getSeoPerfume } from "@/lib/catalogue-service";
import { ambientStyle } from "@/lib/catalog/ambient";
import { brandLineLabel } from "@/lib/catalog/perfumePresentation";
import { toCardPerfume } from "@/lib/catalog/seoCatalogue";
import { brandPath, CATALOGUE_PATH, fullPerfumeName, perfumeIdFromSegment, perfumePath } from "@/lib/seo/paths";
import { pageOg, SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

type PerfumePageProps = { params: Promise<{ marque: string; parfum: string }> };

/** Assez pour inviter à rester sur la marque, pas au point de noyer la fiche. */
const SAME_BRAND = 6;

async function resolve(params: PerfumePageProps["params"]) {
  const { parfum } = await params;
  const id = perfumeIdFromSegment(parfum);
  return id === null ? null : getSeoPerfume(id);
}

export async function generateMetadata({ params }: PerfumePageProps): Promise<Metadata> {
  const found = await resolve(params);
  if (!found) return { title: "Parfum introuvable", robots: { index: false, follow: true } };

  const { brand, perfume } = found;
  const path = perfumePath(brand.slug, perfume.name, perfume.id);
  const full = fullPerfumeName(brand.name, perfume.name);
  return {
    title: `${perfume.line ? `${full} (${perfume.line})` : full} à Marseille`,
    description: `${perfume.name} de ${brand.name}${perfume.line ? `, gamme ${perfume.line},` : ""} chez ${SITE_NAME}, parfumerie à Marseille : au meilleur prix, remise en main propre à Marseille ou envoi en France. Prix et disponibilité sur Snapchat.`,
    alternates: { canonical: path },
    // L'image vient d'`opengraph-image.tsx` (visuel entier sur son ambiance) : c'est ce lien qu'on partage en story.
    openGraph: pageOg(path),
  };
}

/**
 * Fiche d'un parfum : `/parfums/<marque>/<nom>-<id>`.
 *
 * L'identifiant fait foi (voir `src/lib/seo/paths.ts`). Si le nom ou la marque de l'adresse ne
 * sont plus les bons — renommage, lien ancien, faute de frappe dans le nom —, la page redirige
 * en 308 vers l'adresse exacte : une seule URL par flacon, et aucune ancienne qui meure.
 *
 * Même contenu que la fiche en feuille de l'accueil (`PerfumeSheet`, § B.9) : fond d'ambiance,
 * visuel 2:3 entier, marque puis nom, les moyens de commande d'`OrderChannels` et la mention des
 * flacons. Aucune donnée inventée : ni notes olfactives, ni prix, ni contenance.
 */
export default async function PerfumePage({ params }: PerfumePageProps) {
  const { marque, parfum } = await params;
  const found = await resolve(params);
  if (!found) notFound();

  const { brand, perfume } = found;
  const path = perfumePath(brand.slug, perfume.name, perfume.id);
  if (`${brandPath(marque)}/${parfum}` !== path) permanentRedirect(path);

  const card = toCardPerfume(brand, perfume);
  const others = brand.perfumes.filter((p) => p.id !== perfume.id).slice(0, SAME_BRAND);

  return (
    <div className="page-x flex flex-col gap-[var(--space-section)] pb-[var(--space-section)] pt-2">
      <section className="flex flex-col gap-2">
        <Breadcrumbs
          items={[
            { name: "Accueil", path: "/" },
            { name: "Les marques", path: CATALOGUE_PATH },
            { name: brand.name, path: brandPath(brand.slug) },
            { name: perfume.name, path },
          ]}
        />

        <div
          style={ambientStyle(card)}
          className="amb flex flex-col gap-6 rounded-lg bg-ambient p-4 md:grid md:grid-cols-2 md:items-center md:gap-8 md:p-8"
        >
          <div className="relative mx-auto aspect-[2/3] w-[min(100%,calc(48dvh*2/3))] overflow-hidden rounded-md bg-surface-2 md:w-full">
            <PerfumeImage perfume={card} sizes="(max-width: 767px) 90vw, 40vw" priority />
          </div>

          <div className="flex flex-col gap-2 text-center md:text-left">
            {/* Marque (et sa gamme), puis nom. Les deux dans le titre : c'est ainsi qu'on les cherche. */}
            <h1 className="flex flex-col gap-2">
              <Link
                href={brandPath(brand.slug)}
                className="t-body flex min-h-11 items-center self-center underline-offset-4 mouse-hover:text-fg-1 mouse-hover:underline md:self-start"
              >
                {brandLineLabel(brand.name, perfume.line)}
              </Link>
              <span className="t-title">{perfume.name}</span>
            </h1>
            <p className="t-body">Prix et disponibilité : écrivez-nous.</p>

            <OrderChannels perfume={perfume.name} brand={brand.name} className="items-center md:items-start" />
          </div>
        </div>
      </section>

      {others.length > 0 ? (
        <section aria-labelledby="meme-marque" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6">
            <h2 id="meme-marque" className="t-subtitle">
              Autres parfums {brand.name}
            </h2>
            <Link href={brandPath(brand.slug)} className={buttonClass("link")}>
              Toute la marque
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {others.map((p) => (
              <li key={p.id} className="flex">
                <PerfumeLinkCard perfume={toCardPerfume(brand, p)} href={perfumePath(brand.slug, p.name, p.id)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
