import { Suspense } from "react";
import { Stack } from "@/ui/primitives/Stack";
import { Card } from "@/ui/primitives/Card";
import { Skeleton } from "@/ui/primitives/Skeleton";
import { Heading } from "@/ui/primitives/Heading";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { AlertsBlock, AlertsFallback } from "../components/AlertsBlock";
import { MoneyBlock, MoneyBlockFallback } from "../components/MoneyBlock";
import { PipelineBlock } from "../components/PipelineBlock";
import { ActiveBatchesBlock } from "../components/ActiveBatchesBlock";
import { TopPerfumesBlock } from "../components/TopPerfumesBlock";
import { ShortcutsBlock } from "../components/ShortcutsBlock";

function ListBlockFallback({ label }: { label: string }) {
  return (
    <Card padding={0} aria-busy="true" aria-label={label}>
      <div className="border-b border-[var(--admin-border)] px-3 py-2.5">
        <Skeleton width="45%" height={14} />
      </div>
      <div className="divide-y divide-[var(--admin-border)]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton width="70%" height={14} />
              <Skeleton width="50%" height={11} />
            </div>
            <Skeleton width={48} height={14} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function PipelineFallback() {
  return (
    <div aria-hidden className="grid grid-cols-3 gap-2">
      <div className="admin-skeleton h-[72px] rounded-[14px]" />
      <div className="admin-skeleton h-[72px] rounded-[14px]" />
      <div className="admin-skeleton h-[72px] rounded-[14px]" />
    </div>
  );
}

/**
 * Tableau de bord.
 *
 * Ordre de lecture, du plus urgent au plus contextuel :
 *   1. Alertes      — ce qui bloque aujourd'hui (rien affiché si rien à faire).
 *   2. Argent       — un chiffre dominant, trois chiffres de contexte.
 *   3. Commandes    — compteurs d'actions à mener.
 *   4. Raccourcis   — écrans sans onglet dédié.
 *   5. Lots / Top   — suivi, consulté volontairement.
 *
 * Chaque bloc a son propre `Suspense` : le premier chiffre s'affiche sans
 * attendre la requête la plus lente de l'écran.
 */
export function DashboardPage() {
  const today = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <PageScaffold padding={4} ariaLabel="Tableau de bord">
      <Stack gap={4}>
        <header>
          <Heading level={1}>Tableau de bord</Heading>
          <p className="mt-0.5 text-[13px] capitalize text-[var(--admin-text-muted)]">{today}</p>
        </header>

        <Suspense fallback={<AlertsFallback />}>
          <AlertsBlock />
        </Suspense>

        <Suspense fallback={<MoneyBlockFallback />}>
          <MoneyBlock />
        </Suspense>

        <Suspense fallback={<PipelineFallback />}>
          <PipelineBlock />
        </Suspense>

        <ShortcutsBlock />

        <Suspense fallback={<ListBlockFallback label="Chargement des lots" />}>
          <ActiveBatchesBlock />
        </Suspense>

        <Suspense fallback={<ListBlockFallback label="Chargement des parfums" />}>
          <TopPerfumesBlock />
        </Suspense>
      </Stack>
    </PageScaffold>
  );
}
