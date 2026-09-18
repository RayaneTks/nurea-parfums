import { routes } from "@/app-shell/routes";
import type { PeriodKey } from "@/contracts/chiffres";
import { topPerfumesLimit } from "@/contracts/stats";
import { classementParfums } from "@/server/stats/queries";
import { Classement } from "../components/Classement";
import { MorePerfumes } from "../components/MorePerfumes";
import { unitsSubtitle } from "../components/home-model";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { Text } from "@/ui/primitives/Text";

/**
 * E07 — le classement d'une période, en unités (06 E07). `pages` lignes de 20, « Afficher plus » ajoute la
 * suivante à la suite : le sous-titre parle de TOUTE la période, pas des lignes rendues — les deux nombres
 * sortent de la même requête (`classementSql` : fenêtres calculées avant la limite).
 *
 * Aucune vente sur la période : une ligne calme, sans bouton (05 §5.1 — le vide « tout est fait » d'un
 * écran de lecture n'a pas d'action suivante à nommer).
 */
export async function ClassementBlock({ periode, period, pages }: { periode: PeriodKey; period: string; pages: number }) {
  const data = await classementParfums(periode, topPerfumesLimit(pages));

  if (data.entries.length === 0) {
    return <EmptyState done title="Aucune vente sur cette période." />;
  }

  return (
    <div className="flex flex-col gap-3">
      <Text variant="body" tone="muted">
        {unitsSubtitle(data.totalUnits, period)}
      </Text>
      <Classement
        data={data}
        hrefOf={(perfumeId: number) => routes.parfum(perfumeId)}
        footer={data.entries.length < data.totalEntries ? <MorePerfumes pages={pages} /> : undefined}
      />
    </div>
  );
}
