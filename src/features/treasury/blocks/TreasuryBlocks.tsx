import { routes } from "@/app-shell/routes";
import { tresorerie } from "@/server/chiffres";
import { activePockets, movementJournal, pocketActivity } from "@/server/treasury/queries";
import { JournalView } from "../components/JournalView";
import { TreasuryView } from "../components/TreasuryView";

/**
 * E03 vue Trésorerie — Trésorerie et soldes lus HORS cache (`tresorerie("instant")`, la même lecture que les poches
 * de `activePockets` dans ce rendu), activité des poches (S14) et journal du mois courant : en parallèle.
 */
export async function TreasuryBlock({ monthLabel }: { monthLabel: string }) {
  const [figures, pockets, activity, journal] = await Promise.all([
    tresorerie("instant"),
    activePockets(),
    pocketActivity(),
    movementJournal(null, null),
  ]);
  return (
    <TreasuryView
      total={figures.total}
      pockets={pockets}
      activity={activity}
      journal={journal}
      monthLabel={monthLabel}
      journalHref={routes.journal()}
    />
  );
}

/** E04 — le journal du mois (poche filtrée ou non) et les poches actives pour les chips. */
export async function JournalBlock({ month, pocketId, monthLabel }: { month: string; pocketId: string | null; monthLabel: string }) {
  const [journal, pockets] = await Promise.all([movementJournal(month, pocketId), activePockets()]);
  return <JournalView journal={journal} pockets={pockets} monthLabel={monthLabel} />;
}
