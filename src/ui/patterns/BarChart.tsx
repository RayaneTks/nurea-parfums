"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "../primitives/Skeleton";
import { BAR_CHART, BAR_CHART_HEIGHT, shouldRenderBarChart } from "./bar-chart-model";
import type { BarChartProps } from "./BarChartCanvas";

/** Squelette exact du graphe : même hauteur, mêmes zones. */
export function BarChartSkeleton() {
  return (
    <div aria-hidden className="flex flex-col" style={{ height: BAR_CHART_HEIGHT, gap: BAR_CHART.gapPx }}>
      <Skeleton width="40%" height={BAR_CHART.captionPx} />
      <Skeleton shape="block" height={BAR_CHART.plotPx} />
      <Skeleton width="100%" height={BAR_CHART.labelsPx} />
    </div>
  );
}

// Hors du premier rendu : le code du graphe n'arrive qu'une fois l'écran interactif.
const BarChartCanvas = dynamic(() => import("./BarChartCanvas").then((m) => m.BarChartCanvas), {
  ssr: false,
  loading: () => <BarChartSkeleton />,
});

/**
 * Graphe à barres d'un chiffre dans le temps — « Encaissé par semaine »
 * (05 §3.2, 06 E03). Sobre : barres `accent`, axe minimal, valeur au tap ou en
 * infobulle souris, tableau équivalent pour VoiceOver. SVG, sans bibliothèque.
 * Sous deux points, rien n'est rendu — pas même le squelette.
 */
export function BarChart(props: BarChartProps) {
  if (!shouldRenderBarChart(props.series)) return null;
  return <BarChartCanvas {...props} />;
}
