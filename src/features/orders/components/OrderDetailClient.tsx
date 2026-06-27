"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Trash2 } from "lucide-react";
import { Stack, HStack } from "@/ui/primitives/Stack";
import { Card } from "@/ui/primitives/Card";
import { Button } from "@/ui/primitives/Button";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { Money } from "@/ui/patterns/Money";
import { ConfirmDialog } from "@/ui/patterns/ConfirmDialog";
import { cn } from "@/lib/utils";
import { useUndo } from "@/app-shell/UndoProvider";
import { ShareButton } from "@/ui/patterns/ShareButton";
import { buildOrderShareText } from "@/lib/share";
import { duplicateOrderAction } from "@/server/orders/actions";
import { OrderDetailHeader } from "./OrderDetailHeader";
import { OrderSummaryCard } from "./OrderSummaryCard";
import { OrderItemsFulfillment } from "./OrderItemsFulfillment";
import { OrderActionsBar } from "./OrderActionsBar";
import { OrderStatusControl } from "./OrderStatusControl";
import { Truck } from "lucide-react";
import { deriveFulfillment, remainingToDeliver, type Fulfillment } from "@/domain/order-status";
import type { OrderDetailRow } from "@/server/orders/queries";
import type { OrderStatus } from "@prisma/client";

function computeMargin(items: OrderDetailRow["items"]): { cost: number; margin: number; marginPct: number } {
  let revenue = 0;
  let cost = 0;
  for (const it of items) {
    const price = Number(it.unitPrice);
    if (Number.isFinite(price)) revenue += price * it.quantity;
    if (it.unitCostDzd !== null && it.exchangeRate !== null) {
      const dzd = Number(it.unitCostDzd);
      const rate = Number(it.exchangeRate);
      if (Number.isFinite(dzd) && Number.isFinite(rate) && rate > 0) {
        cost += (dzd / rate) * it.quantity;
      }
    }
  }
  const margin = revenue - cost;
  const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
  return { cost, margin, marginPct };
}

type OrderDetailClientProps = {
  order: OrderDetailRow;
  /** Slot pour BalancePanel (passe le composant existant). */
  balanceSlot?: React.ReactNode;
};

