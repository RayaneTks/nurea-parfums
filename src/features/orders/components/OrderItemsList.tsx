import Image from "next/image";
import { Card } from "@/ui/primitives/Card";
import { Money } from "@/ui/patterns/Money";
import type { OrderDetailRow } from "@/server/orders/queries";

type OrderItemsListProps = {
  items: OrderDetailRow["items"];
};

export function OrderItemsList({ items }: OrderItemsListProps) {
  if (items.length === 0) return null;
  return (
    <Card padding={0}>
      <ul
        className="divide-y px-3"
        style={{ borderColor: "var(--admin-border)" }}
      >
        {items.map((it) => {
          const lineRev = Number(it.unitPrice) * it.quantity;
          return (
            <li key={it.id} className="flex items-center gap-3 py-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px] bg-[var(--admin-surface-muted)]">
                {it.snapshot.image ? (
                  <Image
                    src={it.snapshot.image}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold leading-tight text-[var(--admin-text)]">
                  {it.snapshot.name}
                </p>
                <p className="truncate text-[12px] text-[var(--admin-text-subtle)] mt-0.5 tabular-nums">
                  {it.snapshot.brandName ?? "—"} · ×{it.quantity} · {it.volumeMl}&nbsp;ml
                </p>
              </div>
              <div className="text-right">
                <Money value={lineRev} bold />
                <div className="text-[11px] text-[var(--admin-text-subtle)] mt-0.5">
                  <Money value={it.unitPrice} compact /> / unité
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
