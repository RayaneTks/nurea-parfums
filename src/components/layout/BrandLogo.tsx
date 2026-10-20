import type { FC } from "react";
import Image from "next/image";
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
export const BrandLogo: FC<BrandLogoProps> = ({ className, priority = false }) => (
  <>
    <Image
      src="/branding/logos/nurea-wordmark-ivory.webp"
      alt={SITE_NAME}
      width={WIDTH}
      height={HEIGHT}
      priority={priority}
      className={cn("block w-auto [.light_&]:hidden", className)}
    />
    <Image
      src="/branding/logos/nurea-wordmark-black.webp"
      alt={SITE_NAME}
      width={WIDTH}
      height={HEIGHT}
      className={cn("hidden w-auto [.light_&]:block", className)}
    />
  </>
);
