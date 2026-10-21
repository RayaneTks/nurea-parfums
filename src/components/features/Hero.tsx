import type { FC } from "react";
import { getImageProps } from "next/image";
import { preload } from "react-dom";
import { buttonClass } from "@/components/ui/Button";
import { SnapchatIcon } from "@/components/ui/Icons";
import { CONTACT } from "@/lib/data";

/**
 * La photographie de la hero : le flacon Nuréa, seul, contre un mur uni, en deux lumières et deux
 * cadrages (brief : `docs/refonte-vitrine/annexes/brief-photo-hero.md`). Portrait 4:5 sous 768 px,
 * paysage 16:9 au-delà. Déclinaisons (640, 1280) déclarées dans `src/lib/images/loader.ts`.
 */
const PHOTO = {
  portrait: { width: 1122, height: 1402, sombre: "/branding/hero/flacon-portrait-sombre.webp", clair: "/branding/hero/flacon-portrait-clair.webp" },
  paysage: { width: 1672, height: 941, sombre: "/branding/hero/flacon-paysage-sombre.webp", clair: "/branding/hero/flacon-paysage-clair.webp" },
} as const;

const ALT = "Un flacon Nuréa posé contre un mur, dans la lumière d'une fenêtre.";
const LARGE = "(min-width: 768px)";

type Lumiere = "sombre" | "clair";

function sources(lumiere: Lumiere) {
  const portrait = getImageProps({ src: PHOTO.portrait[lumiere], alt: ALT, width: PHOTO.portrait.width, height: PHOTO.portrait.height, sizes: "100vw", quality: 82 }).props;
  const paysage = getImageProps({ src: PHOTO.paysage[lumiere], alt: ALT, width: PHOTO.paysage.width, height: PHOTO.paysage.height, sizes: "100vw", quality: 82 }).props;
  return { portrait, paysage };
}

/**
 * La hero de l'accueil (04-PLAN-EXECUTION.md § B.10, composition « Flacon »).
 *
 * La photographie du flacon Nuréa est le fond de toute la hero ; le texte se pose sur son mur, dans
 * la zone vide prévue à la prise de vue, et le sol se fond dans la page par le bas (masque). Rien
 * n'est assombri. Téléphone : la hero a le format de la photo portrait (4:5) ; le titre et les entrées
 * forment un seul bloc au-dessus et à gauche du flacon (le bas du titre au-dessus du bouchon), les
 * entrées sur une ligne. Dès 768 px : la photo paysage, le titre et les entrées à gauche.
 *
 * Composants inchangés : `Button` plein, lien tertiaire. Le H1, unique, est l'accroche ; il nomme
 * Nuréa, pas la ville (gérant, 21/10 : les clients viennent de Snapchat, envois partout en France). **Accroche provisoire** : le gérant ne l'a pas validée, et toute formulation qui
 * rapproche le produit d'un parfum de marque attend un avis juridique (01-INVARIANTS § 1).
 *
 * Chaque lumière est annoncée pour son seul thème et chaque cadrage pour sa seule largeur ; les deux
 * images restent paresseuses (la variante masquée ne prend pas de débit), comme `PerfumeImage`.
 */
export const Hero: FC = () => {
  const sombre = sources("sombre");
  const clair = sources("clair");

  for (const [props, theme] of [
    [sombre, "dark"],
    [clair, "light"],
  ] as const) {
    preload(props.portrait.src, { as: "image", imageSrcSet: props.portrait.srcSet, imageSizes: "100vw", media: `(prefers-color-scheme: ${theme}) and (max-width: 767px)`, fetchPriority: "high" });
    preload(props.paysage.src, { as: "image", imageSrcSet: props.paysage.srcSet, imageSizes: "100vw", media: `(prefers-color-scheme: ${theme}) and ${LARGE}`, fetchPriority: "high" });
  }

  return (
    <section aria-labelledby="accueil-titre" className="hero">
      <div className="hero-photo">
        {/* Bascule de lumière en CSS (`.light` sur <html>), jamais `useTheme` : sans JavaScript, la nuit. */}
        <picture className="contents [.light_&]:hidden">
          <source media={LARGE} srcSet={sombre.paysage.srcSet} sizes="100vw" />
          {/* eslint-disable-next-line jsx-a11y/alt-text -- alt fourni par getImageProps */}
          <img {...sombre.portrait} loading="lazy" decoding="async" className="hero-photo-img" />
        </picture>
        <picture className="hidden [.light_&]:contents">
          <source media={LARGE} srcSet={clair.paysage.srcSet} sizes="100vw" />
          {/* eslint-disable-next-line jsx-a11y/alt-text -- alt fourni par getImageProps */}
          <img {...clair.portrait} loading="lazy" decoding="async" className="hero-photo-img" />
        </picture>
      </div>

      {/* Accroche provisoire (une des formulations du gérant, non validée ; avis juridique attendu). */}
      <h1 id="accueil-titre" className="hero-titre t-title enter">
        Le parfum que vous aimez, dans un flacon Nuréa.
      </h1>
      <div className="hero-entrees enter">
        <a href="#collection" className={buttonClass("solid")}>
          Voir le catalogue
        </a>
        {/* Téléphone : le bouton rond du cœur « Ma sélection », icône seule (le fantôme se reconnaît, l'intitulé
            est lu par `aria-label`) ; dès 768 px, le lien tertiaire avec son texte. */}
        <a
          href={CONTACT.snapchat}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Commander sur Snapchat"
          className={buttonClass(
            "link",
            "gap-2 max-md:press max-md:h-11 max-md:w-11 max-md:justify-center max-md:rounded-full max-md:bg-[color-mix(in_oklch,var(--surface-1)_80%,transparent)] max-md:transition-[background-color,transform] max-md:duration-dur-1"
          )}
        >
          <SnapchatIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="max-md:sr-only">Commander sur Snapchat</span>
        </a>
      </div>
    </section>
  );
};
