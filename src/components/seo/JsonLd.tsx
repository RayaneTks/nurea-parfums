import {
  SITE_URL,
  SITE_NAME,
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
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        alternateName: BRAND_ALTERNATE_NAMES,
        url: SITE_URL,
        logo: logoUrl,
        description: DEFAULT_DESCRIPTION,
        sameAs: [] as string[],
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
