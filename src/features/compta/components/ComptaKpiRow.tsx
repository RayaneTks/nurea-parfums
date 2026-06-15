import { Card } from "@/ui/primitives/Card";
import { Money } from "@/ui/patterns/Money";
import type { ComptaListResult } from "@/server/sales/queries";

type ComptaKpiRowProps = {
  summary: ComptaListResult["summary"];
};

export function ComptaKpiRow({ summary }: ComptaKpiRowProps) {
  const debt = Number(summary.totalDebt ?? "0");
  const hasDebt = Number.isFinite(debt) && debt > 0;

  return (
    <div className="space-y-2 min-w-0">
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <Card padding={3} tone="surface">
          <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
            CA
          </p>
          <p className="mt-1 text-[16px] sm:text-[18px] font-bold leading-none">
            <Money value={summary.totalRevenue} compact />
          </p>
        </Card>
        <Card padding={3} tone="surface">
          <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
            Marge
          </p>
          <p className="mt-1 text-[16px] sm:text-[18px] font-bold leading-none">
            <Money value={summary.totalMargin} compact tone="success" />
          </p>
          <p className="mt-0.5 text-[10px] sm:text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
            {summary.marginPct}%
          </p>
        </Card>
        <Card padding={3} tone="surface">
          <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
            Panier
          </p>
          <p className="mt-1 text-[16px] sm:text-[18px] font-bold leading-none">
            <Money value={summary.avgValue} compact />
          </p>
          <p className="mt-0.5 text-[10px] sm:text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
            {summary.salesCount} ventes
          </p>
        </Card>
      </div>
      {hasDebt ? (
        <Card padding={3} tone="alt">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-medium text-[var(--admin-text)]">
              Reste à encaisser
            </p>
            <span
              className="tnum whitespace-nowrap text-[16px] font-bold"
              style={{ color: "var(--admin-warning)" }}
            >
              {debt.toFixed(0)} €
            </span>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
