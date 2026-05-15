import { Card } from "@/ui/primitives/Card";
import { Money } from "@/ui/patterns/Money";
import type { SaleDetailRow } from "@/server/sales/queries";

type TicketTotalsProps = {
  sale: SaleDetailRow;
};

export function TicketTotals({ sale }: TicketTotalsProps) {
  const rev = Number(sale.totalRevenue);
  const margin = Number(sale.totalMargin);
  const remaining = Number(sale.remainingDue ?? "0");
  const hasDebt = Number.isFinite(remaining) && remaining > 0;
  const marginPct = rev > 0 ? ((margin / rev) * 100).toFixed(1) : "0.0";

  return (
    <div className="grid grid-cols-3 gap-2">
      <Card padding={3} tone="surface">
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
          CA
        </p>
        <p className="mt-1 text-[18px] font-bold leading-none">
          <Money value={sale.totalRevenue} bold />
        </p>
      </Card>
      <Card padding={3} tone="surface">
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
          Coût
        </p>
        <p className="mt-1 text-[18px] font-bold leading-none">
          <Money value={sale.totalCost} bold tone="muted" />
        </p>
      </Card>
      <Card padding={3} tone="surface">
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
          {hasDebt ? "Marge à risque" : "Marge"}
        </p>
        <p className="mt-1 text-[18px] font-bold leading-none">
          {hasDebt ? (
            <Money value={-Math.abs(margin)} bold tone="danger" />
          ) : (
            <Money value={sale.totalMargin} bold tone="success" />
          )}
        </p>
        <p
          className="mt-0.5 text-[11px] tabular-nums"
          style={{
            color: hasDebt
              ? "var(--admin-danger)"
              : "var(--admin-text-subtle)",
          }}
        >
          {hasDebt ? "non encaissée" : `${marginPct}%`}
        </p>
      </Card>
    </div>
  );
}
