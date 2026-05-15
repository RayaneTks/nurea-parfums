import Link from "next/link";
import { Boxes, ChevronRight } from "lucide-react";
import { Card } from "@/ui/primitives/Card";
import { Money } from "@/ui/patterns/Money";
import { listBatches } from "@/server/batches/queries";

export async function ActiveBatchesBlock() {
  const batches = await listBatches();
  const open = batches.filter((b) => b.status === "OPEN").slice(0, 3);
  if (open.length === 0) return null;

  return (
    <Card padding={0}>
      <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Boxes size={15} className="text-[var(--admin-accent)]" aria-hidden />
          <h2 className="text-[14px] font-semibold text-[var(--admin-text)]">
            Lots ouverts
          </h2>
        </div>
        <Link
          href="/admin/lots"
          prefetch
          className="text-[12px] font-medium text-[var(--admin-accent)] tap-scale"
        >
          Voir tout
        </Link>
      </div>
      <ul className="divide-y divide-[var(--admin-border)]">
        {open.map((b) => {
          const outstanding = Number(b.outstandingRevenue);
          const hasOutstanding = Number.isFinite(outstanding) && outstanding > 0;
          return (
            <li key={b.id}>
              <Link
                href={`/admin/lots/${b.id}`}
                prefetch
                className="flex items-center gap-3 px-3 py-3 tap-scale hover:bg-[var(--admin-surface-muted)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-[var(--admin-text)]">
                    {b.name}
                  </p>
                  <p className="text-[11px] text-[var(--admin-text-subtle)]">
                    {b.salesCount} vente{b.salesCount > 1 ? "s" : ""} ·{" "}
                    <Money value={b.cashedRevenue} compact /> encaissé
                    {hasOutstanding ? (
                      <span
                        className="ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          background: "var(--admin-warning-bg)",
                          color: "var(--admin-warning)",
                        }}
                      >
                        Reste {outstanding.toFixed(0)} €
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-bold leading-none">
                    <Money value={b.netMargin} compact tone="success" />
                  </p>
                  <p className="mt-0.5 text-[10px] tabular-nums text-[var(--admin-text-subtle)]">
                    {b.marginPct}% net
                  </p>
                </div>
                <ChevronRight
                  size={14}
                  className="shrink-0 text-[var(--admin-text-subtle)]"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
