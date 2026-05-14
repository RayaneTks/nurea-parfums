"use client";

import { Avatar } from "@/ui/primitives/Avatar";
import { ListRow } from "@/ui/primitives/ListRow";
import { Money } from "@/ui/patterns/Money";
import { RelativeTime } from "@/ui/patterns/RelativeTime";
import { OrderStatusBadge } from "./OrderStatusBadge";
import type { OrderListRow } from "@/server/orders/queries";

type OrderListItemProps = {
  order: OrderListRow;
};

export function OrderListItem({ order }: OrderListItemProps) {
  const dueNum = Number(order.due);
  const showDueBadge = dueNum > 0.01 && order.status !== "CANCELLED";

  return (
    <ListRow
      href={`/admin/ordres/${order.id}`}
      leading={<Avatar name={order.customerName} size="md" />}
      primary={
        <span className="block truncate text-[15px] font-semibold leading-tight text-[var(--admin-text)]">
          {order.customerName}
        </span>
      }
      secondary={
        <span className="flex items-center gap-1.5 text-[12px] text-[var(--admin-text-subtle)]">
          {order.deliveryAt ? (
            <span className="tnum">
              Livraison <RelativeTime date={order.deliveryAt} />
            </span>
          ) : (
            <span>Pas de date</span>
          )}
          {showDueBadge ? (
            <>
              <span aria-hidden>·</span>
              <span className="text-[var(--admin-warning)] font-medium">
                <Money value={order.due} compact /> dû
              </span>
            </>
          ) : null}
        </span>
      }
      trailing={
        <div className="flex flex-col items-end gap-1">
          <Money value={order.total} bold />
          <OrderStatusBadge status={order.status} />
        </div>
      }
      chevron
      ariaLabel={`Commande de ${order.customerName}`}
    />
  );
}
