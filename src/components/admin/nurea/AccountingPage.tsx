"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Calculator, History, PieChart, Receipt, TrendingUp } from "lucide-react";
import { SectionCard } from "../ui/SectionCard";
import { FilterPills } from "../ui/FilterPills";
import { StatCard } from "../ui/StatCard";
import { EmptyState } from "../ui/EmptyState";
import { AdminToast, type ToastType } from "../ui/AdminToast";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { AdminButton } from "../ui/AdminButton";
import { AdminInput } from "../ui/AdminInput";
import { AdminComptaListSkeleton } from "../ui/AdminLoadingPrimitives";
import {
  cn,
  formatDate,
  formatMoney,
  formatTime,
  relativeDayLabel,
} from "@/lib/utils";
import { ORDER_VOLUMES_ML } from "@/lib/gestion/orderLineValidation";
import { Modal } from "../ui/Modal";
import type { PeriodValue, SaleRow, StatsResponse } from "@/lib/gestion/types";

const periodOptions: { value: PeriodValue; label: string }[] = [
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "all", label: "Tout" },
];

type ComptaCacheEntry = {
  sales: SaleRow[];
  stats: StatsResponse | null;
};

const comptaCache = new Map<PeriodValue, ComptaCacheEntry>();

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function groupByDay(sales: SaleRow[]): { day: string; label: string; sales: SaleRow[] }[] {
  const groups = new Map<string, SaleRow[]>();
  for (const sale of sales) {
    const d = new Date(sale.soldAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const list = groups.get(key) ?? [];
    list.push(sale);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([day, s]) => {
      const first = new Date(s[0]!.soldAt);
      return {
        day,
        label: relativeDayLabel(first),
        sales: s,
      };
    });
}

export function NureaAccountingPage() {
  const [period, setPeriod] = useState<PeriodValue>("month");
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: ToastType; text: string } | null>(null);
  const [detail, setDetail] = useState<SaleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SaleRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async (background = false) => {
    if (!background) {
      setLoading(true);
    }
    setError(null);
    try {
      const [salesRes, statsRes] = await Promise.all([
        fetch(`/api/admin/sales?period=${period}`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`/api/admin/sales/stats?period=${period}`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);
      if (!salesRes.ok) throw new Error("Impossible de charger les ventes.");
      if (!statsRes.ok) throw new Error("Impossible de charger les statistiques.");

      const salesJson = await readJsonSafe<{ sales: SaleRow[] }>(salesRes);
      const statsJson = await readJsonSafe<StatsResponse>(statsRes);

      const nextSales = salesJson?.sales ?? [];
      const nextStats = statsJson ?? null;
      setSales(nextSales);
      setStats(nextStats);
      comptaCache.set(period, { sales: nextSales, stats: nextStats });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }, [period]);

  useEffect(() => {
    const cached = comptaCache.get(period);
    if (cached) {
      setSales(cached.sales);
      setStats(cached.stats);
      setLoading(false);
      void refresh(true);
      return;
    }
    void refresh();
  }, [period, refresh]);

  const groups = useMemo(() => groupByDay(sales), [sales]);

  async function handleDelete(sale: SaleRow) {
    setDeleting(true);
    try {
      const r = await fetch(`/api/admin/sales/${sale.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) {
        const j = await readJsonSafe<{ error?: string }>(r);
        throw new Error(j?.error ?? "Suppression impossible.");
      }
      setSales((prev) => prev.filter((s) => s.id !== sale.id));
      setToast({ type: "success", text: "Vente supprimée." });
      setDetail(null);
      setDeleteTarget(null);
      void refresh(true);
    } catch (err) {
      setToast({
        type: "error",
        text: err instanceof Error ? err.message : "Erreur",
      });
    } finally {
      setDeleting(false);
    }
  }

  const periodLabel =
    period === "week" ? "Cette semaine" : period === "month" ? "Ce mois" : "Historique complet";

  const chartData = useMemo(() => {
    const ascending = [...groups].reverse();
    return ascending.slice(-7).map((g) => ({
      date: new Date(g.sales[0]!.soldAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      }),
      total: g.sales.reduce((sum, s) => sum + Number(s.totalRevenue), 0),
    }));
  }, [groups]);

  const avgMarginPct = useMemo(() => {
    const tr = Number(stats?.totalRevenue ?? 0);
    const tm = Number(stats?.totalMargin ?? 0);
    if (tr <= 0) return 0;
    return (tm / tr) * 100;
  }, [stats]);

  return (
    <>
      <main id="main-content" className="flex-1 space-y-6 px-5 pt-2 pb-4" aria-busy={loading}>
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-admin-text">Compta</h1>
          <p className="mt-0.5 text-sm text-admin-muted">
            {loading
              ? "Chargement…"
              : `${periodLabel} · ${stats?.count ?? 0} vente${(stats?.count ?? 0) > 1 ? "s" : ""}`}
          </p>
        </motion.header>

        <div className="flex justify-center">
          <div className="w-full max-w-sm rounded-2xl bg-[color-mix(in_srgb,var(--admin-text)_6%,transparent)] p-1">
            <FilterPills
              options={periodOptions}
              value={period}
              onChange={setPeriod}
              ariaLabel="Filtrer la période"
              className="w-full !rounded-xl !border-0 !bg-transparent !p-0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="admin-ios-shadow rounded-[32px] bg-[var(--admin-ios-bordeaux)] p-5 text-white">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <TrendingUp className="h-4 w-4" aria-hidden />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              Chiffre d&apos;affaires
            </p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums">
              {formatMoney(stats?.totalRevenue ?? 0)}
            </p>
          </div>
          <div className="admin-ios-shadow rounded-[32px] border border-[color-mix(in_srgb,var(--admin-text)_6%,transparent)] bg-admin-surface p-5">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--admin-accent-subtle)] text-[var(--admin-ios-bordeaux)]">
              <PieChart className="h-4 w-4" aria-hidden />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-admin-subtle">Marge</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-admin-text">
              {formatMoney(stats?.totalMargin ?? 0)}
            </p>
            <p className="mt-0.5 text-xs tabular-nums text-admin-muted">{avgMarginPct.toFixed(0)}%</p>
          </div>
        </div>

        {stats?.count ? (
          <p className="text-center text-[11px] font-medium tabular-nums text-admin-subtle">
            {stats.count} · Ø {formatMoney(stats.averageSale)}
          </p>
        ) : null}

        {!loading && chartData.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="admin-ios-shadow rounded-[32px] border border-[color-mix(in_srgb,var(--admin-text)_6%,transparent)] bg-admin-surface p-6"
          >
            <h2 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-admin-subtle">
              <History className="h-3.5 w-3.5" aria-hidden />
              {Math.min(7, chartData.length)} j.
            </h2>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminComptaArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7b0b1d" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#7b0b1d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#737373" }}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 20,
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.05)",
                      backgroundColor: "#fff",
                    }}
                    itemStyle={{ fontSize: 12, fontWeight: 700, color: "#7b0b1d" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#7b0b1d"
                    fillOpacity={1}
                    fill="url(#adminComptaArea)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        ) : null}

        {error ? (
          <SectionCard className="p-4 border-[var(--admin-danger-border)] bg-[var(--admin-danger-subtle)]">
            <p className="text-[13px] text-admin-danger">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-2 text-[11px] uppercase tracking-wider text-admin-accent font-medium"
            >
              Réessayer
            </button>
          </SectionCard>
        ) : null}

        {loading ? (
          <AdminComptaListSkeleton count={4} />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Aucune vente"
            description="Passe par « Vendre » pour encaisser."
            action={
              <Link
                href="/admin/vendre"
                prefetch
                className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border border-admin-accent bg-admin-accent text-admin-bg text-[13px] uppercase tracking-[0.08em] font-medium tap-scale transition-colors [@media(hover:hover)]:hover:bg-admin-accent-hover [@media(hover:hover)]:hover:border-admin-accent-hover"
              >
                <Calculator className="h-4 w-4" aria-hidden />
                Vendre
              </Link>
            }
          />
        ) : (
          <div className="space-y-6 pb-4 animate-in fade-in duration-200 ease-out">
            {groups.map((group) => (
              <section key={group.day} className="space-y-2">
                <div className="flex items-center gap-3 px-1">
                  <h2 className="text-[10px] font-medium uppercase tracking-wider text-admin-subtle">
                    {group.label} · {formatDate(group.sales[0]!.soldAt)}
                  </h2>
                  <div className="h-px flex-1 bg-admin-border" />
                </div>

                <div className="flex flex-col gap-2">
                  {group.sales.map((sale) => (
                    <SaleRowCard key={sale.id} sale={sale} onTap={() => setDetail(sale)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <SaleDetailModal
        sale={detail}
        onClose={() => setDetail(null)}
        onDelete={(sale) => setDeleteTarget(sale)}
        onUpdated={(s) => {
          setDetail(s);
          comptaCache.delete(period);
          void refresh(true);
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer cette vente ?"
        description={
          deleteTarget
            ? `Vente du ${formatDate(deleteTarget.soldAt)} à ${formatTime(deleteTarget.soldAt)} · ${formatMoney(deleteTarget.totalRevenue)}.`
            : undefined
        }
        confirmLabel="Supprimer définitivement"
        destructive
        isLoading={deleting}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />

      {toast ? (
        <AdminToast
          type={toast.type}
          message={toast.text}
          onClose={() => setToast(null)}
        />
      ) : null}
    </>
  );
}

function SaleRowCard({ sale, onTap }: { sale: SaleRow; onTap: () => void }) {
  const marginPercent =
    Number(sale.totalRevenue) > 0
      ? (Number(sale.totalMargin) / Number(sale.totalRevenue)) * 100
      : 0;
  const itemNames = sale.items
    .map((i) => i.perfumeSnapshot?.name || "Ligne")
    .slice(0, 2)
    .join(" · ");
  const extra = sale.items.length > 2 ? ` +${sale.items.length - 2}` : "";

  return (
    <SectionCard
      interactive
      onClick={onTap}
      className="admin-ios-shadow border border-[color-mix(in_srgb,var(--admin-text)_6%,transparent)] border-l-[3px] border-l-[var(--admin-success)] p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-admin-subtle">
            {formatTime(sale.soldAt)}
            {sale.customerName ? ` · ${sale.customerName}` : ""}
            {sale.order ? " · Encaissement de commande" : ""}
          </p>
          <p className="mt-1 text-[15px] font-semibold leading-tight text-admin-text truncate">
            {itemNames || "Vente"}
            {extra ? <span className="text-admin-subtle">{extra}</span> : null}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[18px] font-bold tabular-nums text-admin-text">
            {formatMoney(sale.totalRevenue)}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-[var(--admin-success)]">
            +{formatMoney(sale.totalMargin)} ({marginPercent.toFixed(0)}%)
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

type LineDraft = { unitPrice: string; unitCost: string; volumeMl: number };

function SaleDetailModal({
  sale,
  onClose,
  onDelete,
  onUpdated,
}: {
  sale: SaleRow | null;
  onClose: () => void;
  onDelete: (s: SaleRow) => void;
  onUpdated: (s: SaleRow) => void;
}) {
  const [lineDraft, setLineDraft] = useState<Record<string, LineDraft> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sale) {
      setLineDraft(null);
      return;
    }
    const d: Record<string, LineDraft> = {};
    for (const it of sale.items) {
      const vol =
        it.volumeMl ??
        (it.perfumeSnapshot && typeof (it.perfumeSnapshot as { volumeMl?: number }).volumeMl ===
        "number"
          ? (it.perfumeSnapshot as { volumeMl: number }).volumeMl
          : 100);
      d[it.id] = {
        unitPrice: it.unitPrice,
        unitCost: it.unitCost,
        volumeMl: (ORDER_VOLUMES_ML as readonly number[]).includes(vol) ? vol : 100,
      };
    }
    setLineDraft(d);
  }, [sale]);

  if (!sale) return null;
  const marginPercent =
    Number(sale.totalRevenue) > 0
      ? (Number(sale.totalMargin) / Number(sale.totalRevenue)) * 100
      : 0;

  async function saveCorrections() {
    if (!sale || !lineDraft) return;
    setSaving(true);
    setError(null);
    try {
      const s = sale;
      const items = s.items.map((it) => {
        const d = lineDraft[it.id]!;
        return {
          id: it.id,
          unitPrice: d.unitPrice,
          unitCost: d.unitCost,
          volumeMl: d.volumeMl,
        };
      });
      const r = await fetch(`/api/admin/sales/${s.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const j = await readJsonSafe<{ error?: string; sale?: SaleRow }>(r);
      if (!r.ok) {
        throw new Error(j?.error ?? "Enregistrement impossible.");
      }
      if (j?.sale) {
        onUpdated(j.sale);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Vente · ${formatDate(sale.soldAt)}`}
      description={`${formatTime(sale.soldAt)}${sale.customerName ? ` · ${sale.customerName}` : ""}`}
      footer={
        <AdminButton variant="danger" size="lg" className="w-full" onClick={() => onDelete(sale)}>
          Supprimer la vente
        </AdminButton>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="CA" value={formatMoney(sale.totalRevenue)} />
          <StatCard
            label="Marge"
            value={formatMoney(sale.totalMargin)}
            tone="success"
            hint={`${marginPercent.toFixed(0)}%`}
          />
          <StatCard label="Coût" value={formatMoney(sale.totalCost)} />
        </div>

        {sale.order ? (
          <div className="rounded-xl border border-admin-border bg-admin-surface p-3">
            <Link
              href={`/admin/ordres/${sale.order.id}`}
              prefetch
              className="inline-block text-[13px] font-medium text-admin-accent [@media(hover:hover)]:hover:text-admin-accent-hover"
            >
              Commande · {formatDate(sale.order.orderedAt)}
            </Link>
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-admin-subtle">
            Lignes ({sale.items.length})
          </p>
          {error ? (
            <p className="text-[12px] text-[var(--admin-danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            {sale.items.map((item) => {
              const draft = lineDraft?.[item.id];
              const volLine =
                draft?.volumeMl ??
                item.volumeMl ??
                (item.perfumeSnapshot as { volumeMl?: number } | undefined)?.volumeMl ??
                100;
              return (
                <SectionCard key={item.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-[15px] font-semibold leading-tight text-admin-text truncate">
                        {item.perfumeSnapshot?.name || "Ligne"}
                      </p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-admin-subtle">
                        {item.perfumeSnapshot?.brand?.name || "—"} · ×{item.quantity} · {volLine} ml
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-sans text-[15px] font-semibold tabular-nums text-admin-text">
                        {formatMoney(item.lineRevenue)}
                      </p>
                      <p className="mt-0.5 text-[11px] tabular-nums text-admin-subtle">
                        {formatMoney(item.lineCost)}
                      </p>
                    </div>
                  </div>
                  {draft ? (
                    <div className="mt-3 space-y-2 border-t border-admin-border pt-3">
                      <p className="text-[10px] uppercase tracking-wider text-admin-subtle">
                        Corriger (prix client, ton achat, flacon)
                      </p>
                      <div className="flex gap-1">
                        {ORDER_VOLUMES_ML.map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() =>
                              setLineDraft((prev) => ({
                                ...prev!,
                                [item.id]: { ...draft, volumeMl: v },
                              }))
                            }
                            className={cn(
                              "flex-1 rounded-lg py-1.5 text-center text-[11px] font-semibold",
                              draft.volumeMl === v
                                ? "bg-admin-accent text-white"
                                : "border border-admin-border bg-admin-bg text-admin-muted",
                            )}
                          >
                            {v} ml
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-0.5 block text-[9px] uppercase leading-tight text-admin-subtle">
                            Prix client (€)
                          </label>
                          <p className="mb-1 text-[7px] font-normal normal-case text-admin-muted">
                            facturé au client
                          </p>
                          <AdminInput
                            value={draft.unitPrice}
                            onChange={(e) =>
                              setLineDraft((prev) => ({
                                ...prev!,
                                [item.id]: { ...draft, unitPrice: e.target.value },
                              }))
                            }
                            inputMode="decimal"
                            placeholder="ex. 35"
                            title="Montant facturé au client pour ce flacon"
                            className="min-h-10 text-[15px]"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[9px] uppercase leading-tight text-admin-subtle">
                            Mon achat (€)
                          </label>
                          <p className="mb-1 text-[7px] font-normal normal-case text-admin-muted">
                            ton coût flacon
                          </p>
                          <AdminInput
                            value={draft.unitCost}
                            onChange={(e) =>
                              setLineDraft((prev) => ({
                                ...prev!,
                                [item.id]: { ...draft, unitCost: e.target.value },
                              }))
                            }
                            inputMode="decimal"
                            placeholder="ex. 10,86"
                            title="À combien le flacon t’a coûté (revient)"
                            className="min-h-10 text-[15px]"
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </SectionCard>
              );
            })}
          </div>
          {lineDraft ? (
            <AdminButton
              variant="secondary"
              size="md"
              className="w-full"
              isLoading={saving}
              onClick={() => void saveCorrections()}
            >
              Appliquer
            </AdminButton>
          ) : null}
        </div>

        {sale.notes ? (
          <div className="rounded-xl border border-admin-border bg-admin-surface p-3">
            <p className="text-[10px] uppercase tracking-wider text-admin-subtle mb-1">
              Notes
            </p>
            <p className="text-[13px] text-admin-muted whitespace-pre-wrap">{sale.notes}</p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
