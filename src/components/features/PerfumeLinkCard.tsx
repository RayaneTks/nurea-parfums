import type { FC } from "react";
import Link from "next/link";
import type { Perfume } from "@/lib/data";
import { PerfumeImage } from "./PerfumeImage";

interface PerfumeLinkCardProps {
  perfume: Perfume;
  href: string;
  imagePriority?: boolean;
}

/**
 * Fiche de grille qui mène à une ADRESSE — pour les pages marque.
 *
 * `PerfumeCard` est un bouton qui ouvre le détail en surimpression : parfait sur l'accueil, mais
 * un robot ne clique pas, il suit des liens. Sur une page marque, chaque fiche doit donc être un
 * `<a href>` vers la page du parfum, sans quoi ces pages ne recevraient aucun lien interne.
 *
 * Même dessin que `PerfumeCard`, rendu serveur. Charte § 05 : marque, nom ; jamais de prix en
 * grille ; au survol, la couleur de fond et rien d'autre.
 */
export const PerfumeLinkCard: FC<PerfumeLinkCardProps> = ({ perfume, href, imagePriority = false }) => (
  <Link
    href={href}
    className="flex h-full w-full flex-col border border-nurea-border bg-nurea-surface text-left transition-colors duration-nurea ease-out hover:bg-nurea-surface-hover"
  >
    <div className="nurea-visuel-parfum relative w-full overflow-hidden">
      <PerfumeImage perfume={perfume} sizes="(max-width: 1023px) 50vw, 33vw" priority={imagePriority} />
    </div>
    <div className="border-t border-nurea-border p-5">
      <p className="nurea-label line-clamp-2">{perfume.brand}</p>
      <p className="nurea-name mt-2 line-clamp-2 text-nurea-text">{perfume.name}</p>
    </div>
  </Link>
);
