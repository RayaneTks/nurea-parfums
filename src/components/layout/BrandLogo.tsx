import type { FC } from "react";
import Image, { getImageProps } from "next/image";
import { preload } from "react-dom";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/site";

interface BrandLogoProps {
  /** Classe de hauteur, appliquée aux deux variantes ; la largeur suit le ratio. */
  className?: string;
  priority?: boolean;
}

/**
 * Taille affichée (h-10), au ratio du fichier (3375 × 719) : `next/image` en déduit
 * 256 px (1x) et 384 px (2x), que le chargeur sert par la variante `-640`.
 */
const WIDTH = 188;
const HEIGHT = 40;

/**
 * Logo « Nuréa Parfums » complet — monogramme NP dans son cercle, puis le nom (gérant, 21/10/2026) :
 * monogramme doré et nom ivoire en thème sombre, monogramme bordeaux et nom noir en thème clair.
 * À 40 px de haut : plus bas, « NURÉA » et « PARFUMS » deviennent illisibles à côté du cercle.
 *
 * La bascule se fait en CSS, jamais par `useTheme` : le logo s'affiche dès le
 * rendu serveur. Le thème sombre est celui de `:root` ; seule la classe `.light`
 * posée sur `<html>` montre la variante claire — sans JavaScript, la page reste
 * sombre et garde un logo lisible.
 */
const GOLD = "/branding/logos/nurea-logo-horizontal-dark.webp";
const WINE = "/branding/logos/nurea-logo-horizontal-light.webp";

/**
 * `priority` : chaque variante est annoncée pour le seul thème du système, sans priorité haute.
 * Préchargé d'office, le doré partait aussi en thème clair et disputait le débit au visuel du
 * premier bandeau de l'accueil (l'élément LCP). Les deux images restent paresseuses : React
 * n'en précharge aucune de lui-même.
 */
export const BrandLogo: FC<BrandLogoProps> = ({ className, priority = false }) => {
  if (priority) {
    for (const [src, media] of [[GOLD, "(prefers-color-scheme: dark)"], [WINE, "(prefers-color-scheme: light)"]] as const) {
      const { props } = getImageProps({ src, alt: "", width: WIDTH, height: HEIGHT });
      preload(props.src, { as: "image", imageSrcSet: props.srcSet, media });
    }
  }
  return (
  <>
    <Image
      src={GOLD}
      alt={SITE_NAME}
      width={WIDTH}
      height={HEIGHT}
      className={cn("block w-auto [.light_&]:hidden", className)}
    />
    <Image
      src={WINE}
      alt={SITE_NAME}
      width={WIDTH}
      height={HEIGHT}
      className={cn("hidden w-auto [.light_&]:block", className)}
    />
  </>
  );
};
