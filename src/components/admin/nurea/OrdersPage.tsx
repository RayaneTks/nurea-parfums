"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Plus, ClipboardList, User } from "lucide-react";
import { SectionCard } from "../ui/SectionCard";
import { EmptyState } from "../ui/EmptyState";
import { AdminButton } from "../ui/AdminButton";
import { FAB } from "../ui/FAB";
import { AdminOrdersListSkeleton } from "../ui/AdminLoadingPrimitives";
import { AdminToast, type ToastType } from "../ui/AdminToast";
import { OrderStatusBadge } from "../ui/OrderStatusBadge";
import { cn, relativeDayLabel } from "@/lib/utils";
import type { OrderRow } from "@/lib/gestion/types";

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type GroupLabel = "En retard" | "Aujourd'hui" | "À venir" | "À traiter" | "Livrées";

type Group = {
  label: GroupLabel;
  orders: OrderRow[];
};

let ordersCacheAll: OrderRow[] | null = null;

function isOverdue(order: OrderRow): boolean {
  if (!order.deliveryAt) return false;
  if (order.status !== "PENDING" && order.status !== "READY") return false;
  return new Date(order.deliveryAt).getTime() < Date.now() - 24 * 60 * 60 * 1000;
}

function isToday(date: string | null): boolean {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function groupOrders(orders: OrderRow[]): { label: GroupLabel; orders: OrderRow[] }[] {
  const overdue: OrderRow[] = [];
  const today: OrderRow[] = [];
  const upcoming: OrderRow[] = [];
  const ready: OrderRow[] = [];

  for (const order of orders) {
    if (isOverdue(order)) {
      overdue.push(order);
    } else if (isToday(order.deliveryAt)) {
      today.push(order);
    } else if (order.status === "READY") {
      ready.push(order);
    } else {
      upcoming.push(order);
    }
  }

  const groups: { label: GroupLabel; orders: OrderRow[] }[] = [];
  if (overdue.length) groups.push({ label: "En retard", orders: overdue });
  if (today.length) groups.push({ label: "Aujourd'hui", orders: today });
  if (ready.length) groups.push({ label: "À traiter", orders: ready });
  if (upcoming.length) groups.push({ label: "À venir", orders: upcoming });
  return groups;
}

type OrderListFilter = "all" | "pending" | "ready";

const ORDER_FILTER_COPY: Record<
  OrderListFilter,
  { title: string; description: string }
> = {
  all: {
    title: "Tout",
    description: "Toutes les commandes actives (sauf livrées).",
  },
  pending: {
    title: "En attente",
    description: "Encaisse l’acompte et passe en « à traiter » depuis la fiche commande.",
  },
  ready: {
    title: "À traiter",
    description: "Acompte reçu — à préparer, livrer ou encaisser le solde.",
  },
};

export function NureaOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: ToastType; text: string } | null>(null);
  const router = useRouter();
  const [orderFilter, setOrderFilter] = useState<OrderListFilter>("all");

  const ordersUrl = useMemo(() => {
    const q = new URLSearchParams();
    if (orderFilter === "pending") {
      q.set("status", "PENDING");
    } else if (orderFilter === "ready") {
      q.set("status", "READY");
    }
    const s = q.toString();
    return s ? `/api/admin/orders?${s}` : "/api/admin/orders";
  }, [orderFilter]);

  const refresh = useCallback(
    async (background = false) => {
      if (!background) {
        setLoading(true);
      }
      setError(null);
      try {
        const r = await fetch(ordersUrl, {
          credentials: "include",
          cache: "no-store",
        });
        if (!r.ok) {
          const j = await readJsonSafe<{ error?: string }>(r);
          throw new Error(
            (j && typeof j.error === "string" && j.error) || "Impossible de charger les commandes.",
          );
        }
        const j = await readJsonSafe<{ orders: OrderRow[] }>(r);
        const nextOrders = j?.orders ?? [];
        setOrders(nextOrders);
        if (orderFilter === "all") {
          ordersCacheAll = nextOrders;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
    },
    [ordersUrl, orderFilter],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const groups = useMemo(() => groupOrders(orders), [orders]);
  const activeCount = orders.filter(
    (o) => o.status === "PENDING" || o.status === "READY",
  ).length;

  return (
    <>
      <main
        id="main-content"
        className="flex-1 space-y-5 px-5 pt-2 pb-4"
        aria-busy={loading}
      >
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-admin-text">
            Commandes
          </h1>
          <p className="mt-0.5 text-sm tabular-nums text-admin-subtle">
            {loading
              ? "…"
              : `${activeCount} actives — ${orders.length} au filtre`}
          </p>
          <div
            className="mt-4 flex gap-1 rounded-2xl bg-[color-mix(in_srgb,var(--admin-text)_5%,transparent)] p-1"
            role="group"
            aria-label="Statut de commande"
            aria-describedby="orders-filter-hint"
          >
            {(
              [
                { id: "all" as const, label: ORDER_FILTER_COPY.all.title },
                { id: "pending" as const, label: ORDER_FILTER_COPY.pending.title },
                { id: "ready" as const, label: ORDER_FILTER_COPY.ready.title },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={orderFilter === f.id}
                onClick={() => setOrderFilter(f.id)}
                className={cn(
                  "min-h-11 flex-1 rounded-xl px-1 py-2 text-center text-[13px] font-semibold leading-tight transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent/35 focus-visible:ring-inset",
                  orderFilter === f.id
                    ? "bg-white text-admin-text shadow-sm"
                    : "text-admin-muted [@media(hover:hover)]:hover:text-admin-text",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p
            id="orders-filter-hint"
            className="mt-2 text-[12px] leading-snug text-admin-muted"
          >
            {ORDER_FILTER_COPY[orderFilter].description}
          </p>
        </motion.header>
        {error ? (
          <SectionCard className="p-4 border-[var(--admin-danger-border)] bg-[var(--admin-danger-subtle)]">
            <p className="text-[13px] text-admin-danger">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-[12px] font-semibold uppercase tracking-wider text-admin-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-admin-surface"
            >
              Réessayer
            </button>
          </SectionCard>
        ) : null}

        {loading ? (
          <AdminOrdersListSkeleton count={3} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Aucune commande"
            description="Change le filtre ou crée une commande."
            action={
              <AdminButton
                variant="primary"
                size="md"
                leftIcon={Plus}
                onClick={() => router.push("/admin/ordres/new")}
              >
                Nouvelle commande
              </AdminButton>
            }
          />
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.label} className="space-y-2">
                <div className="flex items-center gap-3 px-1">
                  <h2
                    className={cn(
                      "text-[10px] font-medium uppercase tracking-wider",
                      group.label === "En retard"
                        ? "text-admin-danger"
                        : group.label === "Aujourd'hui"
                          ? "text-admin-cuivre"
                          : group.label === "À traiter"
                            ? "text-admin-accent"
                            : "text-admin-subtle",
                    )}
                  >
                    {group.label} ({group.orders.length})
                  </h2>
                  <div className="h-px flex-1 bg-admin-border" />
                </div>

                <div className="flex flex-col gap-2">
                  {group.orders.map((order) => (
                    <OrderCard key={order.id} order={order} overdue={group.label === "En retard"} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <FAB
        icon={Plus}
        label="Nouvelle commande"
        onClick={() => router.push("/admin/ordres/new")}
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

function OrderCard({ order, overdue }: { order: OrderRow; overdue: boolean }) {
  const itemSummary = order.items
    .map((i) => `${i.quantity}× ${i.perfume?.name ?? "parfum"}`)
    .slice(0, 2)
    .join(" · ");
  const extra = order.items.length > 2 ? ` +${order.items.length - 2}` : "";

  return (
    <Link href={`/admin/ordres/${order.id}`} prefetch className="block tap-scale">
      <div
        className={cn(
          "admin-ios-shadow rounded-[28px] border p-4 transition-colors",
          overdue
            ? "border-[var(--admin-danger-border)] bg-[var(--admin-danger-subtle)]"
            : "border-[color-mix(in_srgb,var(--admin-text)_6%,transparent)] bg-admin-surface",
        )}
      >
        <div className="mb-3 flex items-center gap-3">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
              overdue
                ? "bg-[color-mix(in_srgb,var(--admin-danger)_22%,white)] text-[var(--admin-danger)]"
                : order.status === "READY"
                  ? "bg-[var(--admin-accent-subtle)] text-[var(--admin-accent)]"
                  : "bg-[var(--admin-warning-subtle)] text-[var(--admin-warning)]",
            )}
          >
            <User className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{order.customerName || "Client"}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-admin-subtle">
              #{String(order.id).slice(0, 8)} ·{" "}
              {new Date(order.orderedAt).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                order.depositPaid
                  ? "bg-[var(--admin-success-subtle)] text-[var(--admin-success)]"
                  : "bg-[color-mix(in_srgb,var(--admin-cuivre)_20%,white)] text-[var(--admin-warning)]",
              )}
            >
              {order.depositPaid ? "Acompte payé" : "Acompte dû"}
            </span>
            <OrderStatusBadge status={order.status} />
          </div>
        </div>
        <div className="h-px bg-[color-mix(in_srgb,var(--admin-text)_5%,transparent)]" />
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-admin-muted">
          <span>
            {order.deliveryAt ? (
              <span
                className={cn(overdue ? "font-semibold text-admin-danger" : "text-admin-subtle")}
              >
                {relativeDayLabel(order.deliveryAt)}
              </span>
            ) : null}
          </span>
          <span className="rounded-lg bg-[color-mix(in_srgb,var(--admin-text)_5%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase text-admin-text">
            {order.items.length} flacon{order.items.length > 1 ? "s" : ""}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-[12px] text-admin-muted">
          {itemSummary || "—"}
          {extra ? <span className="text-admin-subtle">{extra}</span> : null}
        </p>
      </div>
    </Link>
  );
}

