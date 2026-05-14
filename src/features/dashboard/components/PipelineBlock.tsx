import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/ui/primitives/Card";
import { Badge } from "@/ui/primitives/Badge";
import { Money } from "@/ui/patterns/Money";
import { pipelineCounts } from "@/server/kpi/queries";

export async function PipelineBlock() {
  const p = await pipelineCounts();
  if (p.pendingCount === 0 && p.readyCount === 0 && p.overdueCount === 0) return null;

  const dueNum = Number(p.dueAmount);
  return (
    <Card padding={3}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[var(--admin-text)]">Pipeline</h2>
        {p.overdueCount > 0 ? (
          <Badge tone="danger" size="sm" dot>
            <span className="inline-flex items-center gap-1">
              <AlertTriangle size={10} aria-hidden /> {p.overdueCount} en retard
            </span>
          </Badge>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Link
          href="/admin/ordres?filter=pending"
          className="rounded-[12px] p-3 tap-scale active:scale-[0.98]"
          style={{ background: "var(--admin-warning-bg)" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--admin-warning)]">
            En attente
          </p>
          <p className="mt-1 text-[18px] font-bold tabular-nums text-[var(--admin-warning)]">
            {p.pendingCount}
          </p>
        </Link>
        <Link
          href="/admin/ordres?filter=ready"
          className="rounded-[12px] p-3 tap-scale active:scale-[0.98]"
          style={{ background: "var(--admin-success-bg)" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--admin-success)]">
            À traiter
          </p>
          <p className="mt-1 text-[18px] font-bold tabular-nums text-[var(--admin-success)]">
            {p.readyCount}
          </p>
        </Link>
        <div className="rounded-[12px] p-3" style={{ background: "var(--admin-surface-muted)" }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
            Encaissable
          </p>
          <p className="mt-1 text-[18px] font-bold tabular-nums text-[var(--admin-text)]">
            <Money value={dueNum} compact />
          </p>
        </div>
      </div>
    </Card>
  );
}
