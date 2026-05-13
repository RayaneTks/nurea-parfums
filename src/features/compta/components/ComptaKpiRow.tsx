import { Card } from "@/ui/primitives/Card";
import { Money } from "@/ui/patterns/Money";
import type { ComptaListResult } from "@/server/sales/queries";

type ComptaKpiRowProps = {
  summary: ComptaListResult["summary"];
};

export function ComptaKpiRow({ summary }: ComptaKpiRowProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Card padding={3} tone="surface">
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
          CA
        </p>
        <p className="mt-1 text-[18px] font-bold leading-none">
          <Money value={summary.totalRevenue} compact />
        </p>
      </Card>
      <Card padding={3} tone="surface">
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
          Marge
        </p>
        <p className="mt-1 text-[18px] font-bold leading-none">
          <Money value={summary.totalMargin} compact tone="success" />
        </p>
        <p className="mt-0.5 text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
          {summary.marginPct}%
        </p>
      </Card>
      <Card padding={3} tone="surface">
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
          Panier
        </p>
        <p className="mt-1 text-[18px] font-bold leading-none">
          <Money value={summary.avgValue} compact />
        </p>
        <p className="mt-0.5 text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
          {summary.salesCount} ventes
        </p>
      </Card>
    </div>
  );
}
