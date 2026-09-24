import type { FC } from "react";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

const DOMAINE = SITE_URL.replace(/^https?:\/\//, "");

/** Le texte qui fait le tour du sceau. Le point final referme la boucle sur le début. */
const LEGENDE = `${SITE_NAME} · Site officiel · ${DOMAINE} · Marseille · `.toUpperCase();

/* Rayon de la ligne de base du texte, et donc sa longueur exacte : le texte est
   étiré à la circonférence (`textLength`) pour que la couture ne se voie pas. */
const RAYON_TEXTE = 86;
const CIRCONFERENCE = 2 * Math.PI * RAYON_TEXTE;

/**
 * Le sceau — l'aplat bordeaux de la charte (« Sceau, cachet. Un seul aplat par
 * support »).
 *
 * C'est la signature de la page « La parfumerie » : un cachet, comme celui
 * qu'on pose sur une lettre pour dire qu'elle vient bien de qui la signe. Il
 * porte l'adresse officielle, parce que c'est précisément ce qu'il authentifie —
 * une marque homonyme existe, et le client doit pouvoir reconnaître le vrai site
 * d'un coup d'œil.
 *
 * Un seul par page : la charte réserve le bordeaux à un aplat par support. Le
 * sceau garde ses couleurs dans les deux thèmes — un cachet ne change pas de
 * cire avec la lumière.
 *
 * Le texte circulaire est du vrai texte SVG : il reste net à toute taille et se
 * lit au lecteur d'écran par l'étiquette de l'image, pas lettre par lettre.
 */
export const Seal: FC<{ className?: string; id?: string }> = ({ className, id = "nurea-sceau" }) => (
  <svg
    viewBox="0 0 240 240"
    role="img"
    aria-label={`Sceau ${SITE_NAME} — site officiel ${DOMAINE}`}
    className={cn("block aspect-square", className)}
  >
    <circle cx="120" cy="120" r="118" style={{ fill: "var(--nurea-bordeaux)" }} />
    {/* Deux filets ivoire bornent l'anneau du texte, comme la double bague d'un cachet. */}
    <circle cx="120" cy="120" r="108" fill="none" stroke="#FDF8F4" strokeOpacity="0.4" strokeWidth="0.75" />
    <circle cx="120" cy="120" r="70" fill="none" stroke="#FDF8F4" strokeOpacity="0.4" strokeWidth="0.75" />

    <path
      id={id}
      d={`M 120 120 m -${RAYON_TEXTE} 0 a ${RAYON_TEXTE} ${RAYON_TEXTE} 0 1 1 ${RAYON_TEXTE * 2} 0 a ${RAYON_TEXTE} ${RAYON_TEXTE} 0 1 1 -${RAYON_TEXTE * 2} 0`}
      fill="none"
    />
    <text
      fill="#FDF8F4"
      fontSize="11"
      fontWeight="600"
      style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
    >
      <textPath href={`#${id}`} textLength={CIRCONFERENCE.toFixed(2)} lengthAdjust="spacing">
        {LEGENDE}
      </textPath>
    </text>

    <image
      href="/branding/monogram/logo4_monogram_free_ivory_1024.svg"
      x="70"
      y="70"
      width="100"
      height="100"
    />
  </svg>
);
