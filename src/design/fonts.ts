import { Instrument_Sans, Newsreader } from "next/font/google";

/**
 * Charte § 03 — deux familles à faible contraste.
 *
 * Aucun délié fin : elles restent nettes à 12 px sur écran de téléphone, ce que
 * la didone ne faisait pas. Les graisses chargées sont exactement celles que la
 * charte autorise, pas une de plus.
 *
 * Déclarées ici plutôt que dans le layout : la page 404 vit hors du groupe
 * `(shop)` et a besoin des mêmes polices. `next/font` déduplique par module —
 * les deux points d'entrée partagent donc un seul chargement.
 *
 * Ce module ne doit jamais être importé depuis `app/admin/*` : le registre
 * gestion compose en `-apple-system` et n'embarque aucune police distante.
 */

/** Titres et noms de parfum. 400 et 500, jamais plus. */
const serif = Newsreader({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

/** Texte et interface. 400, 500, 600, jamais sous 400. */
const sans = Instrument_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/** À poser sur l'élément racine de tout arbre de la vitrine. */
export const brandFontClassName = `${serif.variable} ${sans.variable} font-sans`;
