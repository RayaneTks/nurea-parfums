import type { OpenBatchDTO } from "@/contracts/stats";
import { KpiTile } from "@/ui/patterns/KpiTile";
import { ListSection } from "@/ui/patterns/ListSection";
import { Money } from "@/ui/patterns/Money";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { formatDate } from "@/ui/patterns/date-format";
import { Badge } from "@/ui/primitives/Badge";
import { ListRow } from "@/ui/primitives/ListRow";
import { plural, type PipelineTile } from "./home-model";

/**
 * E01 zone 6 — « Commandes à livrer » : deux tuiles de compteur. Une tuile à 0 disparaît, et le bloc entier
 * avec les deux (05 §5.3) — le tri est fait par `pipelineTiles`, ici on ne fait que rendre.
 */
export function Pipeline({ tiles, hrefs }: { tiles: readonly PipelineTile[]; hrefs: Readonly<Record<string, string>> }) {
  if (tiles.length === 0) return null;
  return (
    <section className="flex flex-col gap-2" aria-label="Commandes à livrer" data-pipeline>
      <SectionHeader level={2} title="Commandes à livrer" />
      <div className={tiles.length > 1 ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 gap-3"}>
        {tiles.map((tile) => (
          <KpiTile key={tile.kind} label={tile.label} value={tile.count} href={hrefs[tile.kind] as string} />
        ))}
      </div>
    </section>
  );
}

type OpenBatchesProps = {
  batches: readonly OpenBatchDTO[];
  /** Adresse de chaque lot, de la liste et de la création — fabriquées par la page (`routes.ts`). */
  hrefOf: (id: string) => string;
  listHref: string;
  /** `null` quand un lot existe déjà : « Créer un lot » ne se propose qu'à celui qui n'en a aucun. */
  createHref: string | null;
  now?: Date;
};

/**
 * E01 zone 7 — « Lots ouverts » (3 au plus, les plus récents) : nom, arrivée prévue et nombre de documents,
 * Marge nette du lot à droite (PC-08 : elle se lit à 0 tap). Aucun lot ouvert : une rangée « Créer un lot »
 * si aucun lot n'existe, sinon une ligne calme.
 *
 * L'en-tête du bloc EST le lien « Tous les lots » (`ListSection href`, 05 §3.2) : un seul chemin visible
 * vers E05, au lieu d'un titre muet doublé d'un bouton (05 §5.3).
 *
 * Un lot dont un document est au coût à compléter porte le badge correspondant plutôt que sa Marge nette :
 * la dire provisoire vaut mieux qu'afficher un chiffre gonflé par un coût compté 0 (03 §5.4, 06 S19).
 */
export function OpenBatches({ batches, hrefOf, listHref, createHref, now = new Date() }: OpenBatchesProps) {
  if (batches.length === 0) {
    return (
      <section data-open-batches>
        <ListSection title="Lots ouverts" href={listHref}>
          {createHref ? (
            <ListRow href={createHref} primary="Créer un lot" chevron />
          ) : (
            <ListRow primary="Aucun lot ouvert." />
          )}
        </ListSection>
      </section>
    );
  }

  return (
    <section data-open-batches>
      <ListSection title="Lots ouverts" count={batches.length} href={listHref}>
        {batches.map((batch) => (
          <ListRow
            key={batch.id}
            href={hrefOf(batch.id)}
            primary={batch.name}
            secondary={[
              batch.expectedAt ? `arrivée prévue ${formatDate(new Date(batch.expectedAt), "short", now)}` : null,
              plural(batch.documentCount, "document"),
            ]
              .filter(Boolean)
              .join(" · ")}
            trailing={
              batch.hasUnknownCost ? (
                <Badge tone="warning">Coût à compléter</Badge>
              ) : (
                <Money value={batch.margeNette} compact bold />
              )
            }
          />
        ))}
      </ListSection>
    </section>
  );
}
