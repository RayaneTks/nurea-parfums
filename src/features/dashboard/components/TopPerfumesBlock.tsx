import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { Card } from "@/ui/primitives/Card";
import { Money } from "@/ui/patterns/Money";
import { topPerfumes } from "@/server/kpi/queries";

export async function TopPerfumesBlock() {
  const rows = await topPerfumes(null, 5);

  if (rows.length === 0) {
    return (
      <Card padding={3}>
        <h2 className="mb-2 text-[14px] font-semibold text-[var(--admin-text)]">
          Top parfums
        </h2>
        <p className="py-2 text-[13px] text-[var(--admin-text-muted)]">
          <Sparkles size={12} className="mr-1 inline text-[var(--admin-accent)]" />
          Pas encore de ventes enregistrées.
        </p>
      </Card>
    );
  }

  const maxRev = Math.max(...rows.map((r) => Number(r.revenue)), 1);

  return (
    <Card padding={3}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[var(--admin-text)]">
          Top parfums
        </h2>
        <Link
          href="/admin/stats/top-parfums"
          prefetch
          className="inline-flex h-9 items-center gap-0.5 rounded-full px-2 text-[12px] font-medium text-[var(--admin-accent)] tap-scale focus-visible:outline-none focus-visible:bg-[var(--admin-accent-bg)]"
        >
          Voir tout
          <ChevronRight size={14} aria-hidden />
        </Link>
      </div>
      <ul className="space-y-2">
        {rows.map((r, i) => {
          const pct = (Number(r.revenue) / maxRev) * 100;
          return (
            <li key={`${r.source}-${r.perfumeId ?? r.name}-${i}`} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[14px] font-medium leading-tight text-[var(--admin-text)]">
                      {r.name}
                    </p>
                    {r.source === "manual" ? (
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.01em]"
                        style={{
                          background: "var(--admin-warning-bg)",
                          color: "var(--admin-warning)",
                        }}
                      >
                        Saisie libre
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
                    {r.brand ?? "—"} · {r.quantity} unité{r.quantity > 1 ? "s" : ""}
                  </p>
                </div>
                <Money value={r.revenue} compact bold />
              </div>
              <div
                className="h-[4px] overflow-hidden rounded-full"
                style={{ background: "var(--admin-surface-muted)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: "var(--admin-accent)" }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
