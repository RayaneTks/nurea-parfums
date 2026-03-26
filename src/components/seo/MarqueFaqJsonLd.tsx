import { SITE_URL, SITE_NAME } from "@/lib/site";

/** FAQ orientée marque / confusion orthographique (extraits de réponse pour le référencement). */
export function MarqueFaqJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Comment s'écrit correctement le nom ${SITE_NAME} ?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `L'orthographe officielle est « Nurea » (N-U-R-E-A), suivi de « Parfums » au pluriel : ${SITE_NAME}.`,
        },
      },
      {
        "@type": "Question",
        name: `Quel est le site officiel de ${SITE_NAME} ?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Le site officiel est ${SITE_URL.replace("https://", "")} — vérifiez l'adresse dans votre navigateur pour éviter toute confusion avec des noms ou orthographes proches.`,
        },
      },
      {
        "@type": "Question",
        name: `${SITE_NAME} est-il une marque indépendante ?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${SITE_NAME} est une maison de haute parfumerie indépendante. D'autres marques ou orthographes similaires sur Internet sont des acteurs distincts ; seul le domaine officiel et le contact avec la maison garantissent nos services.`,
        },
      },
      {
        "@type": "Question",
        name: "Je ne trouve pas un parfum dans le catalogue, que faire ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Écrivez depuis la page Contact : nous pouvons vous orienter ou rechercher une fragrance sur commande selon les disponibilités.",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