export function OrderDetailClient({ order, balanceSlot }: OrderDetailClientProps) {
  const router = useRouter();
  const { scheduleDelete } = useUndo();
  const [current, setCurrent] = useState(order);
  const [fulfillment, setFulfillment] = useState<Fulfillment>(() =>
    deriveFulfillment(order.items),
  );
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canDeliver = current.status === "READY" && !current.hasSale;
  const remaining = remainingToDeliver(current.items);
  const deliveredUnits = current.items.reduce((acc, it) => acc + it.deliveredQuantity, 0);
  const totalUnits = current.items.reduce((acc, it) => acc + it.quantity, 0);

  const duplicate = () => {
    startTransition(async () => {
      const res = await duplicateOrderAction(order.id);
      if (!res.ok) {
        setToast({ type: "error", message: res.error });
        return;
      }
      router.push(`/admin/ordres/${res.data.id}`);
      router.refresh();
    });
  };

  const markDelivered = () => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DELIVERED" }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setToast({ type: "error", message: err.error ?? "Impossible de marquer livrée." });
        return;
      }
      setCurrent({ ...current, status: "DELIVERED" });
      setToast({ type: "success", message: "Commande livrée." });
      router.refresh();
    });
  };

  const deleteOrder = async () => {
    // Suppression différée : retour liste immédiat + filet « Annuler » 5 s (shell).
    setConfirmDelete(false);
    router.push("/admin/ordres");
    scheduleDelete({
      message: "Commande supprimée",
      errorMessage: "Suppression échouée.",
      onUndo: () => router.refresh(),
      onCommit: async () => {
        const res = await fetch(`/api/admin/orders/${order.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg =
            (err && typeof err === "object" && "error" in err && typeof err.error === "string"
              ? err.error
              : null) ?? "Suppression échouée.";
          router.refresh();
          throw new Error(msg);
        }
        router.refresh();
      },
    });
  };

  const handleCustomerNameSave = async (next: string) => {
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerName: next }),
    });
    if (!res.ok) {
      setToast({ type: "error", message: "Impossible de modifier le nom." });
      return;
    }
    startTransition(() => {
      setCurrent({ ...current, customerName: next });
      setToast({ type: "success", message: "Nom mis à jour." });
    });
  };

  return (
    <>
      <Stack gap={4}>
        <Link
          href="/admin/ordres"
          className="inline-flex items-center gap-1 text-[13px] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] tap-scale w-fit"
        >
          <ArrowLeft size={14} /> Commandes
        </Link>

        <OrderDetailHeader order={current} onCustomerNameSave={handleCustomerNameSave} />
        <OrderStatusControl
          order={current}
          onStatusChange={(status: OrderStatus) => {
            startTransition(() => {
              setCurrent({ ...current, status });
              setToast({ type: "success", message: "Statut mis à jour." });
            });
          }}
          onError={(message) => setToast({ type: "error", message })}
        />
        <OrderSummaryCard order={current} />

        {(() => {
          const { cost, margin, marginPct } = computeMargin(current.items);
          if (cost <= 0) return null;
          return (
            <Card padding={3} tone="alt">
              <HStack justify="between" align="center">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
                    Marge estimée
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--admin-text-subtle)] tabular-nums">
                    Coût : <Money value={cost} compact />
                  </p>
                </div>
                <div className="text-right">
                  <Money value={margin} bold tone="auto" className="text-[18px]" />
                  <p className="mt-0.5 text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
                    {marginPct.toFixed(0)}%
                  </p>
                </div>
              </HStack>
            </Card>
          );
        })()}

        {balanceSlot}

        {current.notes ? (
          <Card padding={3}>
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
              Notes
            </p>
            <p className="mt-1.5 whitespace-pre-line text-[14px] text-[var(--admin-text)]">
              {current.notes}
            </p>
          </Card>
        ) : null}

        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--admin-text-muted)]">
              Articles ({current.items.length})
            </h3>
            {totalUnits > 0 && current.status !== "CANCELLED" ? (
              <span
                className={cn(
                  "text-[11px] font-semibold tabular-nums",
                  fulfillment === "full"
                    ? "text-[var(--admin-success)]"
                    : fulfillment === "partial"
                      ? "text-[var(--admin-warning)]"
                      : "text-[var(--admin-text-subtle)]",
                )}
              >
                Livré {deliveredUnits}/{totalUnits}
                {remaining > 0 && fulfillment !== "none"
                  ? ` · reste ${remaining} article${remaining > 1 ? "s" : ""}`
                  : ""}
              </span>
            ) : null}
          </div>
          <OrderItemsFulfillment
            orderId={current.id}
            items={current.items}
            editable={canDeliver}
            onFulfillmentChange={(next, items) => {
              setFulfillment(next);
              setCurrent((c) => ({ ...c, items }));
            }}
            onError={(message) => setToast({ type: "error", message })}
          />
          {canDeliver && fulfillment === "full" ? (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="mt-3"
              disabled={pending}
              leadingIcon={<Truck size={16} />}
              onClick={markDelivered}
            >
              Tout est livré — marquer livrée
            </Button>
          ) : null}
        </div>

        <OrderActionsBar order={current} />

        <ShareButton
          fullWidth
          label="Partager le récap au client"
          title="Récap commande"
          text={buildOrderShareText({
            customerName: current.customerName,
            total: current.total,
            depositPaid: current.depositPaid,
            due: current.due,
            deliveryAt: current.deliveryAt,
            items: current.items.map((it) => ({
              name: it.snapshot.name,
              brandName: it.snapshot.brandName,
              quantity: it.quantity,
              volumeMl: it.volumeMl,
              unitPrice: it.unitPrice,
              isGift: it.isGift,
            })),
          })}
          onFeedback={(message, type) => setToast({ type, message })}
        />

        <Button
          variant="secondary"
          size="md"
          fullWidth
          disabled={pending}
          leadingIcon={<Copy size={14} />}
          onClick={duplicate}
        >
          Dupliquer (réassort)
        </Button>

        {!current.hasSale ? (
          <Button
            variant="ghost"
            size="md"
            fullWidth
            leadingIcon={<Trash2 size={14} />}
            onClick={() => setConfirmDelete(true)}
          >
            Supprimer la commande
          </Button>
        ) : null}
      </Stack>

      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Supprimer cette commande ?"
        description={current.customerName ?? undefined}
        confirmLabel="Supprimer"
        onConfirm={deleteOrder}
      />
    </>
  );
}
