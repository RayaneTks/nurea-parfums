import { Block } from "@/app-shell/Block";
import { routes } from "@/app-shell/routes";
import { PERIOD_PARAMS, type PeriodParam } from "@/contracts/chiffres";
import { figurePeriodLabel, periodNavigation } from "@/contracts/compta";
import { statsPeriodKey, type StatsParams } from "@/contracts/stats";
import { PeriodSelector } from "@/features/compta/components/ComptaControls";
import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { ClassementBlock } from "../blocks/StatsBlocks";
import { ClassementSkeleton } from "../blocks/skeletons";

/**
 * E07 — Statistiques (06 E07) : quels parfums tournent, sur une période choisie. Classement EN UNITÉS —
 * aucun montant n'est sommé hors du vocabulaire canonique (02 §6).
 *
 * Titre, sélecteur de période et navigateur s'affichent tout de suite ; le classement arrive dans son bloc
 * (squelette de liste, erreur par bloc). Les paramètres sont lus par la page et passés au bloc
 * (04 §13.1 règle 3) ; `doc` ouvre la fiche document au-dessus (A-3).
 *
 * Changement par rapport à l'existant (01 §4.6) : un parfum non publié ou masqué N'EST PLUS exclu du
 * classement — l'ancien écran le retirait, et son total ne correspondait plus aux ventes.
 */
export function StatistiquesPage({ params, docId }: { params: StatsParams; docId?: string }) {
  const now = new Date();
  const periodKey = statsPeriodKey(params);
  const period = figurePeriodLabel(params.periode, params.ref, now);
  const navigation = periodNavigation(params.periode, params.ref, now);

  // Changer de période ou de mois repart de la première page : un classement se lit du haut.
  const periodHrefs = Object.fromEntries(
    (Object.keys(PERIOD_PARAMS) as PeriodParam[]).map((periode) => [
      periode,
      routes.statistiques({ periode: periode === "mois" ? undefined : periode }),
    ]),
  ) as Record<PeriodParam, string>;
  const withRef = (next: string | null) =>
    routes.statistiques({ periode: params.periode === "mois" ? undefined : params.periode, ref: next ?? undefined });

  return (
    <PageScaffold ariaLabel="Statistiques" docId={docId} sheet={<DocumentSheetSlot docId={docId} />}>
      <SectionHeader title="Statistiques" />
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
      <Block fallback={<ClassementSkeleton />} errorMessage="Classement indisponible.">
        <ClassementBlock periode={periodKey} period={period} pages={params.pages} />
      </Block>
    </PageScaffold>
  );
}
