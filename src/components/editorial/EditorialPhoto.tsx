import type { FC } from "react";
import Image, { getImageProps } from "next/image";
import { preload } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Les photos éditoriales de la vitrine (`public/branding/editorial/`), chacune en deux lumières, même
 * cadrage au pixel près : la bascule de thème ne change que la lumière. Images générées pour Nuréa
 * (21/10/2026, aucun être vivant, le flacon Nuréa copié sur la photo réelle) ; les écrans des
 * téléphones (écran vert à la génération) portent des captures réelles incrustées : le catalogue, et
 * le profil Snapchat tel que l'appli l'affiche, stories nettes (choix du gérant, 21/10, malgré leurs prix). Sources et méthode : `docs/refonte-vitrine/annexes/photos-editoriales.md`.
 */
export type EditorialPhotoName = "atelier" | "choisir" | "ecrire" | "recevoir";

const ALT: Record<EditorialPhotoName, string> = {
  atelier:
    "Un flacon Nuréa ouvert sur un plan de travail, près d'un entonnoir, d'une éprouvette et de flacons ambrés.",
  choisir:
    "Un téléphone posé sur une table affiche le catalogue Nuréa, un flacon Nuréa à côté.",
  ecrire:
    "Un téléphone appuyé contre un flacon Nuréa affiche le profil Snapchat de Nuréa Parfums.",
  recevoir: "Un colis ouvert : le flacon Nuréa posé sur du papier de soie.",
};

/**
 * Bascule en CSS (`.light` sur <html>), jamais `useTheme` ; les deux images restent paresseuses, la
 * masquée ne se charge pas. Format natif 2:3 ; `className` règle le cadre (rayon, ratio éventuel).
 */
export const EditorialPhoto: FC<{
  name: EditorialPhotoName;
  sizes: string;
  /** Photo du haut de page (image LCP) : chaque lumière annoncée pour son seul thème, priorité haute. */
  priority?: boolean;
  className?: string;
  imgClassName?: string;
}> = ({ name, sizes, priority = false, className, imgClassName }) => {
  if (priority) {
    for (const [lumiere, theme] of [
      ["sombre", "dark"],
      ["clair", "light"],
    ] as const) {
      const { props } = getImageProps({
        src: `/branding/editorial/${name}-${lumiere}.webp`,
        alt: "",
        width: 1024,
        height: 1536,
        sizes,
      });
      preload(props.src, {
        as: "image",
        imageSrcSet: props.srcSet,
        imageSizes: sizes,
        media: `(prefers-color-scheme: ${theme})`,
        fetchPriority: "high",
      });
    }
  }
  return (
    <div className={cn("overflow-hidden bg-surface-1", className)}>
      {(["sombre", "clair"] as const).map((lumiere) => (
        <Image
          key={lumiere}
          src={`/branding/editorial/${name}-${lumiere}.webp`}
          alt={ALT[name]}
          width={1024}
          height={1536}
          sizes={sizes}
          className={cn(
            "h-full w-full object-cover",
            lumiere === "sombre"
              ? "[.light_&]:hidden"
              : "hidden [.light_&]:block",
            imgClassName,
          )}
        />
      ))}
    </div>
  );
};
