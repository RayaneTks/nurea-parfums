/** URL canonique du site (sans slash final dans les concaténations courantes). */
export const SITE_URL = "https://nureaparfums.com" as const;

export const SITE_NAME = "Nuréa Parfums";
export const SITE_SHORT_NAME = "Nuréa";
export const SITE_TAGLINE = "Maison de Haute Parfumerie";

export const DEFAULT_DESCRIPTION =
  "Nuréa Parfums — Une invitation à l'exceptionnel. Maison de haute parfumerie indépendante, nous cultivons l'art du sillage rare et de la confidence. Découvrez notre sélection privée et engagez le dialogue avec la Maison.";

/**
 * Noms alternatifs pour schema.org et cohérence SEO (recherches avec/sans « s », fautes fréquentes).
 * Inclut des variantes utiles sans citer de concurrents nominalement dans le code métier.
 */
export const BRAND_ALTERNATE_NAMES: string[] = [
  "Nuréa Parfums",
  "Nuréa Parfums",
  "Nuréa Parfum",
  "Nuréa Parfum",
  "Nuréa",
  "Nuréa",
  "Maison Nuréa",
  "Nuréa haute parfumerie",
];

/**
 * Mots-clés ciblant la marque et les requêtes à risque de confusion orthographique.
 */
export const SEO_KEYWORDS: string[] = [
  "Nuréa Parfums",
  "Nuréa Parfums",
  "site officiel Nuréa Parfums",
  "nureaparfums.com",
  "maison de parfum indépendante",
  "parfums d'exception",
  "haute parfumerie paris",
  "sélection privée parfum",
];
