"use client";

import { routes } from "@/app-shell/routes";
import type { BatchRowDTO, BatchSummary, BatchesListDTO } from "@/contracts/batches";
import { eur, eurFromWire } from "@/domain/money";
import { useDocumentSheetNavigation } from "@/features/documents/components/useDocumentSheetNavigation";
import { ListSection } from "@/ui/patterns/ListSection";
import { Money } from "@/ui/patterns/Money";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { ListRow } from "@/ui/primitives/ListRow";
import { batchLegend } from "./batches-model";
import { UnbatchedSection } from "./UnbatchedSection";

/**
 * E05 — Lots (06 E05). « À rattacher » en tête, puis les lots ouverts et les clos, repliés.
 *
 * Décision « Simplifier » de 02 §4.4 : la ligne d'un lot porte UN SEUL montant, sa Marge nette ;
 * l'Encaissé, le pourcentage, les coûts d'achat et les dépenses se lisent sur sa fiche. Deux chiffres
 * de plus par ligne, c'était quatre lectures à faire pour n'en retenir aucune.
 */
export function BatchesView({ data, openBatches }: { data: BatchesListDTO; openBatches: readonly BatchSummary[] }) {
  const sheet = useDocumentSheetNavigation();

  const nothingAtAll = data.total === 0 && data.unbatched.total === 0 && data.q === "";

  return (
    <div className="flex flex-col gap-4" data-batches-view>
      <UnbatchedSection
        data={data.unbatched}
        batches={openBatches}
        onOpenDocument={(id) => sheet.open(id)}
        q={data.q}
        pages={data.pages}
      />

      {/*
        Vide de départ : l'action de création est DÉJÀ dans l'en-tête de l'écran, sous les yeux. Deux
        chemins visibles vers la même destination sont interdits (05 §5.3) : le vide se contente de
        nommer celui qui existe.
      */}
      {nothingAtAll ? <EmptyState done title="Aucun lot. « Nouveau lot » en ouvre un." /> : null}

      {data.open.length > 0 ? (
        <ListSection title="Ouverts" count={data.open.length}>
          {data.open.map((batch) => (
            <BatchLine key={batch.id} batch={batch} />
          ))}
        </ListSection>
      ) : data.total > 0 ? (
        <EmptyState done title="Aucun lot ouvert : tout est clos." />
      ) : null}

      {data.closed.length > 0 ? (
        <ListSection collapsible title="Clos" count={data.closed.length}>
          {data.closed.map((batch) => (
            <BatchLine key={batch.id} batch={batch} />
          ))}
        </ListSection>
      ) : null}
    </div>
  );
}

/**
 * Une ligne de lot : nom, légende, et sa Marge nette à droite. Le « à encaisser » du lot complète la
 * légende quand il y en a — un seul montant en `trailing` (05 §5.4), l'autre se dit en mots.
 */
function BatchLine({ batch }: { batch: BatchRowDTO }) {
  const due = eurFromWire(batch.figures.aEncaisser);
  const carriesDue = eur.compare(due, eur.zero) > 0;
  return (
    // Repère de la rangée ENTIÈRE : la Marge nette vit en `trailing`, hors du lien (05 §3.1). Sans lui,
    // un test qui vise le lien ne verrait jamais le montant qu'il est censé vérifier.
    <div data-batch-row={batch.id}>
      <ListRow
        primary={batch.name}
        secondary={
          carriesDue ? (
            <>
              {batchLegend(batch)}
              {" · "}
              <Money value={batch.figures.aEncaisser} tone="warning" />
              {" à encaisser"}
            </>
          ) : (
            batchLegend(batch)
          )
        }
        trailing={<Money value={batch.figures.margeNette.value} />}
        href={routes.lot(batch.id)}
        chevron
        ariaLabel={`${batch.name}, Marge nette du lot`}
      />
    </div>
  );
}
