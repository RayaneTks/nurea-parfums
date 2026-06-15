"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { Card } from "@/ui/primitives/Card";
import { EmptyState } from "@/ui/primitives/EmptyState";
import type { SaleRowLite } from "@/server/sales/queries";

type WeekPoint = {
  key: string;
  label: string;
  revenue: number;
  margin: number;
};

type ComptaTrendChartProps = {
  sales: SaleRowLite[];
};

function weekStartKey(iso: string): string {
  const d = new Date(iso);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function buildWeeklyTrend(sales: SaleRowLite[]): WeekPoint[] {
  const map = new Map<string, WeekPoint>();

  for (const s of sales) {
    const key = weekStartKey(s.soldAt);
    const rev = Number(s.totalRevenue);
    const margin = Number(s.totalMargin);
    const existing = map.get(key);
    if (existing) {
      existing.revenue += Number.isFinite(rev) ? rev : 0;
      existing.margin += Number.isFinite(margin) ? margin : 0;
    } else {
      const monday = new Date(`${key}T00:00:00`);
      map.set(key, {
        key,
        label: monday.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
        revenue: Number.isFinite(rev) ? rev : 0,
        margin: Number.isFinite(margin) ? margin : 0,
      });
    }
  }

  return [...map.values()]
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .slice(-8);
}

type TooltipPayload = {
  payload?: Array<{ payload?: WeekPoint }>;
};

function ChartTooltip({ active, payload }: TooltipPayload & { active?: boolean }) {
  if (!active || !payload?.[0]?.payload) return null;
  const row = payload[0].payload;
  return (
    <div
      className="rounded-[10px] px-2.5 py-1.5 text-[11px] shadow-md"
      style={{
        background: "var(--admin-surface)",
        border: "1px solid var(--admin-border)",
        color: "var(--admin-text)",
      }}
    >
      <p className="font-semibold">{row.label}</p>
      <p className="mt-0.5 tabular-nums text-[var(--admin-text-muted)]">
        CA {row.revenue.toFixed(0)} € · Marge {row.margin.toFixed(0)} €
      </p>
    </div>
  );
}

export function ComptaTrendChart({ sales }: ComptaTrendChartProps) {
  const data = useMemo(() => buildWeeklyTrend(sales), [sales]);

  if (data.length === 0) {
    return (
      <Card padding={3} tone="surface">
        <EmptyState
          icon={TrendingUp}
          title="Pas assez de données"
          description="Le graphique s'affiche dès qu'une vente est enregistrée."
          className="py-6"
        />
      </Card>
    );
  }

  return (
    <Card padding={3} tone="surface" className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-semibold text-[var(--admin-text)]">
          CA par semaine
        </h2>
        <span className="shrink-0 text-[11px] text-[var(--admin-text-subtle)]">
          8 dernières sem.
        </span>
      </div>
      <div className="mt-2 min-w-0 w-full" style={{ height: 148 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={data} margin={{ top: 4, right: 2, left: -18, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--admin-text-subtle)" }}
              interval="preserveStartEnd"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--admin-text-subtle)" }}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
              width={32}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--admin-accent-bg)" }}
              content={<ChartTooltip />}
            />
            <Bar
              dataKey="revenue"
              fill="var(--admin-accent)"
              radius={[3, 3, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
