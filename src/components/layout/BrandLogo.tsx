import type { FC } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/site";

interface BrandLogoProps {
  /** Classes de dimension, appliquées aux deux variantes. */
  className?: string;
  priority?: boolean;
}

/** Dimensions natives du logo horizontal, pour le ratio. */
const WIDTH = 244;
const HEIGHT = 52;

/**
 * Logo horizontal, dans la variante du thème courant.
 *
 * La bascule est faite en CSS — comme pour les visuels de parfums — et non par
 * `useTheme`. Le logo s'affiche donc dès le rendu serveur, sans espace réservé
 * clignotant en attendant l'hydratation.
 */
export const BrandLogo: FC<BrandLogoProps> = ({ className, priority = false }) => (
  <>
    <Image
      src="/branding/logos/nurea-logo-horizontal-dark.webp"
      alt={SITE_NAME}
      width={WIDTH}
      height={HEIGHT}
      priority={priority}
      className={cn("hidden w-auto dark:block", className)}
    />
    <Image
      src="/branding/logos/nurea-logo-horizontal-black.webp"
      alt={SITE_NAME}
      width={WIDTH}
      height={HEIGHT}
      className={cn("block w-auto dark:hidden", className)}
    />
  </>
);
