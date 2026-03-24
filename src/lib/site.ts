/** URL canonique du site (sans slash final dans les concaténations courantes). */
export const SITE_URL = "https://nureaparfums.com" as const;

export const SITE_NAME = "Nurea Parfums";
export const SITE_SHORT_NAME = "Nurea";
export const SITE_TAGLINE = "Maison de Haute Parfumerie";

export const DEFAULT_DESCRIPTION =
  "Nurea Parfums — maison de haute parfumerie. Catalogue de fragrances d'exception, sélection privée et conciergerie sur commande (WhatsApp). Site officiel nureaparfums.com.";

/**
 * Noms alternatifs pour schema.org et cohérence SEO (recherches avec/sans « s », fautes fréquentes).
 * Inclut des variantes utiles sans citer de concurrents nominalement dans le code métier.
 */
export const BRAND_ALTERNATE_NAMES: string[] = [
  "Nurea Parfums",
  "Nurea Parfum",
  "Nurea",
  "Maison Nurea",
  "Nurea parfumerie",
  "Nurea haute parfumerie",
];

/**
 * Mots-clés ciblant la marque et les requêtes à risque de confusion orthographique.
 * (Les meta keywords sont un signal mineur pour Google mais restent utiles à d'autres systèmes.)
 */
export const SEO_KEYWORDS: string[] = [
  "Nurea Parfums",
  "Nurea Parfum",
  "nurea parfums",
  "nurea parfum",
  "nurea",
  "nurea parfums officiel",
  "site officiel Nurea",
  "nureaparfums",
  "nureaparfums.com",
  "maison Nurea",
  "parfumerie Nurea",
  "parfums Nurea",
  "conciergerie parfum",
  "parfums de luxe",
  "haute parfumerie",
];
