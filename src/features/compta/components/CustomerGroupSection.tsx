"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Avatar } from "@/ui/primitives/Avatar";
import { Card } from "@/ui/primitives/Card";
import { Money } from "@/ui/patterns/Money";
import { SaleListRow } from "./SaleListRow";
import type { CustomerGroup } from "@/server/sales/queries";
import { cn } from "@/lib/utils";

type CustomerGroupSectionProps = {
  group: CustomerGroup;
  defaultOpen?: boolean;
  onOpenSale: (saleId: string) => void;
};

export function CustomerGroupSection({
  group,
  defaultOpen = true,
  onOpenSale,
}: CustomerGroupSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card padding={0} elevated borderless={false}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-3 tap-scale active:bg-[var(--admin-surface-muted)] rounded-t-[18px]"
      >
        <Avatar name={group.customerName} size="md" />
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-[16px] font-semibold leading-tight text-[var(--admin-text)]">
            {group.customerName}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--admin-text-subtle)] tabular-nums">
            {group.salesCount} vente{group.salesCount > 1 ? "s" : ""} ·{" "}
            <Money value={group.totalRevenue} compact />
          </p>
        </div>
        <ChevronDown
          size={18}
          className={cn(
            "shrink-0 text-[var(--admin-text-subtle)] transition-transform duration-200 ease-out-expo",
            open ? "rotate-180" : "rotate-0",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          className="divide-y px-2 pb-1"
          style={{ borderTop: "1px solid var(--admin-border)" }}
        >
          {group.sales.map((s) => (
            <li key={s.id}>
              <SaleListRow sale={s} onOpen={onOpenSale} />
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
