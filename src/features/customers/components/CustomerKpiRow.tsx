import { Card } from "@/ui/primitives/Card";
import { Money } from "@/ui/patterns/Money";
import { RelativeTime } from "@/ui/patterns/RelativeTime";
import type { CustomerDetail } from "@/server/customers/queries";

type CustomerKpiRowProps = {
  customer: CustomerDetail;
};

export function CustomerKpiRow({ customer }: CustomerKpiRowProps) {
  const due = Number(customer.outstandingBalance);
  return (
    <div className="grid grid-cols-3 gap-2">
      <Card padding={3} tone="surface">
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
          Commandes
        </p>
        <p className="mt-1 text-[18px] font-bold leading-none tabular-nums">
          {customer.ordersCount}
        </p>
      </Card>
      <Card padding={3} tone={due > 0.01 ? "accent" : "surface"}>
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
          Ardoise
        </p>
        <p className="mt-1 text-[18px] font-bold leading-none">
          {due > 0.01 ? (
            <Money value={customer.outstandingBalance} bold tone="danger" />
          ) : (
            <Money value={0} compact tone="muted" />
          )}
        </p>
      </Card>
      <Card padding={3} tone="surface">
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
          Dernière
        </p>
        <p className="mt-1 text-[14px] font-semibold leading-tight tabular-nums">
          {customer.lastOrderAt ? <RelativeTime date={customer.lastOrderAt} /> : "—"}
        </p>
      </Card>
    </div>
  );
}
