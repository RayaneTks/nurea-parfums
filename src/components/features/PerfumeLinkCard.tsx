import type { FC } from "react";
import Link from "next/link";
import type { Perfume } from "@/lib/data";
import { ambientStyle } from "@/lib/catalog/ambient";
import { brandLineLabel } from "@/lib/catalog/perfumePresentation";
import { PerfumeImage } from "./PerfumeImage";

interface PerfumeLinkCardProps {
  perfume: Perfume;
  href: string;
  imagePriority?: boolean;
  /** Largeur affichée du visuel (attribut `sizes`). */
  sizes?: string;
}

/**
 * Carte de grille qui mène à une ADRESSE — pour les pages marque.
 *
 * `PerfumeCard` ouvre la fiche en surimpression : parfait sur l'accueil, mais un robot ne clique
 * pas, il suit des liens. Ici, le nom est un `<a href>` vers la page du parfum, étendu à toute la
 * carte (`::after`). Même dessin et mêmes règles que `PerfumeCard` (`.card`, ambiance au survol et à
 * l'appui), rendu serveur, sans cœur : la sélection vit sur l'accueil et la fiche. Jamais de prix,
 * jamais de contenance.
 */
export const PerfumeLinkCard: FC<PerfumeLinkCardProps> = ({
  perfume,
  href,
  imagePriority = false,
  sizes = "(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw",
}) => {
  const brandLine = brandLineLabel(perfume.brand, perfume.line);

  return (
    <article className="card relative flex w-full min-w-0 flex-col rounded-lg p-2" style={ambientStyle(perfume)}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-surface-2">
        <PerfumeImage perfume={perfume} sizes={sizes} priority={imagePriority} />
      </div>
      <div className="flex min-w-0 flex-col gap-1 px-2 pb-2 pt-3">
        <p className="card-brand t-body line-clamp-2 hyphens-auto [overflow-wrap:anywhere]">{brandLine}</p>
        <p className="card-name t-subtitle hyphens-auto [overflow-wrap:anywhere]">
          <Link
            href={href}
            className="card-open block w-full text-left after:absolute after:inset-0 after:rounded-lg"
          >
            <span className="line-clamp-3">{perfume.name}</span>
          </Link>
        </p>
      </div>
    </article>
  );
};
