import type { FC } from "react";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

const DOMAINE = SITE_URL.replace(/^https?:\/\//, "");

/** Le texte qui fait le tour du sceau. Le point final le referme sur son début. */
const LEGENDE = `${SITE_NAME} · Site officiel · ${DOMAINE} · Marseille · `.toUpperCase();
const LETTRES = [...LEGENDE];

const CENTRE = 120;
/** Rayon de la ligne de base du texte, entre les deux bagues (108 et 70). */
const RAYON_TEXTE = 86;

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
 * **Le texte fait le tour complet, lettre par lettre.** Une première version
 * posait la légende sur un `<textPath>` étirée par `textLength` : les
 * navigateurs n'appliquent pas tous cet étirement sur un chemin, et le texte
 * s'arrêtait aux trois quarts du cercle, laissant un quart vide. Chaque lettre
 * est donc placée à son angle (360° ÷ nombre de lettres), tournée autour du
 * centre : la répartition est exacte partout, sans dépendre de la mesure des
 * glyphes — c'est d'ailleurs ainsi qu'on grave un cachet, à pas régulier.
 *
 * Un seul par page, et il garde ses couleurs dans les deux thèmes : un cachet ne
 * change pas de cire avec la lumière. L'étiquette de l'image le lit en entier au
 * lecteur d'écran ; les lettres, elles, sont masquées une à une.
 */
export const Seal: FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 240 240"
    role="img"
    aria-label={`Sceau ${SITE_NAME} — site officiel ${DOMAINE}`}
    className={cn("block aspect-square", className)}
  >
    <circle cx={CENTRE} cy={CENTRE} r="118" style={{ fill: "var(--nurea-bordeaux)" }} />
    {/* Deux bagues ivoire bornent l'anneau du texte, comme la double bague d'un cachet. */}
    <circle cx={CENTRE} cy={CENTRE} r="108" fill="none" stroke="#FDF8F4" strokeOpacity="0.4" strokeWidth="0.75" />
    <circle cx={CENTRE} cy={CENTRE} r="70" fill="none" stroke="#FDF8F4" strokeOpacity="0.4" strokeWidth="0.75" />

    <g
      aria-hidden
      fill="#FDF8F4"
      fontSize="12"
      fontWeight="600"
      textAnchor="middle"
      style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
    >
      {LETTRES.map((lettre, index) => (
        <text
          key={index}
          x={CENTRE}
          y={CENTRE - RAYON_TEXTE}
          transform={`rotate(${((index * 360) / LETTRES.length).toFixed(3)} ${CENTRE} ${CENTRE})`}
        >
          {lettre}
        </text>
      ))}
    </g>

    <image
      href="/branding/monogram/logo4_monogram_free_ivory_1024.svg"
      x="70"
      y="70"
      width="100"
      height="100"
    />
  </svg>
);
