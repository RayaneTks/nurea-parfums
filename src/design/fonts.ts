import { Figtree, Fraunces } from "next/font/google";

/**
 * Polices de la vitrine — couple C1, choisi au point de contrôle 1 (20/10/2026) : Fraunces + Figtree
 * (DESIGN.md § Typographie, 04-PLAN-EXECUTION.md § B.4).
 *
 * `next/font/google` télécharge les fichiers AU BUILD et les sert depuis le site : aucune requête vers
 * un autre domaine à l'exécution (CSP `font-src 'self'`). Repli métrique (`adjustFontFallback`, par
 * défaut) : le texte de repli occupe la même place, rien ne saute au chargement.
 *
 * Polices variables, un fichier chacune : les graisses permises (titres 400/500, texte 400/500/600)
 * sont tenues par les rôles de `app/globals.css`, pas par le chargement. Sous-ensemble `latin` seul :
 * il couvre déjà « Œ », « É » et « ç ». Budget : ≤ 120 Ko de woff2 au total, mesuré au build.
 *
 * Déclarées ici plutôt que dans le layout : la page 404 vit hors du groupe `(shop)` et a besoin des
 * mêmes polices. `next/font` déduplique par module. Ce module ne doit jamais être importé depuis
 * `app/admin/*` : la gestion compose en `-apple-system`.
 */

/** Titres et noms de parfum. Axe optique (`opsz`) : le dessin suit le corps. SOFT et WONK restent à 0. */
const serif = Fraunces({
  axes: ["opsz"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

/** Texte et interface. */
const sans = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/** À poser sur l'élément racine de tout arbre de la vitrine. */
export const brandFontClassName = `${serif.variable} ${sans.variable} font-sans`;
