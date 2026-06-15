"use client";

import { useState, useTransition } from "react";
import type { OrderStatus } from "@prisma/client";
import { Card } from "@/ui/primitives/Card";
import { SegmentedControl } from "@/ui/primitives/SegmentedControl";
import { ConfirmDialog } from "@/ui/patterns/ConfirmDialog";
import { canTransition, statusLabel } from "@/domain/order-status";
import type { OrderDetailRow } from "@/server/orders/queries";

const EDITABLE_STATUSES = ["PENDING", "READY", "DELIVERED"] as const;
type EditableStatus = (typeof EDITABLE_STATUSES)[number];

const STATUS_OPTIONS = EDITABLE_STATUSES.map((value) => ({
  value,
  label: statusLabel(value),
}));

function isEditableStatus(s: OrderStatus): s is EditableStatus {
  return (EDITABLE_STATUSES as readonly string[]).includes(s);
}

function toTransitionContext(order: OrderDetailRow) {
  const orderTotal = Number(order.total);
  const depositPaidTotal = Number(order.depositPaid);
  const paidTotal = orderTotal - Number(order.due);
  return {
    depositPaidTotal,
    balancePaidTotal: Math.max(0, paidTotal - depositPaidTotal),
    orderTotal,
    hasSale: order.hasSale,
    itemCount: order.items.length,
  };
}

type OrderStatusControlProps = {
  order: OrderDetailRow;
  onStatusChange: (next: OrderStatus) => void;
  onError: (message: string) => void;
};

export function OrderStatusControl({ order, onStatusChange, onError }: OrderStatusControlProps) {
  const [pending, startTransition] = useTransition();
  const [confirmTarget, setConfirmTarget] = useState<EditableStatus | null>(null);

  if (!isEditableStatus(order.status)) {
    return null;
  }

  const ctx = toTransitionContext(order);
  const current = order.status;

  const applyStatus = (next: EditableStatus) => {
    if (next === current) return;

    const guard = canTransition(current, next, ctx);
    if (!guard.ok) {
      onError(guard.reason);
      return;
    }

    if (next === "PENDING" || (current === "DELIVERED" && next === "READY")) {
      setConfirmTarget(next);
      return;
    }

    void patchStatus(next);
  };

  const patchStatus = async (next: EditableStatus) => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        onError(err.error ?? "Impossible de changer le statut.");
        return;
      }
      const json = (await res.json()) as { order: { status: OrderStatus } };
      onStatusChange(json.order.status);
      setConfirmTarget(null);
    });
  };

  const confirmCopy =
    confirmTarget === "PENDING"
      ? {
          title: "Repasser en attente ?",
          description: "La commande sortira de la file « à traiter ».",
          confirmLabel: "Confirmer",
        }
      : confirmTarget === "READY"
        ? {
            title: "Annuler la livraison ?",
            description: "La commande repassera en « à traiter ».",
            confirmLabel: "Corriger",
          }
        : null;

  return (
    <>
      <Card padding={3}>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--admin-text-muted)]">
          Statut
        </p>
        <SegmentedControl
          options={STATUS_OPTIONS}
          value={current}
          onChange={(next) => applyStatus(next)}
          ariaLabel="Changer le statut de la commande"
        />
        {pending ? (
          <p className="mt-2 text-[12px] text-[var(--admin-text-subtle)]">Mise à jour…</p>
        ) : null}
        <p className="mt-2 text-[12px] leading-snug text-[var(--admin-text-subtle)]">
          Pour annuler une commande, utilise « Supprimer la commande » en bas de page.
        </p>
      </Card>

      {confirmTarget && confirmCopy ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setConfirmTarget(null);
          }}
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.confirmLabel}
          tone="primary"
          onConfirm={() => patchStatus(confirmTarget)}
        />
      ) : null}
    </>
  );
}
