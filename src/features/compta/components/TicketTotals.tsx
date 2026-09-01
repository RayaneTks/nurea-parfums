import { Card } from "@/ui/primitives/Card";
import { Money } from "@/ui/patterns/Money";
import type { SaleDetailRow } from "@/server/sales/queries";
import { formatePourcent } from "@/ui/patterns/format";

type TicketTotalsProps = {
  sale: SaleDetailRow;
};

export function TicketTotals({ sale }: TicketTotalsProps) {
  const rev = Number(sale.totalRevenue);
  const margin = Number(sale.totalMargin);
  const remaining = Number(sale.remainingDue ?? "0");
  const hasDebt = Number.isFinite(remaining) && remaining > 0;
  const marginPct = rev > 0 ? (margin / rev) * 100 : 0;

  return (
    <div className="grid grid-cols-3 gap-2">
      <Card padding={3} tone="surface">
        {/* « Vendu » et non « CA » : le vocabulaire du produit interdit ce
            dernier, qui se confond avec l'encaissé. Ici il s'agit du prix de
            la vente, que le client l'ait payé ou non — l'encaissé est dit
            juste à côté, dans le bloc de paiement. */}
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
          Vendu
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
          {/* Le signe reste celui de la marge réelle : voir SaleListRow. Le
              titre « Marge à risque » dit déjà qu'elle n'est pas encaissée. */}
          <Money value={sale.totalMargin} bold tone={hasDebt ? "warning" : "auto"} />
        </p>
        <p
          className="mt-0.5 text-[11px] tabular-nums"
          style={{
            color: hasDebt
              ? "var(--admin-warning)"
              : "var(--admin-text-subtle)",
          }}
        >
          {hasDebt ? "pas encore encaissée" : formatePourcent(marginPct, 1)}
        </p>
      </Card>
    </div>
  );
}
