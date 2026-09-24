import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { OrderChannels } from "@/components/features/OrderChannels";
import { PerfumeImage } from "@/components/features/PerfumeImage";
import { PerfumeLinkCard } from "@/components/features/PerfumeLinkCard";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buttonClass } from "@/components/ui/Button";
import { getSeoPerfume } from "@/lib/catalogue-service";
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
  return {
    title: `${fullPerfumeName(brand.name, perfume.name)} à Marseille`,
    description: `${perfume.name} de ${brand.name} chez ${SITE_NAME}, parfumerie à Marseille : au meilleur prix, remise en main propre à Marseille ou envoi en France. Prix et disponibilité sur Snapchat.`,
    alternates: { canonical: path },
    // Le visuel du flacon, pas la vignette générique : c'est ce lien qu'on partage en story.
    openGraph: { ...pageOg(path), images: [{ url: perfume.image, alt: `${brand.name} — ${perfume.name}` }] },
  };
}

/**
 * Fiche d'un parfum : `/parfums/<marque>/<nom>-<id>`.
 *
 * L'identifiant fait foi (voir `src/lib/seo/paths.ts`). Si le nom ou la marque de l'adresse ne
 * sont plus les bons — renommage, lien ancien, faute de frappe dans le nom —, la page redirige
 * en 308 vers l'adresse exacte : une seule URL par flacon, et aucune ancienne qui meure.
 *
 * Aucune donnée inventée : ni notes olfactives, ni prix (le prix ne se donne qu'en message
 * privé — règle de la vitrine). Le nom, la marque, le visuel, et comment commander.
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
    <>
      <section className="nurea-page border-b border-nurea-border py-18 pt-32 md:pt-40">
        <Breadcrumbs
          items={[
            { name: "Accueil", path: "/" },
            { name: "Les marques", path: CATALOGUE_PATH },
            { name: brand.name, path: brandPath(brand.slug) },
            { name: perfume.name, path },
          ]}
        />

        <div className="mt-8 border border-nurea-border md:grid md:grid-cols-2">
          <div className="nurea-visuel-parfum relative w-full border-b border-nurea-border md:border-b-0 md:border-r">
            <PerfumeImage perfume={card} sizes="(max-width: 767px) 100vw, 50vw" priority />
          </div>

          <div className="flex flex-col p-6 md:p-10">
            {/* Charte : marque, puis nom. Les deux dans le titre : c'est ainsi qu'on les cherche. */}
            <h1>
              <Link
                href={brandPath(brand.slug)}
                className="nurea-label block transition-colors duration-nurea ease-out hover:text-nurea-accent"
              >
                {brand.name}
              </Link>
              <span className="nurea-title mt-3 block text-nurea-text">{perfume.name}</span>
            </h1>

            <p className="nurea-body mt-6">
              {perfume.name}, de {brand.name}, au catalogue {SITE_NAME}. Remise en main propre à
              Marseille, ou envoi partout en France.
            </p>

            <p className="nurea-caption mt-8">Écrivez-nous pour le prix et la disponibilité</p>
            <OrderChannels perfume={perfume.name} brand={brand.name} />
          </div>
        </div>
      </section>

      {others.length > 0 ? (
        <section className="nurea-page py-18" aria-labelledby="meme-marque">
          <div className="flex items-baseline justify-between gap-6">
            <h2 id="meme-marque" className="nurea-label">
              Autres parfums {brand.name}
            </h2>
            <Link href={brandPath(brand.slug)} className={buttonClass("link")}>
              Toute la marque
            </Link>
          </div>
          <ul className="nurea-catalogue-grid mt-6">
            {others.map((p) => (
              <li key={p.id}>
                <PerfumeLinkCard perfume={toCardPerfume(brand, p)} href={perfumePath(brand.slug, p.name, p.id)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
