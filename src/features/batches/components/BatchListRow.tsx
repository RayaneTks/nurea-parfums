"use client";

import Link from "next/link";
import { ChevronRight, PackageCheck, PackageOpen } from "lucide-react";
import { Card } from "@/ui/primitives/Card";
import { Money } from "@/ui/patterns/Money";
import type { BatchRowLite } from "@/server/batches/queries";

type BatchListRowProps = {
  batch: BatchRowLite;
};

export function BatchListRow({ batch }: BatchListRowProps) {
  const isOpen = batch.status === "OPEN";
  const outstanding = Number(batch.outstandingRevenue);
  const hasOutstanding = Number.isFinite(outstanding) && outstanding > 0;
  return (
    <Link
      href={`/admin/lots/${batch.id}`}
      prefetch
      className="block focus-visible:outline-none"
    >
      <Card padding={3} interactive>
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              background: isOpen ? "var(--admin-accent-bg)" : "var(--admin-surface-muted)",
              color: isOpen ? "var(--admin-accent)" : "var(--admin-text-muted)",
            }}
            aria-hidden
          >
            {isOpen ? <PackageOpen size={18} /> : <PackageCheck size={18} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-[15px] font-semibold leading-tight text-[var(--admin-text)]">
                {batch.name}
              </p>
              {!isOpen ? (
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
              {hasOutstanding ? (
                <span
                  className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    background: "var(--admin-warning-bg)",
                    color: "var(--admin-warning)",
                  }}
                >
                  Reste {outstanding.toFixed(0)} €
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[12px] text-[var(--admin-text-subtle)]">
              {batch.salesCount} vente{batch.salesCount > 1 ? "s" : ""}
              {Number(batch.expenses) > 0
                ? ` · ${Number(batch.expenses).toFixed(0)} € dépenses`
                : null}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
                  Encaissé
                </p>
                <p className="mt-0.5 text-[14px] font-bold leading-none">
                  <Money value={batch.cashedRevenue} compact />
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
                  Marge nette
                </p>
                <p className="mt-0.5 text-[14px] font-bold leading-none">
                  <Money value={batch.netMargin} compact tone="success" />
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
                  Marge %
                </p>
                <p className="mt-0.5 text-[14px] font-bold leading-none tabular-nums text-[var(--admin-text)]">
                  {batch.marginPct}%
                </p>
              </div>
            </div>
          </div>
          <ChevronRight
            size={16}
            className="mt-2 shrink-0 text-[var(--admin-text-subtle)]"
            aria-hidden
          />
        </div>
      </Card>
    </Link>
  );
}
