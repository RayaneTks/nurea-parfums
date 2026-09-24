import { CONTACT } from "@/lib/data";
import { jsonLdHtml } from "@/lib/seo/jsonLd";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  DEFAULT_DESCRIPTION,
  BRAND_ALTERNATE_NAMES,
} from "@/lib/site";

const logoUrl = `${SITE_URL}/branding/monogram/logo1_monogram_circle_bordeaux_1024.svg`;

/** Organization + WebSite (SearchAction vers la recherche catalogue via ?q=). */
export function RootJsonLd() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        /*
         * `OnlineStore` plutôt qu'`Organization` : Google demande le sous-type le plus précis, et
         * c'est ce qui distingue une boutique d'une marque de parfum — la confusion exacte avec
         * « Nurae Parfum », qui FABRIQUE des parfums là où nous en VENDONS.
         *
         * L'adresse s'arrête à la ville, parce que c'est tout ce qui est vrai : la boutique n'a pas
         * de vitrine ouverte au public, la remise se fait en main propre. Une rue inventée serait
         * pire qu'une rue absente — et c'est pourtant « Marseille » qui fait la différence avec
         * Stockport pour un moteur.
         */
        "@type": "OnlineStore",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        alternateName: BRAND_ALTERNATE_NAMES,
        url: SITE_URL,
        logo: logoUrl,
        image: logoUrl,
        slogan: SITE_TAGLINE,
        description: DEFAULT_DESCRIPTION,
        email: CONTACT.email,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Marseille",
          addressRegion: "Provence-Alpes-Côte d'Azur",
          addressCountry: "FR",
        },
        // Remise en main propre à Marseille, envoi dans le reste de la France (FAQ de /marque).
        areaServed: [
          { "@type": "City", name: "Marseille" },
          { "@type": "Country", name: "France" },
        ],
        knowsAbout: ["Parfum", "Parfumerie", "Parfums de marque", "Parfumerie de niche"],
        /*
         * `sameAs` était vide, alors que le Snapchat est le canal de vente.
         *
         * C'est par ces liens qu'un moteur relie la boutique à ses comptes et
         * comprend qu'il s'agit d'une seule entité. En laisser la liste vide,
         * c'est se présenter sans références. Le lien WhatsApp n'y figure pas :
         * `wa.me` ouvre une conversation, ce n'est pas un profil.
         */
        sameAs: [CONTACT.snapchat],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        alternateName: BRAND_ALTERNATE_NAMES,
        url: SITE_URL,
        description: DEFAULT_DESCRIPTION,
        inLanguage: "fr-FR",
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdHtml(graph) }}
    />
  );
}

/** BreadcrumbList pour les pages internes. */
export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; path: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path === "/" ? "" : item.path}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }}
    />
  );
}

/** Un bloc JSON-LD quelconque, toujours échappé par `jsonLdHtml` (jamais `JSON.stringify` nu). */
export function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdHtml({ "@context": "https://schema.org", ...data }) }}
    />
  );
}
