"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  ClipboardList,
  Minus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "./shell/PageHeader";
import { SectionCard } from "./ui/SectionCard";
import { EmptyState } from "./ui/EmptyState";
import { AdminButton } from "./ui/AdminButton";
import { AdminInput } from "./ui/AdminInput";
import { FAB } from "./ui/FAB";
import { Modal } from "./ui/Modal";
import { AdminToast, type ToastType } from "./ui/AdminToast";
import { OrderStatusBadge } from "./ui/OrderStatusBadge";
import { cn, relativeDayLabel } from "@/lib/utils";
import type {
  OrderRow,
  OrderStatusValue,
  PerfumePickerRow,
} from "@/lib/gestion/types";

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type GroupLabel = "En retard" | "Aujourd'hui" | "À venir" | "Prêtes" | "Livrées";

type Group = {
  label: GroupLabel;
  orders: OrderRow[];
};

const PerfumePicker = dynamic(
  () => import("./gestion/PerfumePicker").then((mod) => mod.PerfumePicker),
  { ssr: false },
);

let ordersCache: OrderRow[] | null = null;

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

function groupOrders(orders: OrderRow[]): Group[] {
  const overdue: OrderRow[] = [];
  const today: OrderRow[] = [];
  const upcoming: OrderRow[] = [];
  const ready: OrderRow[] = [];
  const delivered: OrderRow[] = [];

  for (const order of orders) {
    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      delivered.push(order);
    } else if (isOverdue(order)) {
      overdue.push(order);
    } else if (isToday(order.deliveryAt)) {
      today.push(order);
    } else if (order.status === "READY") {
      ready.push(order);
    } else {
      upcoming.push(order);
    }
  }

  const groups: Group[] = [];
  if (overdue.length) groups.push({ label: "En retard", orders: overdue });
  if (today.length) groups.push({ label: "Aujourd'hui", orders: today });
  if (ready.length) groups.push({ label: "Prêtes", orders: ready });
  if (upcoming.length) groups.push({ label: "À venir", orders: upcoming });
  if (delivered.length) groups.push({ label: "Livrées", orders: delivered });
  return groups;
}

