/**
 * Le domaine canonique, au pluriel comme la marque.
 *
 * Tout en dérive — métadonnées, sitemap, robots, JSON-LD, manifestes PWA,
 * image Open Graph et le domaine affiché sur la page Marque. Une seule
 * constante à changer le jour où le domaine bouge.
 *
 * `nureaparfum.fr`, au singulier, est acheté en second et redirige ici. C'est
 * la faute la plus probable — le nom se prononce avec le s, il s'entend mal —
 * et un client qui l'oublie doit atterrir chez nous, pas dans le vide. La
 * redirection se règle chez le registrar, pas dans ce fichier : deux domaines
 * qui servent le même site sans redirection permanente, ce sont deux sites
 * en double aux yeux de Google, et l'audience se divise entre les deux.
 */
export const SITE_URL = "https://nureaparfums.fr" as const;

export const SITE_NAME = "Nuréa Parfums";
export const SITE_SHORT_NAME = "Nuréa";
export const SITE_TAGLINE = "Parfumerie d'Exception";

export const DEFAULT_DESCRIPTION =
  "Nuréa Parfums — Retrouvez vos parfums préférés au meilleur prix. Une sélection rigoureuse des plus grandes marques pour homme et femme. Découvrez notre catalogue et commandez directement sur Snapchat ou WhatsApp.";

/**
 * Noms alternatifs pour schema.org et cohérence SEO.
 */
export const BRAND_ALTERNATE_NAMES: string[] = [
  "Nuréa Parfums",
  "Nurea Parfums",
  "Nuréa Parfum",
  "Nurea Parfum",
  "Nuréa",
  "Nurea",
  "Parfumerie Nuréa",
  "Nurea Parfumerie",
];

/**
 * Mots-clés ciblant la marque et les requêtes à risque de confusion orthographique.
 */
export const SEO_KEYWORDS: string[] = [
  "Nuréa Parfums",
  "site officiel Nuréa Parfums",
  "nureaparfums.fr",
  "nureaparfum.fr",
  "parfums pas cher",
  "parfums de luxe",
  "parfumerie marseille",
  "meilleur prix parfum",
  "catalogue parfum",
];

/**
 * Le bloc Open Graph d'une page.
 *
 * Les métadonnées de Next sont fusionnées À PLAT : une page qui redéclare
 * `openGraph`, ne serait-ce que pour changer son titre, REMPLACE l'objet entier
 * du layout. C'est ainsi que `og:site_name` et `og:locale` avaient disparu de
 * l'accueil, de /marque et de /contact — ils ne survivaient que sur /legal, la
 * seule page qui n'y touchait pas. Or `og:site_name` est, juste après le
 * JSON-LD, ce que Google lit pour choisir le nom affiché sous un résultat.
 *
 * D'où ce helper : chaque page appelle `pageOg("/son-chemin")` et récupère
 * l'objet complet, avec sa propre URL. On ne renseigne volontairement ni titre
 * ni description — sans eux, Next les reprend du titre et de la description
 * RÉSOLUS de la page, gabarit compris. Les répéter ici ne ferait que créer une
 * seconde source de vérité, qui finirait par diverger.
 *
 * L'image non plus n'y figure pas : la convention de fichier
 * `app/(shop)/opengraph-image.tsx` l'injecte elle-même, avec l'URL hachée que
 * seul le build connaît.
 */
export function pageOg(path: string) {
  return {
    type: "website" as const,
    locale: "fr_FR",
    siteName: SITE_NAME,
    url: new URL(path, SITE_URL).toString(),
  };
}
