import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { Stack } from "@/ui/primitives/Stack";
import { Card } from "@/ui/primitives/Card";
import { Heading } from "@/ui/primitives/Heading";
import { Money } from "@/ui/patterns/Money";
import { topPerfumes } from "@/server/kpi/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Top parfums — Admin",
  robots: { index: false, follow: false },
};

export default async function TopPerfumesPage() {
  const rows = await topPerfumes(null, 500);
  const maxRev = Math.max(...rows.map((r) => Number(r.revenue)), 1);
  const totalQty = rows.reduce((s, r) => s + r.quantity, 0);
  const totalRev = rows.reduce((s, r) => s + Number(r.revenue), 0);

  return (
    <PageScaffold padding={4} ariaLabel="Top parfums">
      <Stack gap={4}>
        <header>
          <Link
            href="/admin"
            prefetch
            className="mb-2 inline-flex h-9 items-center gap-1 rounded-full pr-3 text-[13px] font-medium text-[var(--admin-text-muted)] tap-scale hover:text-[var(--admin-text)]"
          >
            <ChevronLeft size={16} aria-hidden />
            Tableau
          </Link>
          <Heading level={1}>Top parfums</Heading>
          <p className="mt-0.5 text-[13px] text-[var(--admin-text-muted)]">
            Classement complet depuis le début · {totalQty} unité{totalQty > 1 ? "s" : ""} ·{" "}
            <Money value={totalRev.toFixed(2)} compact />
          </p>
        </header>

        {rows.length === 0 ? (
          <Card padding={3}>
            <p className="py-2 text-[13px] text-[var(--admin-text-muted)]">
              Pas encore de ventes enregistrées.
            </p>
          </Card>
        ) : (
          <Card padding={3}>
            <ol className="space-y-3">
              {rows.map((r, i) => {
                const pct = (Number(r.revenue) / maxRev) * 100;
                return (
                  <li
                    key={`${r.source}-${r.perfumeId ?? r.name}-${i}`}
                    className="space-y-1.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 shrink-0 text-center text-[12px] font-bold tabular-nums text-[var(--admin-text-muted)]">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[14px] font-medium leading-tight text-[var(--admin-text)]">
                            {r.name}
                          </p>
                          {r.source === "manual" ? (
                            <span
                              className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide"
                              style={{
                                background: "var(--admin-warning-bg)",
                                color: "var(--admin-warning)",
                              }}
                            >
                              Hors catalogue
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
                      className="ml-9 h-[4px] overflow-hidden rounded-full"
                      style={{ background: "var(--admin-surface-muted)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: "var(--admin-accent)",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        )}
      </Stack>
    </PageScaffold>
  );
}
