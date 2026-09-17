import { Block } from "@/app-shell/Block";
import { routes } from "@/app-shell/routes";
import { journalNavigation, parseJournalMonth } from "@/contracts/compta";
import { PeriodStepper } from "@/features/compta/components/PeriodStepper";
import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { JournalBlock } from "../blocks/TreasuryBlocks";
import { JournalSkeleton } from "../blocks/skeletons";

/**
 * E04 — Journal (06 E04, A-2) : navigateur de mois tout de suite, puis le journal dans son bloc. Retour
 * « Trésorerie » rendu par le shell ; `doc` ouvre la fiche d'un paiement au-dessus (A-3).
 */
export function JournalPage({ month, pocketId, docId }: { month: string; pocketId: string | null; docId?: string }) {
  const now = new Date();
  const navigation = journalNavigation(month, now);
  const currentMonth = parseJournalMonth(null, now);
  // Le mois courant s'écrit sans `mois` : l'adresse de l'état par défaut reste nue.
  const at = (target: string) => routes.journal({ mois: target === currentMonth ? undefined : target, poche: pocketId ?? undefined });

  return (
    <PageScaffold ariaLabel="Journal" docId={docId} sheet={<DocumentSheetSlot docId={docId} />}>
      <SectionHeader title="Journal" />
      <PeriodStepper
        label={navigation.label}
        previousHref={at(navigation.previous)}
        nextHref={navigation.next === null ? null : at(navigation.next)}
        previousLabel="Mois précédent"
        nextLabel="Mois suivant"
      />
      <Block fallback={<JournalSkeleton />} errorMessage="Journal indisponible.">
        <JournalBlock month={month} pocketId={pocketId} monthLabel={navigation.figureLabel} />
      </Block>
    </PageScaffold>
  );
}
