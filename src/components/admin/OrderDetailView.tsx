"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Calculator, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "./shell/PageHeader";
import { HeaderAction } from "./shell/HeaderAction";
import { SectionCard } from "./ui/SectionCard";
import { AdminButton } from "./ui/AdminButton";
import { AdminInput } from "./ui/AdminInput";
import { Modal } from "./ui/Modal";
import { AdminToast, type ToastType } from "./ui/AdminToast";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { AdminOrderDetailBodySkeleton } from "./ui/AdminLoadingPrimitives";
import { OrderStatusBadge } from "./ui/OrderStatusBadge";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  relativeDayLabel,
} from "@/lib/utils";
import type { OrderRow } from "@/lib/gestion/types";
import { nureaAdminThumbLoader } from "@/lib/image/cappedImageLoader";
import { OrderFormModal, toNum } from "./gestion/OrderFormModal";

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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [clearDepositOpen, setClearDepositOpen] = useState(false);
  const [clearingDeposit, setClearingDeposit] = useState(false);
  const [readyDialogOpen, setReadyDialogOpen] = useState(false);
  const [readyDepositInput, setReadyDepositInput] = useState("");
  const [markingReady, setMarkingReady] = useState(false);

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
        throw new Error(j?.error ?? "Impossible de charger la commande.");
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

  async function clearDepositPending() {
    setClearingDeposit(true);
    try {
      const r = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositPaid: false }),
      });
      if (!r.ok) {
        const j = await readJsonSafe<{ error?: string }>(r);
        throw new Error(j?.error ?? "Enregistrement impossible.");
      }
      setToast({ type: "success", text: "Acompte remis en attente." });
      setClearDepositOpen(false);
      refresh();
    } catch (err) {
      setToast({
        type: "error",
        text: err instanceof Error ? err.message : "Erreur",
      });
    } finally {
      setClearingDeposit(false);
    }
  }

  function openReadyDialog() {
    const da = order?.depositAmount?.trim() ?? "";
    if (da && toNum(da) > 0) {
      setReadyDepositInput(da.replace(".", ","));
    } else {
      setReadyDepositInput("");
    }
    setReadyDialogOpen(true);
  }

  async function markReadyWithDeposit() {
    const amount = toNum(readyDepositInput);
    if (amount <= 0) {
      setToast({
        type: "error",
        text: "Indique un montant d’acompte supérieur à 0 €.",
      });
      return;
    }
    setMarkingReady(true);
    try {
      const r = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "READY",
          depositPaid: true,
          depositAmount: amount,
        }),
      });
      if (!r.ok) {
        const j = await readJsonSafe<{ error?: string }>(r);
        throw new Error(j?.error ?? "Enregistrement impossible.");
      }
      setToast({ type: "success", text: "Commande passée en à traiter." });
      setReadyDialogOpen(false);
      setReadyDepositInput("");
      refresh();
    } catch (err) {
      setToast({
        type: "error",
        text: err instanceof Error ? err.message : "Erreur",
      });
    } finally {
      setMarkingReady(false);
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
          title="Commande"
          eyebrow="Chargement…"
          leading={<HeaderAction label="Retour" icon={ArrowLeft} onClick={() => router.back()} />}
        />
        <AdminOrderDetailBodySkeleton />
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <PageHeader
          title="Commande"
          eyebrow="Erreur"
          leading={<HeaderAction label="Retour" icon={ArrowLeft} onClick={() => router.back()} />}
        />
        <main id="main-content" className="flex-1 px-5 pt-5">
          <SectionCard className="p-4 border-[var(--admin-danger-border)] bg-[var(--admin-danger-subtle)]">
            <p className="text-[13px] text-admin-danger">{error || "Commande introuvable."}</p>
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

  return (
    <>
      <PageHeader
        title={order.customerName || "Commande"}
        eyebrow={`Créé le ${formatDate(order.orderedAt)}`}
        leading={<HeaderAction label="Retour" icon={ArrowLeft} onClick={() => router.back()} />}
        action={<OrderStatusBadge status={order.status} />}
      />

      <main id="main-content" className="flex-1 px-5 pt-5 pb-40 space-y-5">
        <SectionCard className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
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
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-admin-subtle">
                Acompte
              </p>
              <p className="mt-0.5 font-serif text-[16px] tabular-nums text-admin-text">
                {order.depositPaid ? "Payé" : "Non reçu"} · {formatMoney(order.depositAmount)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-admin-border bg-admin-surface px-3 py-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-admin-subtle">Total</p>
              <p className="text-[15px] font-semibold tabular-nums text-admin-text">
                {formatMoney(order.orderTotal)}
              </p>
            </div>
            {!hasSale && !isDelivered ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <AdminButton
                  variant="secondary"
                  size="md"
                  leftIcon={Pencil}
                  onClick={() => setEditOpen(true)}
                >
                  Modifier
                </AdminButton>
                {order.depositPaid ? (
                  <AdminButton
                    variant="ghost"
                    size="md"
                    onClick={() => setClearDepositOpen(true)}
                    className="text-admin-muted [@media(hover:hover)]:hover:bg-admin-bg"
                  >
                    Acompte en attente
                  </AdminButton>
                ) : null}
              </div>
            ) : null}
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
            Lignes · {order.items.length}
          </h2>
          <div className="flex flex-col gap-2">
            {order.items.map((item) => (
              <SectionCard key={item.id} className="p-3">
                <div className="flex items-center gap-3">
                  {item.perfume?.image ? (
                    <div className="relative h-14 w-11 rounded-xl overflow-hidden bg-admin-bg border border-admin-border shrink-0">
                      <Image
                        loader={nureaAdminThumbLoader}
                        src={item.perfume.image}
                        alt={item.perfume.name}
                        fill
                        className="object-cover"
                        sizes="44px"
                        quality={60}
                        fetchPriority="low"
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
                      {item.perfume?.brand?.name ?? "—"} · {item.volumeMl} ml
                    </p>
                    <p className="mt-1 text-[11px] tabular-nums text-admin-muted">
                      Prix client {formatMoney(item.unitPrice)} · Mon achat {formatMoney(item.unitCost)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-serif text-[16px] tabular-nums text-admin-text">×{item.quantity}</span>
                  </div>
                </div>
              </SectionCard>
            ))}
          </div>
        </section>

        {hasSale && order.sale ? (
          <SectionCard className="p-4 border-[var(--admin-success-border)] bg-[var(--admin-success-subtle)]">
            <Link
              href="/admin/compta"
              prefetch
              className="text-[14px] font-medium text-[var(--admin-success)] [@media(hover:hover)]:hover:opacity-80"
            >
              Compta · {formatDateTime(order.sale.soldAt)}
            </Link>
          </SectionCard>
        ) : null}

        {!isDelivered && !hasSale ? (
          <section className="space-y-2">
            <h2 className="text-[10px] font-medium uppercase tracking-wider text-admin-subtle px-1">Action</h2>
            <div className="flex flex-col gap-2">
              {order.status === "PENDING" ? (
                <AdminButton
                  variant="secondary"
                  size="lg"
                  leftIcon={CheckCircle2}
                  onClick={openReadyDialog}
                >
                  Passer en à traiter
                </AdminButton>
              ) : null}
              <AdminButton
                variant="ghost"
                size="md"
                leftIcon={Trash2}
                isLoading={deleting}
                onClick={() => setDeleteOpen(true)}
                className="text-admin-danger [@media(hover:hover)]:hover:bg-[var(--admin-danger-subtle)]"
              >
                Supprimer la commande
              </AdminButton>
            </div>
          </section>
        ) : null}
      </main>

      {!isDelivered && !hasSale ? (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-[55] w-full max-w-[430px] px-5">
          <Link
            href={`/admin/vendre?fromOrder=${order.id}`}
            prefetch
            className="inline-flex w-full items-center justify-center gap-2 min-h-[52px] px-6 rounded-xl border border-admin-accent bg-admin-accent text-admin-bg text-[13px] uppercase tracking-[0.12em] font-medium tap-scale transition-colors [@media(hover:hover)]:hover:bg-admin-accent-hover [@media(hover:hover)]:hover:border-admin-accent-hover"
          >
            <Calculator className="h-4 w-4" aria-hidden />
            Encaisser maintenant
          </Link>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title="Supprimer cette commande ?"
        description="Suppression définitive."
        confirmLabel="Supprimer définitivement"
        destructive
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <ConfirmDialog
        open={clearDepositOpen}
        title="Remettre l'acompte en attente ?"
        description="Acompte effacé (0 €), commande repassée en attente d’encaissement."
        confirmLabel="Confirmer"
        isLoading={clearingDeposit}
        onConfirm={clearDepositPending}
        onCancel={() => setClearDepositOpen(false)}
      />

      <Modal
        open={readyDialogOpen}
        onClose={() => setReadyDialogOpen(false)}
        title="Passer en à traiter"
        description="Montant reçu. La commande passera en « à traiter »."
        size="sm"
        footer={
          <AdminButton
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={markingReady}
            disabled={toNum(readyDepositInput) <= 0}
            onClick={markReadyWithDeposit}
          >
            Valider
          </AdminButton>
        }
      >
        <AdminInput
          label="Montant acompte reçu (€)"
          name="readyDepositAmount"
          value={readyDepositInput}
          onChange={(e) => setReadyDepositInput(e.target.value)}
          inputMode="decimal"
          placeholder="ex. 25"
          autoFocus
        />
      </Modal>

      <OrderFormModal
        mode="edit"
        order={order}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          setToast({ type: "success", text: "Commande mise à jour." });
          refresh();
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
