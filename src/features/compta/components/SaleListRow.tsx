"use client";

import { RelativeTime } from "@/ui/patterns/RelativeTime";
import { Money } from "@/ui/patterns/Money";
import { ListRow } from "@/ui/primitives/ListRow";
import type { SaleRowLite } from "@/server/sales/queries";

type SaleListRowProps = {
  sale: SaleRowLite;
  onOpen: (saleId: string) => void;
};

export function SaleListRow({ sale, onOpen }: SaleListRowProps) {
  return (
    <ListRow
      onClick={() => onOpen(sale.id)}
      primary={
        <span className="block text-[14px] font-medium text-[var(--admin-text)]">
          <RelativeTime date={sale.soldAt} />
        </span>
      }
      secondary={
        <span className="text-[12px] text-[var(--admin-text-subtle)]">
          {sale.itemCount} article{sale.itemCount > 1 ? "s" : ""}
          {sale.orderId ? " · commande" : ""}
        </span>
      }
      trailing={
        <div className="text-right">
          <Money value={sale.totalRevenue} bold />
          <div className="text-[11px] mt-0.5">
            <Money value={sale.totalMargin} compact signed tone="success" />
          </div>
        </div>
      }
      chevron
      ariaLabel={`Vente du ${sale.soldAt}`}
    />
  );
}
