import { Sparkles } from "lucide-react";
import { Card } from "@/ui/primitives/Card";
import { Money } from "@/ui/patterns/Money";
import { startOfMonth, topPerfumes } from "@/server/kpi/queries";

export async function TopPerfumesBlock() {
  const now = new Date();
  const range = { start: startOfMonth(now), end: new Date(now.getTime() + 1000) };
  const rows = await topPerfumes(range, 5);

  if (rows.length === 0) {
    return (
      <Card padding={3}>
        <h2 className="mb-2 text-[14px] font-semibold text-[var(--admin-text)]">
          Top parfums du mois
        </h2>
        <p className="py-2 text-[13px] text-[var(--admin-text-muted)]">
          <Sparkles size={12} className="mr-1 inline text-[var(--admin-accent)]" />
          Pas encore de ventes ce mois.
        </p>
      </Card>
    );
  }

  const maxRev = Math.max(...rows.map((r) => Number(r.revenue)), 1);

  return (
    <Card padding={3}>
      <h2 className="mb-3 text-[14px] font-semibold text-[var(--admin-text)]">
        Top parfums du mois
      </h2>
      <ul className="space-y-2">
        {rows.map((r, i) => {
          const pct = (Number(r.revenue) / maxRev) * 100;
          return (
            <li key={`${r.perfumeId ?? "null"}-${i}`} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium leading-tight text-[var(--admin-text)]">
                    {r.name}
                  </p>
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
