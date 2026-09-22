import type { PeriodKey } from "@/contracts/chiffres";
import type { ComptaFilter } from "@/contracts/compta";
import { aEncaisser, encaisse, encaisseSerie, margeNette } from "@/server/chiffres";
import { comptaDocuments } from "@/server/documents/queries";
import { PeriodDocuments } from "../components/PeriodDocuments";
import { SalesChart } from "../components/SalesChart";
import { SalesFigures } from "../components/SalesFigures";

/**
 * E03 zone 2 — Encaissé et Marge nette de la période, À encaisser à date : un aller-retour parallèle, les
 * définitions de `src/server/chiffres` (04 §6), jamais recomposées.
 */
export async function SalesFiguresBlock({
  periode,
  period,
  collectHref,
  unknownCostHref,
}: {
  periode: PeriodKey;
  period: string;
  collectHref: string;
  unknownCostHref: string;
}) {
  const [encaisseValue, marge, due] = await Promise.all([encaisse(periode), margeNette(periode), aEncaisser()]);
  return (
    <SalesFigures
      period={period}
      encaisse={encaisseValue}
      margeNette={marge}
      aEncaisser={due}
      collectHref={collectHref}
      unknownCostHref={unknownCostHref}
    />
  );
}

/** E03 zone 3 — la série « Encaissé par … » de la période (`encaisseSerie`). */
export async function SalesChartBlock({ periode, title }: { periode: PeriodKey; title: string }) {
  const serie = await encaisseSerie(periode);
  return <SalesChart title={title} serie={serie} />;
}

/** E03 zones 4 et 5 — les documents de la période, recherche et filtre appliqués (`comptaDocuments`). */
export async function PeriodDocumentsBlock({ periode, q, filtre }: { periode: PeriodKey; q: string; filtre: ComptaFilter | null }) {
  const data = await comptaDocuments(periode, q, filtre);
  return <PeriodDocuments data={data} />;
}
