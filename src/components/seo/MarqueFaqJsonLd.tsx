import { MARQUE_FAQ } from "@/lib/marqueFaq";

/**
 * Balisage `FAQPage` de la page « La parfumerie ».
 *
 * Il dérive de `MARQUE_FAQ`, la même liste que la page affiche : les moteurs
 * exigent que chaque question déclarée soit visible à l'écran.
 */
export function MarqueFaqJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: MARQUE_FAQ.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
