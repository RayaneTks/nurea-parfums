import Image from "next/image";
import { Card } from "@/ui/primitives/Card";
import { Money } from "@/ui/patterns/Money";
import type { OrderDetailRow } from "@/server/orders/queries";

type OrderItemsListProps = {
  items: OrderDetailRow["items"];
};

function lineMargin(
  unitPrice: string,
  unitCostDzd: string | null,
  exchangeRate: string | null,
  quantity: number,
): number {
  const price = Number(unitPrice);
  const dzd = unitCostDzd !== null ? Number(unitCostDzd) : 0;
  const rate = exchangeRate !== null ? Number(exchangeRate) : 0;
  if (!Number.isFinite(price) || !Number.isFinite(dzd) || !Number.isFinite(rate) || rate <= 0) {
    return 0;
  }
  const unitCost = dzd / rate;
  return (price - unitCost) * quantity;
}

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
          const margin = lineMargin(it.unitPrice, it.unitCostDzd, it.exchangeRate, it.quantity);
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
                {margin > 0 ? (
                  <div className="mt-0.5 text-[11px]">
                    <Money value={margin} compact tone="auto" />
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
