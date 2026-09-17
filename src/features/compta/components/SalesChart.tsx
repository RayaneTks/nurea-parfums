"use client";

import { useMemo } from "react";
import type { EncaisseSerieDTO } from "@/contracts/chiffres";
import { BarChart } from "@/ui/patterns/BarChart";
import { Text } from "@/ui/primitives/Text";
import { seriesHasSignal, seriesPoints } from "./compta-model";

/**
 * E03 zone 3 — « Encaissé par semaine » (par jour pour une semaine, par mois pour une année et « Tout ») : un point
 * par pas, Σ des points = Encaissé de la période (`encaisseSerie`). Code du graphe chargé à la demande ; absent
 * sous deux points (05 §5.3) et quand rien n'a été encaissé sur la période.
 */
export function SalesChart({ title, serie }: { title: string; serie: EncaisseSerieDTO }) {
  const points = useMemo(() => seriesPoints(serie), [serie]);
  if (points.length < 2 || !seriesHasSignal(points)) return null;
  return (
    <section className="flex flex-col gap-2" aria-label={title} data-sales-chart>
      <Text variant="caption" tone="muted" className="font-semibold">
        {title}
      </Text>
      <BarChart series={points} ariaLabel={title} />
    </section>
  );
}
