import { eur, eurFromWire, percentOf, type MoneyString } from "@/domain/money";

export type BarPoint = {
  /** Libellé court de la période : « S36 », « sept. », « lun. 14 ». */
  label: string;
  value: MoneyString;
};

/** Hauteur fixe du graphe, squelette compris : rien ne bouge à l'arrivée. */
export const BAR_CHART = { captionPx: 20, plotPx: 128, labelsPx: 16, gapPx: 8 } as const;
export const BAR_CHART_HEIGHT = BAR_CHART.captionPx + BAR_CHART.plotPx + BAR_CHART.labelsPx + 2 * BAR_CHART.gapPx;

/** Sous deux points, un graphe ne raconte rien : il ne s'affiche pas (05 §5.3). */
export function shouldRenderBarChart(series: readonly BarPoint[]): boolean {
  return series.length >= 2;
}

/**
 * Hauteur de chaque barre en pourcentage de la plus haute (« 23.4 »), par le
 * module monétaire — aucun `Number()` sur un montant. Un négatif (période où
 * les remboursements dépassent) vaut 0 ; un montant non nul garde au moins
 * 1 % pour rester visible.
 */
export function barHeights(series: readonly BarPoint[]): string[] {
  const values = series.map((p) => eur.clampZero(eurFromWire(p.value)));
  const max = values.reduce((m, v) => eur.max(m, v), eur.zero);
  return values.map((v) => {
    const pct = percentOf(v, max);
    if (pct === null || eur.isZero(v)) return "0";
    return pct === "0,0" ? "1" : pct.replace(",", ".");
  });
}

/** Un libellé sur `stride` : au-delà de 7 barres, six libellés au plus. */
export function labelStride(count: number): number {
  return count <= 7 ? 1 : Math.ceil(count / 6);
}
