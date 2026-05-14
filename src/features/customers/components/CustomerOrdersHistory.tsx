import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/ui/primitives/Card";
import { Money } from "@/ui/patterns/Money";
import { RelativeTime } from "@/ui/patterns/RelativeTime";
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import type { OrderStatus } from "@prisma/client";

type CustomerOrdersHistoryProps = {
  orders: Array<{
    id: string;
    orderedAt: string;
    total: string;
    status: OrderStatus;
  }>;
};

export function CustomerOrdersHistory({ orders }: CustomerOrdersHistoryProps) {
  if (orders.length === 0) {
    return (
      <Card padding={4}>
        <p className="text-center text-[14px] text-[var(--admin-text-muted)]">
          Aucune commande pour ce client.
        </p>
      </Card>
    );
  }
  return (
    <Card padding={0}>
      <ul className="divide-y px-2 py-1" style={{ borderColor: "var(--admin-border)" }}>
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              href={`/admin/ordres/${o.id}`}
              prefetch
              className="flex items-center gap-3 px-2 py-3 tap-scale active:bg-[var(--admin-surface-muted)] rounded-[10px]"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-[var(--admin-text)]">
                  <RelativeTime date={o.orderedAt} />
                </p>
                <Money value={o.total} compact />
              </div>
              <OrderStatusBadge status={o.status} />
              <ChevronRight size={14} className="text-[var(--admin-text-subtle)]" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
