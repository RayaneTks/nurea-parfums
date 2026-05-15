"use client";

import { useState } from "react";
import Link from "next/link";
import { Boxes, ChevronDown, ExternalLink, PackageCheck } from "lucide-react";
import { Card } from "@/ui/primitives/Card";
import { Money } from "@/ui/patterns/Money";
import { SaleListRow } from "./SaleListRow";
import type { BatchGroup } from "@/server/sales/queries";
import { cn } from "@/lib/utils";

type BatchGroupSectionProps = {
  group: BatchGroup;
  defaultOpen?: boolean;
  onOpenSale: (saleId: string) => void;
};

export function BatchGroupSection({
  group,
  defaultOpen = true,
  onOpenSale,
}: BatchGroupSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const closed = group.batchStatus === "CLOSED";

  return (
    <Card padding={0} elevated borderless={false} tone={closed ? "alt" : "surface"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-3 tap-scale active:bg-[var(--admin-surface-muted)] rounded-t-[18px]"
      >
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{
            background: closed ? "var(--admin-surface-muted)" : "var(--admin-accent-bg)",
            color: closed ? "var(--admin-text-muted)" : "var(--admin-accent)",
          }}
          aria-hidden
        >
          {closed ? <PackageCheck size={18} /> : <Boxes size={18} />}
        </span>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[15px] font-semibold leading-tight text-[var(--admin-text)]">
              {group.batchName}
            </p>
            {closed ? (
              <span
                className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  background: "var(--admin-surface-muted)",
                  color: "var(--admin-text-muted)",
                }}
              >
                Clos
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[12px] text-[var(--admin-text-subtle)] tabular-nums">
            {group.salesCount} vente{group.salesCount > 1 ? "s" : ""} ·{" "}
            <Money value={group.totalRevenue} compact />
          </p>
        </div>
        <Link
          href={`/admin/lots/${group.batchId}`}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Ouvrir le lot ${group.batchName}`}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--admin-accent)] tap-scale hover:bg-[var(--admin-accent-bg)]"
        >
          <ExternalLink size={15} aria-hidden />
        </Link>
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