export function OrdersView() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: ToastType; text: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const refresh = useCallback(async (background = false) => {
    if (!background) {
      setLoading(true);
    }
    setError(null);
    try {
      const r = await fetch("/api/admin/orders", {
        credentials: "include",
        cache: "no-store",
      });
      if (!r.ok) throw new Error("Impossible de charger les ordres.");
      const j = await readJsonSafe<{ orders: OrderRow[] }>(r);
      const nextOrders = j?.orders ?? [];
      setOrders(nextOrders);
      ordersCache = nextOrders;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (ordersCache) {
      setOrders(ordersCache);
      setLoading(false);
      void refresh(true);
      return;
    }
    void refresh();
  }, [refresh]);

  const groups = useMemo(() => groupOrders(orders), [orders]);
  const activeCount = orders.filter(
    (o) => o.status === "PENDING" || o.status === "READY",
  ).length;

  return (
    <>
      <PageHeader
        title="Ordres"
        eyebrow="Nuréa Admin"
        signature
        description={
          loading
            ? "Chargement…"
            : `${activeCount} en cours · ${orders.length} au total`
        }
      />

      <main
        id="main-content"
        className={cn(
          "flex-1 px-5 pt-5 pb-4 space-y-6 transition-opacity duration-200 ease-out",
          loading ? "opacity-95" : "opacity-100",
        )}
      >
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
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl border border-admin-border admin-skeleton"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Aucun ordre enregistré"
            description="Crée un ordre quand une cliente passe une commande via WhatsApp ou Snapchat."
            action={
              <AdminButton
                variant="primary"
                size="md"
                leftIcon={Plus}
                onClick={() => setCreateOpen(true)}
              >
                Nouvel ordre
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
        label="Nouvel ordre"
        onClick={() => setCreateOpen(true)}
      />

      <CreateOrderModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          setToast({ type: "success", text: "Ordre créé." });
          void refresh(true);
        }}
        onError={(msg) => setToast({ type: "error", text: msg })}
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
    <Link href={`/admin/ordres/${order.id}`} className="block tap-scale">
      <SectionCard
        className={cn(
          "p-4",
          overdue && "border-[var(--admin-danger-border)] bg-[var(--admin-danger-subtle)]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <OrderStatusBadge status={order.status} />
              {order.deliveryAt ? (
                <span
                  className={cn(
                    "text-[11px] uppercase tracking-wider",
                    overdue ? "text-admin-danger" : "text-admin-subtle",
                  )}
                >
                  {relativeDayLabel(order.deliveryAt)}
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 font-serif text-[17px] leading-tight tracking-[-0.01em] text-admin-text truncate">
              {order.customerName || "Client"}
            </p>
            <p className="mt-0.5 text-[12px] text-admin-muted truncate">
              {itemSummary || "Aucune ligne"}
              {extra ? <span className="text-admin-subtle">{extra}</span> : null}
            </p>
          </div>
        </div>
      </SectionCard>
    </Link>
  );
}

function CreateOrderModal({
  open,
  onClose,
  onCreated,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [deliveryAt, setDeliveryAt] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<
    { perfume: PerfumePickerRow; quantity: number }[]
  >([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setCustomerName("");
      setDeliveryAt("");
      setNotes("");
      setItems([]);
      setSaving(false);
    }
  }, [open]);

  const addPerfume = (p: PerfumePickerRow) => {
    setItems((prev) => {
      if (prev.some((it) => it.perfume.id === p.id)) return prev;
      return [...prev, { perfume: p, quantity: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) =>
          it.perfume.id === id ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it,
        )
        .filter((it) => it.quantity > 0),
    );
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((it) => it.perfume.id !== id));
  };

  const canSubmit = items.length > 0 && !saving;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload = {
        customerName: customerName.trim() || null,
        deliveryAt: deliveryAt ? new Date(deliveryAt).toISOString() : null,
        notes: notes.trim() || null,
        items: items.map((i) => ({ perfumeId: i.perfume.id, quantity: i.quantity })),
      };
      const r = await fetch("/api/admin/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const j = await readJsonSafe<{ error?: string }>(r);
        throw new Error(j?.error ?? "Création impossible.");
      }
      onCreated();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Nouvel ordre"
        description="Saisis les informations de la commande reçue."
        size="md"
        footer={
          <AdminButton
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={saving}
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            Créer l&apos;ordre
          </AdminButton>
        }
      >
        <div className="space-y-5">
          <AdminInput
            label="Client (optionnel)"
            name="customerName"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nom ou pseudo"
          />

          <AdminInput
            label="Date de livraison (optionnel)"
            name="deliveryAt"
            type="datetime-local"
            value={deliveryAt}
            onChange={(e) => setDeliveryAt(e.target.value)}
          />

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider font-medium text-admin-muted">
              Parfums ({items.length})
            </p>
            <div className="flex flex-col gap-2">
              {items.map((it) => (
                <SectionCard key={it.perfume.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-9 rounded-xl overflow-hidden bg-admin-bg border border-admin-border shrink-0">
                      <Image
                        src={it.perfume.image}
                        alt={it.perfume.name}
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-[14px] leading-tight tracking-[-0.01em] text-admin-text truncate">
                        {it.perfume.name}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-admin-subtle truncate">
                        {it.perfume.brand.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateQty(it.perfume.id, -1)}
                        aria-label="Diminuer la quantité"
                        className="h-9 w-9 flex items-center justify-center rounded-xl border border-admin-border text-admin-muted tap-scale [@media(hover:hover)]:hover:border-admin-border-hover"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <span className="min-w-7 text-center font-serif text-[15px] tabular-nums">
                        {it.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(it.perfume.id, 1)}
                        aria-label="Augmenter la quantité"
                        className="h-9 w-9 flex items-center justify-center rounded-xl border border-admin-border text-admin-muted tap-scale [@media(hover:hover)]:hover:border-admin-border-hover"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(it.perfume.id)}
                      aria-label="Retirer"
                      className="h-9 w-9 flex items-center justify-center rounded-xl text-admin-subtle tap-scale [@media(hover:hover)]:hover:text-admin-danger"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </SectionCard>
              ))}
            </div>
            <AdminButton
              type="button"
              variant="outline"
              size="md"
              leftIcon={Plus}
              className="w-full"
              onClick={() => setPickerOpen(true)}
            >
              Ajouter un parfum
            </AdminButton>
            {items.length === 0 ? (
              <p className="flex items-center gap-2 text-[11px] text-admin-subtle">
                <AlertCircle className="h-3 w-3" aria-hidden />
                Au moins un parfum est requis.
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="order-notes"
              className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-admin-muted"
            >
              Notes (optionnel)
            </label>
            <textarea
              id="order-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Livraison spéciale, remarques…"
              className="block w-full rounded-xl bg-admin-surface border border-admin-border px-4 py-3 text-[16px] text-admin-text placeholder:text-admin-subtle transition-colors focus-visible:border-admin-accent focus-visible:outline-none"
            />
          </div>
        </div>
      </Modal>

      <PerfumePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addPerfume}
        excludedIds={items.map((i) => i.perfume.id)}
      />
    </>
  );
}

