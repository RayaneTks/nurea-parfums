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
 * Taille affichée (h-6), au ratio du fichier (2794 × 504) : `next/image` en déduit
 * 256 px (1x) et 640 px (2x et plus), que le chargeur sert par la variante `-640`.
 */
const WIDTH = 133;
const HEIGHT = 24;

/**
 * Logotype « Nuréa Parfums » : ivoire sur sombre, noir sur clair.
 *
 * La bascule se fait en CSS, jamais par `useTheme` : le logo s'affiche dès le
 * rendu serveur. Le thème sombre est celui de `:root` ; seule la classe `.light`
 * posée sur `<html>` montre la variante noire — sans JavaScript, la page reste
 * sombre et garde un logo lisible.
 */
/** Logotype aux couleurs de marque : doré en thème sombre, bordeaux en thème clair (gérant, 21/10/2026). */
const GOLD = "/branding/logos/nurea-wordmark-gold.webp";
const WINE = "/branding/logos/nurea-wordmark-bordeaux.webp";

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
