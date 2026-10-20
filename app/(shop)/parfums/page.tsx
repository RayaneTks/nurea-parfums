import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { buttonClass } from "@/components/ui/Button";
import { getSeoCatalogue } from "@/lib/catalogue-service";
import type { SeoBrand } from "@/lib/catalog/seoCatalogue";
import { brandPath, CATALOGUE_PATH } from "@/lib/seo/paths";
import { pageOg, SITE_NAME, SITE_URL } from "@/lib/site";

/** Même régime que l'accueil : lu à chaque requête, servi par le cache du catalogue. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Toutes les marques de parfum à Marseille",
  description: `Toutes les marques de parfum du catalogue ${SITE_NAME}, de A à Z : grandes maisons et parfumerie de niche, au meilleur prix à Marseille. Remise en main propre ou envoi en France.`,
  alternates: { canonical: CATALOGUE_PATH },
  openGraph: pageOg(CATALOGUE_PATH),
};

/** « Ô » comme « O », un chiffre sous « 0-9 » : l'index se lit comme un annuaire. */
function initialOf(name: string): string {
  const letter = name.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : "0-9";
}

function groupByInitial(brands: SeoBrand[]): [string, SeoBrand[]][] {
  const groups = new Map<string, SeoBrand[]>();
  for (const brand of brands) {
    const key = initialOf(brand.name);
    groups.set(key, [...(groups.get(key) ?? []), brand]);
  }
  return [...groups.entries()].sort(([a], [b]) => (a === "0-9" ? -1 : b === "0-9" ? 1 : a.localeCompare(b)));
}

function countLabel(brand: SeoBrand): string {
  const n = brand.perfumes.length;
  if (n === 0) return "Sur demande";
  return `${n} parfum${n > 1 ? "s" : ""}`;
}

/**
 * Index des marques, de A à Z.
 *
 * C'est le pivot du maillage : lié depuis la barre de navigation et le pied de page de toutes
 * les pages, il mène à chaque page marque, qui mène à chaque fiche parfum. Sans lui, ces pages
 * n'existeraient pour Google que par le sitemap — découvertes, mais sans aucun lien pour dire
 * qu'elles comptent. Sur téléphone, la rangée de lettres évite de dérouler tout l'annuaire.
 */
export default async function BrandsIndexPage() {
  const brands = await getSeoCatalogue();
  const groups = groupByInitial(brands);

  return (
    <div className="page-x flex flex-col gap-8 pb-[var(--space-section)] pt-2">
      <JsonLdScript
        data={{
          "@type": "CollectionPage",
          name: `Toutes les marques de parfum — ${SITE_NAME}`,
          url: `${SITE_URL}${CATALOGUE_PATH}`,
          isPartOf: { "@id": `${SITE_URL}/#website` },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: brands.length,
            itemListElement: brands.map((brand, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: brand.name,
              url: `${SITE_URL}${brandPath(brand.slug)}`,
            })),
          },
        }}
      />

      <section className="flex flex-col gap-4">
        <Breadcrumbs
          items={[
            { name: "Accueil", path: "/" },
            { name: "Les marques", path: CATALOGUE_PATH },
          ]}
        />
        <h1 className="t-title">Toutes les marques</h1>
        <p className="t-body t-measure hyphens-manual">
          {brands.length > 0
            ? `${brands.length} marques au catalogue ${SITE_NAME}, des grandes maisons à la parfumerie de niche. `
            : ""}
          Au meilleur prix à Marseille, avec remise en main propre sur place ou envoi partout en
          France. Votre marque n&apos;y figure pas ? Demandez-la nous : les arrivages sont fréquents.
        </p>
      </section>

      {groups.length === 0 ? (
        <p className="t-body">
          Le catalogue se met à jour. En attendant,{" "}
          <Link href="/contact" className="text-fg-1 underline underline-offset-4">
            écrivez-nous
          </Link>{" "}
          pour le parfum que vous cherchez.
        </p>
      ) : (
        <>
          <nav aria-label="Aller à la lettre">
            <ul className="flex flex-wrap">
              {groups.map(([initial]) => (
                <li key={initial}>
                  <a
                    href={`#lettre-${initial}`}
                    className="t-body t-nums flex h-11 min-w-11 items-center justify-center rounded-md px-2 text-fg-1 transition-colors duration-dur-1 ease-soft mouse-hover:bg-surface-2"
                  >
                    {initial}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-10">
            {groups.map(([initial, group]) => (
              <section
                key={initial}
                id={`lettre-${initial}`}
                aria-labelledby={`titre-${initial}`}
                className="grid scroll-mt-24 gap-2 border-t border-line pt-4 md:grid-cols-[6rem_1fr]"
              >
                <h2 id={`titre-${initial}`} className="t-subtitle">
                  {initial}
                </h2>
                <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                  {group.map((brand) => (
                    <li key={brand.slug}>
                      <Link
                        href={brandPath(brand.slug)}
                        className="group flex min-h-11 items-baseline justify-between gap-4 border-b border-line py-3"
                      >
                        <span className="t-body min-w-0 text-fg-1 underline-offset-4 [overflow-wrap:anywhere] group-mouse-hover:underline">
                          {brand.name}
                        </span>
                        <span className="t-caption shrink-0">{countLabel(brand)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <Link href="/contact" className={buttonClass("link", "self-start")}>
            Une marque manque ? Écrivez-nous
          </Link>
        </>
      )}
    </div>
  );
}
