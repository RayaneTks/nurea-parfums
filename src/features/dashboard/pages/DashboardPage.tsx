import { Suspense } from "react";
import { Stack } from "@/ui/primitives/Stack";
import { Heading } from "@/ui/primitives/Heading";
import { Skeleton } from "@/ui/primitives/Skeleton";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { KpiBlock } from "../components/KpiBlock";
import { PipelineBlock } from "../components/PipelineBlock";
import { ActiveBatchesBlock } from "../components/ActiveBatchesBlock";
import { TopPerfumesBlock } from "../components/TopPerfumesBlock";
import { QuickActionsBlock } from "../components/QuickActionsBlock";

function KpiFallback() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={70} />
      ))}
    </div>
  );
}

export function DashboardPage() {
  return (
    <PageScaffold padding={4} ariaLabel="Tableau de bord">
      <Stack gap={4}>
        <header>
          <Heading level={1}>Tableau de bord</Heading>
          <p className="mt-0.5 text-[13px] text-[var(--admin-text-muted)]">
            Aperçu rapide — ⌘K pour tout le reste.
          </p>
        </header>

        <Suspense fallback={<KpiFallback />}>
          <KpiBlock />
        </Suspense>

        <Suspense fallback={<Skeleton height={120} />}>
          <PipelineBlock />
        </Suspense>

        <Suspense fallback={<Skeleton height={140} />}>
          <ActiveBatchesBlock />
        </Suspense>

        <Suspense fallback={<Skeleton height={200} />}>
          <TopPerfumesBlock />
        </Suspense>

        <QuickActionsBlock />
      </Stack>
    </PageScaffold>
  );
}
