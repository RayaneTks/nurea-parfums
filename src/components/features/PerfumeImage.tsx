"use client";

import { useState, type FC } from "react";
import Image, { getImageProps } from "next/image";
import { preload } from "react-dom";
import type { Perfume } from "@/lib/data";
import { NUREA_IMAGE_BLUR_DATA_URL } from "@/lib/blurPlaceholder";
import { cn } from "@/lib/utils";

interface PerfumeImageProps {
  perfume: Perfume;
  sizes: string;
  priority?: boolean;
  /**
   * Élément LCP d'une page qui a deux variantes (bandeau de l'accueil) : chaque variante est
   * préchargée pour le seul thème du système, l'autre ne prend pas de débit (sans variante claire :
   * comme `priority`). À ne pas cumuler avec `priority`.
   */
  preloadByTheme?: boolean;
  className?: string;
}

/**
 * Visuel d'un parfum (2:3), dans la variante du thème courant. À poser dans un cadre `relative`
 * au ratio 2:3 : l'image le remplit.
 *
 * - `image` **est** la variante sombre ; `imageLight`, facultative, la remplace en thème clair.
 *   Bascule en CSS (`.light` sur <html>), jamais `useTheme` : sans JavaScript la page reste
 *   sombre et son visuel s'affiche ; rien ne clignote. `display: none` retire la variante masquée
 *   de l'arbre d'accessibilité : un seul texte de remplacement annoncé.
 * - Petites largeurs : la vignette 640 × 960, choisie par `src/lib/images/loader.ts` selon `sizes`.
 * - Fichier introuvable : un aplat neutre et une légende, jamais l'icône d'image cassée.
 */
export const PerfumeImage: FC<PerfumeImageProps> = ({ perfume, sizes, priority = false, preloadByTheme = false, className }) => {
  const [failed, setFailed] = useState(false);
  const light = perfume.imageLight?.trim();
  // Les photos montrent le flacon d'origine de la marque (MENTION_FLACONS, dite par la fiche).
  const alt = `${perfume.name} de ${perfume.brand}, flacon d'origine`;

  if (failed || !perfume.image) {
    return (
      <div role="img" aria-label={alt} className="absolute inset-0 flex items-end bg-surface-2 p-3">
        <span className="t-caption">Photo indisponible</span>
      </div>
    );
  }

  const common = {
    fill: true,
    sizes,
    quality: 80,
    placeholder: "blur" as const,
    blurDataURL: perfume.blurDataURL || NUREA_IMAGE_BLUR_DATA_URL,
    onError: () => setFailed(true),
  };

  // Sans variante claire, un seul fichier pour les deux thèmes : préchargé sans condition.
  if (!light) return <Image src={perfume.image} alt={alt} priority={priority || preloadByTheme} {...common} className={cn("object-cover", className)} />;

  /*
   * React précharge d'office toute image non paresseuse, sans tenir compte du thème : les deux
   * variantes partaient ensemble et se partageaient le débit. Ici, les deux images restent
   * paresseuses (aucun préchargement automatique) et chacune est annoncée pour son thème ; la
   * variante affichée est déjà en cache quand la mise en page la demande. Un thème choisi à la main
   * contre celui du système perd seulement l'annonce.
   */
  if (preloadByTheme) {
    for (const [src, media] of [[perfume.image, "(prefers-color-scheme: dark)"], [light, "(prefers-color-scheme: light)"]] as const) {
      const { props } = getImageProps({ src, alt: "", fill: true, sizes, quality: 80 });
      preload(props.src, { as: "image", imageSrcSet: props.srcSet, imageSizes: props.sizes, media, fetchPriority: "high" });
    }
  }

  // Seule la variante sombre est préchargée : c'est celle du rendu sans JavaScript.
  return (
    <>
      <Image src={perfume.image} alt={alt} priority={priority} {...common} className={cn("object-cover [.light_&]:hidden", className)} />
      {/* Image prioritaire (fiche ouverte) : l'autre variante se charge aussi tout de suite, masquée,
          pour que la bascule de thème la trouve prête. Dans les grilles elle reste paresseuse. */}
      <Image src={light} alt={alt} loading={priority ? "eager" : undefined} {...common} className={cn("hidden object-cover [.light_&]:block", className)} />
    </>
  );
};
