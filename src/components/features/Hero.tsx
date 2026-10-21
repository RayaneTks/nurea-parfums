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
 * La photographie du flacon Nuréa occupe la hero ; son mur, de la couleur du fond de la page, se fond
 * dedans par le haut et par le bas (masque), si bien que le texte et les entrées se posent sur le
 * même mur que le flacon, dans la zone vide prévue à la prise de vue. Rien n'est assombri.
 * Téléphone : le texte en haut, la photo portrait dessous, dont le haut (le mur) passe sous le
 * texte ; dès 768 px, la photo paysage en fond, le texte à gauche, le flacon à droite.
 *
 * Composants inchangés : `Button` plein, lien tertiaire. Le H1, unique, porte la marque ; plus la ville
 * (gérant, 21/10 : les clients viennent de Snapchat, les envois couvrent toute la France). **Accroche provisoire** : le gérant ne l'a pas validée, et toute formulation qui
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

      <div className="hero-texte enter">
        <h1 id="accueil-titre" className="t-title">
          Vos parfums préférés, dans notre flacon.
          <span className="block text-fg-2">Nuréa Parfums, envoi partout en France.</span>
        </h1>
        <p className="t-body t-measure mt-4">Choisissez au catalogue, commandez sur Snapchat.</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
          <a href="#collection" className={buttonClass("solid")}>
            Voir le catalogue
          </a>
          <a href={CONTACT.snapchat} target="_blank" rel="noopener noreferrer" className={buttonClass("link", "gap-2")}>
            <SnapchatIcon className="h-5 w-5" aria-hidden="true" />
            Commander sur Snapchat
          </a>
        </div>
      </div>
    </section>
  );
};
