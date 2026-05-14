"use client";

import { Avatar } from "@/ui/primitives/Avatar";
import { Card } from "@/ui/primitives/Card";
import { Stack } from "@/ui/primitives/Stack";
import { DateLabel } from "@/ui/patterns/DateLabel";
import { InlineNameEditor } from "@/ui/patterns/InlineNameEditor";
import { OrderStatusBadge } from "./OrderStatusBadge";
import type { OrderDetailRow } from "@/server/orders/queries";

type OrderDetailHeaderProps = {
  order: OrderDetailRow;
  onCustomerNameSave: (next: string) => Promise<void>;
};

export function OrderDetailHeader({ order, onCustomerNameSave }: OrderDetailHeaderProps) {
  return (
    <Card padding={3} tone="surface">
      <div className="flex items-start gap-3">
        <Avatar name={order.customerName} size="lg" />
        <Stack gap={1} flex>
          <InlineNameEditor
            value={order.customerName}
            onSave={onCustomerNameSave}
            variant="h2"
            ariaLabel="Modifier le nom du client"
          />
          <span className="text-[12px] text-[var(--admin-text-muted)] tabular-nums">
            Commande créée le <DateLabel date={order.orderedAt} format="datetime" />
          </span>
          {order.deliveryAt ? (
            <span className="text-[12px] text-[var(--admin-text-muted)] tabular-nums">
              Livraison <DateLabel date={order.deliveryAt} format="datetime" />
            </span>
          ) : null}
        </Stack>
        <OrderStatusBadge status={order.status} />
      </div>
    </Card>
  );
}
