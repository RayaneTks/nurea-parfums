import type { FC } from "react";
import Image from "next/image";
import type { Perfume } from "@/lib/data";
import { NUREA_IMAGE_BLUR_DATA_URL } from "@/lib/blurPlaceholder";
import { cn } from "@/lib/utils";

interface PerfumeImageProps {
  perfume: Perfume;
  sizes: string;
  priority?: boolean;
  className?: string;
}

const FALLBACK = "/placeholder.svg";

/**
 * Visuel d'un parfum, dans la variante du thème courant.
 *
 * Règle métier (voir `CLAUDE.md`) : l'image principale **est** la variante
 * sombre ; `imageLight` est une variante claire facultative.
 *
 * La bascule est faite en CSS, pas en JavaScript. C'est ce qui permet aux
 * grilles et au détail de rester rendus côté serveur, et supprime le
 * clignotement qu'imposait un montage client avant de connaître le thème
 * résolu. Quand il n'existe pas de variante claire — le cas courant — une seule
 * image est demandée.
 */
export const PerfumeImage: FC<PerfumeImageProps> = ({
  perfume,
  sizes,
  priority = false,
  className,
}) => {
  const dark = perfume.image || FALLBACK;
  const light = perfume.imageLight?.trim();
  const alt = `${perfume.brand} — ${perfume.name}`;
  const blurDataURL = perfume.blurDataURL || NUREA_IMAGE_BLUR_DATA_URL;

  if (!light) {
    return (
      <Image
        src={dark}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        quality={80}
        placeholder="blur"
        blurDataURL={blurDataURL}
        className={cn("object-cover", className)}
      />
    );
  }

  /* `display: none` retire la variante masquée de l'arbre d'accessibilité :
     les deux portent donc le même texte de remplacement sans être annoncées
     deux fois. Seule la variante sombre est préchargée — c'est celle que le
     rendu serveur affiche. */
  return (
    <>
      <Image
        src={dark}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        quality={80}
        placeholder="blur"
        blurDataURL={blurDataURL}
        className={cn("hidden object-cover dark:block", className)}
      />
      <Image
        src={light}
        alt={alt}
        fill
        sizes={sizes}
        quality={80}
        placeholder="blur"
        blurDataURL={blurDataURL}
        className={cn("block object-cover dark:hidden", className)}
      />
    </>
  );
};
