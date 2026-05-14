"use client";

import { Card } from "@/ui/primitives/Card";
import { OrderListItem } from "./OrderListItem";
import type { OrderListRow, OrderGroupLabel } from "@/server/orders/queries";

const labelTone: Record<OrderGroupLabel, string> = {
  "En retard": "text-[var(--admin-danger)]",
  "Aujourd'hui": "text-[var(--admin-accent)]",
  "À traiter": "text-[var(--admin-success)]",
  "À venir": "text-[var(--admin-text-muted)]",
  "Livrées": "text-[var(--admin-text-subtle)]",
  "Annulées": "text-[var(--admin-text-subtle)]",
};

type OrdersGroupProps = {
  label: OrderGroupLabel;
  rows: OrderListRow[];
};

export function OrdersGroup({ label, rows }: OrdersGroupProps) {
  return (
    <section>
      <h3
        className={`mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.06em] ${labelTone[label]}`}
      >
        {label}
        <span className="ml-1.5 text-[var(--admin-text-subtle)] font-medium tabular-nums">
          ({rows.length})
        </span>
      </h3>
      <Card padding={0} elevated>
        <ul className="divide-y px-2 py-1" style={{ borderColor: "var(--admin-border)" }}>
          {rows.map((order) => (
            <li key={order.id}>
              <OrderListItem order={order} />
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
