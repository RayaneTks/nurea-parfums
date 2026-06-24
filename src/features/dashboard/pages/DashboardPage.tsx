import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Stack } from "@/ui/primitives/Stack";
import { Heading } from "@/ui/primitives/Heading";
import { Skeleton } from "@/ui/primitives/Skeleton";
import { Card } from "@/ui/primitives/Card";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { treasurySummary } from "@/server/treasury/queries";
import { KpiBlock } from "../components/KpiBlock";
import { KpiSkeletonGrid } from "../components/KpiSkeletonGrid";
import { PipelineBlock } from "../components/PipelineBlock";
import { ActiveBatchesBlock } from "../components/ActiveBatchesBlock";
import { TopPerfumesBlock } from "../components/TopPerfumesBlock";
import { QuickActionsBlock } from "../components/QuickActionsBlock";

function PipelineFallback() {
  return (
    <Card padding={3} aria-busy="true" aria-label="Chargement du pipeline">
      <Skeleton width="40%" height={14} />
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={64} className="rounded-[12px]" />
        ))}
      </div>
    </Card>
  );
}

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

async function UnattributedBanner() {
  const { unattributed } = await treasurySummary();
  const amount = Number(unattributed);
  if (!Number.isFinite(amount) || amount <= 0.005) return null;
  return (
    <Link
      href="/admin/compta"
      prefetch
      className="block rounded-[14px] border border-[var(--admin-danger-border)] bg-[var(--admin-danger-bg)] p-3 tap-scale"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[14px] font-semibold text-[var(--admin-danger)]">
          <AlertTriangle size={16} />
          {amount.toFixed(2)} € non attribué
        </span>
        <span className="text-[13px] font-semibold text-[var(--admin-danger)]">Répartir →</span>
      </span>
      <span className="mt-1 block text-[12px] text-[var(--admin-text-muted)]">
        De l&apos;argent encaissé/dépensé n&apos;est pas affecté à une poche.
      </span>
    </Link>
  );
}

export function DashboardPage() {
  return (
    <PageScaffold padding={4} ariaLabel="Tableau de bord">
      <Stack gap={4}>
        <header>
          <Heading level={1}>Tableau de bord</Heading>
          <p className="mt-0.5 text-[13px] text-[var(--admin-text-muted)]">
            Vue d&apos;ensemble — ⌘K pour aller plus vite.
          </p>
        </header>

        <Suspense fallback={null}>
          <UnattributedBanner />
        </Suspense>

        <Suspense fallback={<KpiSkeletonGrid />}>
          <KpiBlock />
        </Suspense>

        <QuickActionsBlock />

        <Suspense fallback={<PipelineFallback />}>
          <PipelineBlock />
        </Suspense>

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
