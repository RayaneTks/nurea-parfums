import type { FC } from "react";
import type { Perfume } from "@/lib/data";
import { PerfumeImage } from "@/components/features/PerfumeImage";
import { cn } from "@/lib/utils";

interface BottleMosaicProps {
  /** Un à trois flacons. Au-delà de trois, les suivants sont ignorés. */
  perfumes: readonly Perfume[];
  /** Le premier visuel est au-dessus de la ligne de flottaison : il se précharge. */
  priority?: boolean;
  className?: string;
}

/**
 * Trois flacons, un grand et deux petits empilés, bord contre bord.
 *
 * Le parfum est la star (PRODUCT.md) : ces pages n'avaient aucune image, alors
 * que le catalogue en porte une centaine, toutes faites pour être regardées.
 * La mosaïque les rend à ces pages sans en fabriquer de nouvelles.
 *
 * Le calage est exact (`.nurea-mosaique`, `app/globals.css`) : les photos sont
 * toutes en 2:3, et une colonne double contre une colonne simple donne au
 * grand visuel la hauteur des deux petits. Aucune photo n'est rognée.
 *
 * Avec moins de trois flacons, la mosaïque se réduit à un seul grand visuel
 * plutôt que de laisser une case vide.
 */
export const BottleMosaic: FC<BottleMosaicProps> = ({ perfumes, priority = false, className }) => {
  const [premier, ...autres] = perfumes.slice(0, 3);
  if (!premier) return null;

  const complete = autres.length === 2;

  return (
    <div className={cn("nurea-filets", complete && "nurea-mosaique", className)}>
      <figure className="nurea-visuel-parfum relative">
        <PerfumeImage
          perfume={premier}
          sizes="(max-width: 767px) 67vw, 34vw"
          priority={priority}
        />
      </figure>
      {complete &&
        autres.map((parfum) => (
          <figure key={parfum.id} className="nurea-visuel-parfum relative">
            <PerfumeImage perfume={parfum} sizes="(max-width: 767px) 33vw, 17vw" />
          </figure>
        ))}
    </div>
  );
};
