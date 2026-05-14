import { Card } from "@/ui/primitives/Card";
import { Money } from "@/ui/patterns/Money";
import type { OrderDetailRow } from "@/server/orders/queries";

type OrderSummaryCardProps = {
  order: OrderDetailRow;
};

export function OrderSummaryCard({ order }: OrderSummaryCardProps) {
  const dueNum = Number(order.due);
  return (
    <div className="grid grid-cols-3 gap-2">
      <Card padding={3} tone="surface">
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
          Total
        </p>
        <p className="mt-1 text-[18px] font-bold leading-none">
          <Money value={order.total} bold />
        </p>
      </Card>
      <Card padding={3} tone="surface">
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
          Payé
        </p>
        <p className="mt-1 text-[18px] font-bold leading-none">
          <Money value={order.depositPaid} bold tone="success" />
        </p>
      </Card>
      <Card
        padding={3}
        tone={dueNum > 0.01 ? "accent" : "surface"}
      >
        <p
          className={
            dueNum > 0.01
              ? "text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-warning)]"
              : "text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]"
          }
        >
          Dû
        </p>
        <p className="mt-1 text-[18px] font-bold leading-none">
          <Money value={order.due} bold tone={dueNum > 0.01 ? "danger" : "muted"} />
        </p>
      </Card>
    </div>
  );
}
