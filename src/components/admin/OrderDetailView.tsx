"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Calculator,
  Trash2,
  XCircle,
} from "lucide-react";
import { PageHeader } from "./shell/PageHeader";
import { HeaderAction } from "./shell/HeaderAction";
import { SectionCard } from "./ui/SectionCard";
import { AdminButton } from "./ui/AdminButton";
import { AdminToast, type ToastType } from "./ui/AdminToast";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { OrderStatusBadge } from "./ui/OrderStatusBadge";
import { formatDate, formatDateTime, relativeDayLabel } from "@/lib/utils";
import type { OrderRow, OrderStatusValue } from "@/lib/gestion/types";

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function OrderDetailView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: ToastType; text: string } | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<OrderStatusValue | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/orders/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!r.ok) {
        const j = await readJsonSafe<{ error?: string }>(r);
        throw new Error(j?.error ?? "Impossible de charger l'ordre.");
      }
      const j = await readJsonSafe<{ order: OrderRow }>(r);
      setOrder(j?.order ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function updateStatus(next: OrderStatusValue) {
    setUpdatingStatus(next);
    try {
      const r = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!r.ok) {
        const j = await readJsonSafe<{ error?: string }>(r);
        throw new Error(j?.error ?? "Changement impossible.");
      }
      setToast({ type: "success", text: "Statut mis à jour." });
      refresh();
    } catch (err) {
      setToast({
        type: "error",
        text: err instanceof Error ? err.message : "Erreur",
      });
    } finally {
      setUpdatingStatus(null);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const r = await fetch(`/api/admin/orders/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) {
        const j = await readJsonSafe<{ error?: string }>(r);
        throw new Error(j?.error ?? "Suppression impossible.");
      }
      router.push("/admin/ordres");
      router.refresh();
    } catch (err) {
      setToast({
        type: "error",
        text: err instanceof Error ? err.message : "Erreur",
      });
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader
          title="Ordre"
          eyebrow="Chargement…"
          leading={<HeaderAction label="Retour" icon={ArrowLeft} onClick={() => router.back()} />}
        />
        <main id="main-content" className="flex-1 px-5 pt-5 pb-10 space-y-5">
          <div className="h-24 rounded-2xl border border-admin-border admin-skeleton" />
          <div className="space-y-2">
            <div className="h-4 w-24 rounded-full admin-skeleton" />
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-[76px] rounded-xl border border-admin-border admin-skeleton" />
            ))}
          </div>
          <div className="h-12 rounded-xl border border-admin-border admin-skeleton" />
        </main>
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <PageHeader
          title="Ordre"
          eyebrow="Erreur"
          leading={<HeaderAction label="Retour" icon={ArrowLeft} onClick={() => router.back()} />}
        />
        <main id="main-content" className="flex-1 px-5 pt-5">
          <SectionCard className="p-4 border-[var(--admin-danger-border)] bg-[var(--admin-danger-subtle)]">
            <p className="text-[13px] text-admin-danger">{error || "Ordre introuvable."}</p>
            <button
              type="button"
              onClick={refresh}
              className="mt-2 text-[11px] uppercase tracking-wider text-admin-accent font-medium"
            >
              Réessayer
            </button>
          </SectionCard>
        </main>
      </>
    );
  }

  const hasSale = !!order.sale;
  const isDelivered = order.status === "DELIVERED";
  const isCancelled = order.status === "CANCELLED";

  return (
    <>
      <PageHeader
        title={order.customerName || "Ordre"}
        eyebrow={`Créé le ${formatDate(order.orderedAt)}`}
        leading={<HeaderAction label="Retour" icon={ArrowLeft} onClick={() => router.back()} />}
        action={<OrderStatusBadge status={order.status} />}
      />

      <main id="main-content" className="flex-1 px-5 pt-5 pb-40 space-y-5">
        <SectionCard className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-admin-subtle">
                Livraison prévue
              </p>
              <p className="mt-0.5 font-serif text-[16px] leading-tight tracking-[-0.01em] text-admin-text">
                {order.deliveryAt
                  ? `${relativeDayLabel(order.deliveryAt)} · ${formatDateTime(order.deliveryAt)}`
                  : "Non planifiée"}
              </p>
            </div>
          </div>
          {order.notes ? (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-admin-subtle">Notes</p>
              <p className="mt-0.5 text-[13px] text-admin-muted whitespace-pre-wrap">
                {order.notes}
              </p>
            </div>
          ) : null}
        </SectionCard>

        <section className="space-y-2">
          <h2 className="text-[10px] font-medium uppercase tracking-wider text-admin-subtle px-1">
            Parfums ({order.items.length})
          </h2>
          <div className="flex flex-col gap-2">
            {order.items.map((item) => (
              <SectionCard key={item.id} className="p-3">
                <div className="flex items-center gap-3">
                  {item.perfume?.image ? (
                    <div className="relative h-14 w-11 rounded-xl overflow-hidden bg-admin-bg border border-admin-border shrink-0">
                      <Image
                        src={item.perfume.image}
                        alt={item.perfume.name}
                        fill
                        className="object-cover"
                        sizes="44px"
                      />
                    </div>
                  ) : (
                    <div className="h-14 w-11 rounded-xl bg-admin-bg border border-admin-border shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-[15px] leading-tight tracking-[-0.01em] text-admin-text truncate">
                      {item.perfume?.name ?? "Parfum"}
                    </p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wider text-admin-subtle truncate">
                      {item.perfume?.brand?.name ?? "—"}
                    </p>
                  </div>
                  <span className="font-serif text-[16px] tabular-nums text-admin-text">
                    ×{item.quantity}
                  </span>
                </div>
              </SectionCard>
            ))}
          </div>
        </section>

        {hasSale && order.sale ? (
          <SectionCard className="p-4 border-[var(--admin-success-border)] bg-[var(--admin-success-subtle)]">
            <p className="text-[10px] uppercase tracking-wider text-[var(--admin-success)]">
              Vente enregistrée
            </p>
            <p className="mt-1 text-[13px] text-admin-muted">
              Encaissée le {formatDateTime(order.sale.soldAt)}.
            </p>
            <Link
              href="/admin/compta"
              prefetch={false}
              className="mt-2 inline-block text-[12px] uppercase tracking-wider text-[var(--admin-success)] font-medium [@media(hover:hover)]:hover:opacity-80"
            >
              Voir dans la Compta
            </Link>
          </SectionCard>
        ) : null}

        {!isDelivered && !isCancelled && !hasSale ? (
          <section className="space-y-2">
            <h2 className="text-[10px] font-medium uppercase tracking-wider text-admin-subtle px-1">
              Actions
            </h2>
            <div className="flex flex-col gap-2">
              {order.status === "PENDING" ? (
                <AdminButton
                  variant="secondary"
                  size="lg"
                  leftIcon={CheckCircle2}
                  isLoading={updatingStatus === "READY"}
                  onClick={() => updateStatus("READY")}
                >
                  Marquer prête
                </AdminButton>
              ) : null}
              <AdminButton
                variant="ghost"
                size="md"
                leftIcon={XCircle}
                isLoading={updatingStatus === "CANCELLED"}
                onClick={() => updateStatus("CANCELLED")}
                className="text-admin-danger [@media(hover:hover)]:hover:bg-[var(--admin-danger-subtle)]"
              >
                Annuler l&apos;ordre
              </AdminButton>
            </div>
          </section>
        ) : null}

        {!hasSale && !isCancelled ? (
          <div className="pt-4 flex justify-center border-t border-admin-border">
            <AdminButton
              variant="ghost"
              size="sm"
              leftIcon={Trash2}
              onClick={() => setDeleteOpen(true)}
              className="text-admin-danger [@media(hover:hover)]:hover:bg-[var(--admin-danger-subtle)]"
            >
              Supprimer l&apos;ordre
            </AdminButton>
          </div>
        ) : null}
      </main>

      {!hasSale && !isCancelled ? (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-[55] w-full max-w-[430px] px-5">
          <Link
            href={`/admin/vendre?fromOrder=${order.id}`}
            prefetch={false}
            className="inline-flex w-full items-center justify-center gap-2 min-h-[52px] px-6 rounded-xl border border-admin-accent bg-admin-accent text-admin-bg text-[13px] uppercase tracking-[0.12em] font-medium tap-scale transition-colors [@media(hover:hover)]:hover:bg-admin-accent-hover [@media(hover:hover)]:hover:border-admin-accent-hover"
          >
            <Calculator className="h-4 w-4" aria-hidden />
            Encaisser maintenant
          </Link>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title="Supprimer cet ordre ?"
        description="L'ordre sera définitivement retiré de la liste."
        confirmLabel="Supprimer définitivement"
        destructive
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
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
