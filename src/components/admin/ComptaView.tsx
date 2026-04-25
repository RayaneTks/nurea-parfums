"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, Receipt, Settings } from "lucide-react";
import { PageHeader } from "./shell/PageHeader";
import { HeaderAction } from "./shell/HeaderAction";
import { SectionCard } from "./ui/SectionCard";
import { FilterPills } from "./ui/FilterPills";
import { StatCard } from "./ui/StatCard";
import { EmptyState } from "./ui/EmptyState";
import { AdminToast, type ToastType } from "./ui/AdminToast";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { AdminButton } from "./ui/AdminButton";
import { Modal } from "./ui/Modal";
import {
  formatDate,
  formatMoney,
  formatTime,
  relativeDayLabel,
} from "@/lib/utils";
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

export function ComptaView() {
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

  return (
    <>
      <PageHeader
        title="Compta"
        eyebrow="Nuréa Admin"
        signature
        description={
          loading
            ? "Chargement…"
            : `${periodLabel} · ${stats?.count ?? 0} vente${(stats?.count ?? 0) > 1 ? "s" : ""}`
        }
        action={
          <HeaderAction
            href="/admin/catalogue"
            label="Ouvrir le catalogue"
            icon={Settings}
          />
        }
      />

      <main id="main-content" className="flex-1 px-5 pt-5 space-y-6">
        <div className="flex justify-center">
          <FilterPills
            options={periodOptions}
            value={period}
            onChange={setPeriod}
            ariaLabel="Filtrer la période"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatCard
            label="Chiffre d'affaires"
            value={formatMoney(stats?.totalRevenue ?? 0)}
            tone="default"
          />
          <StatCard
            label="Marge"
            value={formatMoney(stats?.totalMargin ?? 0)}
            tone="success"
          />
          <StatCard
            label="Ventes"
            value={stats?.count ?? 0}
            hint={stats?.count ? `Moy. ${formatMoney(stats.averageSale)}` : undefined}
            tone="default"
          />
        </div>

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
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl border border-admin-border admin-skeleton"
              />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Aucune vente sur cette période"
            description="Enregistre ta première vente pour voir apparaître la compta ici."
            action={
              <Link
                href="/admin/vendre"
                prefetch={false}
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
    <SectionCard interactive onClick={onTap} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-admin-subtle">
            {formatTime(sale.soldAt)}
            {sale.customerName ? ` · ${sale.customerName}` : ""}
            {sale.order ? " · Encaissement d'ordre" : ""}
          </p>
          <p className="mt-1 font-serif text-[17px] leading-tight tracking-[-0.01em] text-admin-text truncate">
            {itemNames || "Vente"}
            {extra ? <span className="text-admin-subtle">{extra}</span> : null}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-serif text-[18px] tabular-nums text-admin-text">
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

function SaleDetailModal({
  sale,
  onClose,
  onDelete,
}: {
  sale: SaleRow | null;
  onClose: () => void;
  onDelete: (s: SaleRow) => void;
}) {
  if (!sale) return null;
  const marginPercent =
    Number(sale.totalRevenue) > 0
      ? (Number(sale.totalMargin) / Number(sale.totalRevenue)) * 100
      : 0;

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
            <p className="text-[10px] uppercase tracking-wider text-admin-subtle">
              Ordre source
            </p>
            <Link
              href={`/admin/ordres/${sale.order.id}`}
              prefetch={false}
              className="mt-1 inline-block text-[13px] text-admin-accent [@media(hover:hover)]:hover:text-admin-accent-hover"
            >
              Voir l&apos;ordre du {formatDate(sale.order.orderedAt)}
            </Link>
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-admin-subtle">
            Lignes ({sale.items.length})
          </p>
          <div className="flex flex-col gap-2">
            {sale.items.map((item) => (
              <SectionCard key={item.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-[15px] leading-tight tracking-[-0.01em] text-admin-text truncate">
                      {item.perfumeSnapshot?.name || "Ligne"}
                    </p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wider text-admin-subtle">
                      {item.perfumeSnapshot?.brand?.name || "—"} · × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-serif text-[15px] tabular-nums text-admin-text">
                      {formatMoney(item.lineRevenue)}
                    </p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-admin-subtle">
                      coût {formatMoney(item.lineCost)}
                    </p>
                  </div>
                </div>
              </SectionCard>
            ))}
          </div>
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
