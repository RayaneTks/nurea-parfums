"use client";

import { Avatar } from "@/ui/primitives/Avatar";
import { Badge } from "@/ui/primitives/Badge";
import { ListRow } from "@/ui/primitives/ListRow";
import { Money } from "@/ui/patterns/Money";
import type { CustomerListRow as Row } from "@/server/customers/queries";

type CustomerListRowProps = {
  customer: Row;
};

export function CustomerListRow({ customer }: CustomerListRowProps) {
  const due = Number(customer.outstandingBalance);
  return (
    <ListRow
      href={`/admin/clients/${customer.id}`}
      leading={<Avatar name={customer.fullName} size="md" />}
      primary={
        <span className="block truncate text-[15px] font-semibold leading-tight text-[var(--admin-text)]">
          {customer.fullName}
        </span>
      }
      secondary={
        <span className="text-[12px] text-[var(--admin-text-subtle)]">
          {customer.phoneE164 ?? customer.snapchat ?? "—"}
          {customer.ordersCount > 0 ? ` · ${customer.ordersCount} cmd.` : ""}
        </span>
      }
      trailing={
        due > 0.01 ? (
          <Badge tone="warning" size="sm">
            <Money value={customer.outstandingBalance} compact /> dû
          </Badge>
        ) : undefined
      }
      chevron
      ariaLabel={`Fiche de ${customer.fullName}`}
    />
  );
}
