"use client";

import type { StockBottleDTO } from "@/contracts/stock";
import { eurFromWire, formatEur } from "@/domain/money";
import { Chip } from "@/ui/primitives/Chip";
import { Text } from "@/ui/primitives/Text";

/**
 * « Déjà en stock » (docs/admin/desistements.md) : les flacons libres, en tête des articles de Vendre. Un toucher
 * pose le flacon au ticket, au prix prévu et avec son coût d'achat ; un flacon déjà au ticket n'est plus proposé.
 */
export function StockStrip({
  bottles,
  taken,
  onPick,
}: {
  bottles: readonly StockBottleDTO[];
  taken: readonly { bottleId?: string }[];
  onPick: (bottle: StockBottleDTO) => void;
}) {
  const chosen = new Set(taken.flatMap((line) => (line.bottleId ? [line.bottleId] : [])));
  // Un flacon déjà au ticket n'est plus proposé.
  const free = bottles.filter((bottle) => !chosen.has(bottle.id));
  if (free.length === 0) return null;
  return (
    <div className="flex flex-col gap-2" data-stock-strip>
      <Text variant="micro" tone="muted" uppercase>
        Déjà en stock
      </Text>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {free.map((bottle) => {
          const name = [bottle.perfumeName, bottle.volumeMl ? `${bottle.volumeMl} ml` : null].filter(Boolean).join(" · ");
          const price = formatEur(eurFromWire(bottle.plannedPriceEur));
          return (
            <Chip key={bottle.id} onClick={() => onPick(bottle)} ariaLabel={`Ajouter ${name} en stock, ${price}`} className="shrink-0">
              {name} · {price}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}
