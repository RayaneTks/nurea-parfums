import { Block } from "@/app-shell/Block";
import { routes } from "@/app-shell/routes";
import { PERIOD_PARAMS, type PeriodParam } from "@/contracts/chiffres";
import {
  comptaPeriodKey,
  exportComptaUrl,
  exportFileName,
  exportRangeOf,
  figurePeriodLabel,
  journalNavigation,
  parseJournalMonth,
  periodNavigation,
  seriesTitle,
  type ComptaParams,
  type ComptaView,
} from "@/contracts/compta";
import { DocumentSheetSlot } from "@/features/documents";
import { TreasuryBlock } from "@/features/treasury/blocks/TreasuryBlocks";
import { TreasurySkeleton } from "@/features/treasury/blocks/skeletons";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { PeriodDocumentsBlock, SalesChartBlock, SalesFiguresBlock } from "../blocks/SalesBlocks";
import { PeriodDocumentsSkeleton, SalesChartSkeleton, SalesFiguresSkeleton } from "../blocks/skeletons";
import { ComptaViewSwitch, PeriodSelector } from "../components/ComptaControls";
import { ExportButton } from "../components/ExportButton";

/**
 * E03 — Compta (06 E03) : « Ventes | Trésorerie », période, « Exporter ». Titre, vue et période s'affichent tout
 * de suite ; chiffres, graphe, documents et Trésorerie arrivent chacun dans leur bloc (squelette exact, erreur par
 * bloc). Les paramètres sont lus par la page et passés aux blocs (04 §13.1 règle 3) ; `doc` ouvre la fiche document
 * au-dessus (A-3). Écran de lecture : aucune action primaire.
 */
export function ComptaPage({ params, docId }: { params: ComptaParams; docId?: string }) {
  const now = new Date();
  const periodKey = comptaPeriodKey(params);
  const period = figurePeriodLabel(params.periode, params.ref, now);
  const navigation = periodNavigation(params.periode, params.ref, now);
  const range = exportRangeOf(params, now);
  const chartTitle = seriesTitle(params.periode);
  const ref = params.ref ?? undefined;

  const viewHrefs: Record<ComptaView, string> = {
    ventes: routes.compta({ periode: params.periode === "mois" ? undefined : params.periode, ref }),
    tresorerie: routes.compta({ vue: "tresorerie" }),
  };
  const periodHrefs = Object.fromEntries(
    (Object.keys(PERIOD_PARAMS) as PeriodParam[]).map((periode) => [periode, routes.compta({ periode: periode === "mois" ? undefined : periode })]),
  ) as Record<PeriodParam, string>;
  const withRef = (next: string | null) =>
    routes.compta({ periode: params.periode === "mois" ? undefined : params.periode, ref: next ?? undefined, q: params.q || undefined, filtre: params.filtre ?? undefined });

  return (
    <PageScaffold formScroll ariaLabel="Compta" docId={docId} sheet={<DocumentSheetSlot docId={docId} />}>
      <SectionHeader
        title="Compta"
        action={params.vue === "ventes" ? <ExportButton url={exportComptaUrl(range)} fileName={exportFileName(range)} /> : undefined}
      />
      <ComptaViewSwitch value={params.vue} hrefs={viewHrefs} />

      {params.vue === "ventes" ? (
        <>
          <PeriodSelector
            periode={params.periode}
            hrefs={periodHrefs}
            navigation={
              navigation
                ? {
                    label: navigation.label,
                    previousHref: withRef(navigation.previous.ref),
                    nextHref: navigation.next ? withRef(navigation.next.ref) : null,
                  }
                : null
            }
          />
          <Block fallback={<SalesFiguresSkeleton />} errorMessage="Chiffres indisponibles.">
            <SalesFiguresBlock
              periode={periodKey}
              period={period}
              collectHref={routes.encaisser()}
              unknownCostHref={routes.compta({
                periode: params.periode === "mois" ? undefined : params.periode,
                ref,
                q: params.q || undefined,
                filtre: "cout-a-completer",
              })}
            />
          </Block>
          {chartTitle ? (
            <Block fallback={<SalesChartSkeleton />} errorMessage="Graphe indisponible.">
              <SalesChartBlock periode={periodKey} title={chartTitle} />
            </Block>
          ) : null}
          <Block fallback={<PeriodDocumentsSkeleton />} errorMessage="Documents indisponibles.">
            <PeriodDocumentsBlock periode={periodKey} q={params.q} filtre={params.filtre} />
          </Block>
        </>
      ) : (
        <Block fallback={<TreasurySkeleton />} errorMessage="Poches indisponibles.">
          <TreasuryBlock monthLabel={journalNavigation(parseJournalMonth(null, now), now).figureLabel} />
        </Block>
      )}
    </PageScaffold>
  );
}
