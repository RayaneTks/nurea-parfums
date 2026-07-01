"use client";

import { useState, useTransition } from "react";
import type { OrderStatus } from "@prisma/client";
import { Card } from "@/ui/primitives/Card";
import { Button } from "@/ui/primitives/Button";
import { Sheet } from "@/ui/primitives/Sheet";
import { Stack } from "@/ui/primitives/Stack";
import { SegmentedControl } from "@/ui/primitives/SegmentedControl";
import { ConfirmDialog } from "@/ui/patterns/ConfirmDialog";
import { Money } from "@/ui/patterns/Money";
import { PocketSelector } from "@/features/treasury/components/PocketSelector";
import { usePockets } from "@/features/treasury/usePockets";
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

/** Coût de revient total (€) dérivé des lignes (DZD ÷ taux × quantité). */
function orderCost(items: OrderDetailRow["items"]): number {
  let cost = 0;
  for (const it of items) {
    if (it.unitCostDzd !== null && it.exchangeRate !== null) {
      const dzd = Number(it.unitCostDzd);
      const rate = Number(it.exchangeRate);
      if (Number.isFinite(dzd) && Number.isFinite(rate) && rate > 0) {
        cost += (dzd / rate) * it.quantity;
      }
    }
  }
  return cost;
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
  // Cible en attente de choix de poche pour l'achat (passage réel de la commande).
  const [costTarget, setCostTarget] = useState<EditableStatus | null>(null);
  const [costPocketId, setCostPocketId] = useState<string | null>(null);
  const { pockets } = usePockets(costTarget !== null);

  if (!isEditableStatus(order.status)) {
    return null;
  }

  const ctx = toTransitionContext(order);
  const current = order.status;
  const cost = orderCost(order.items);

  const applyStatus = (next: EditableStatus) => {
    if (next === current) return;

    const guard = canTransition(current, next, ctx);
    if (!guard.ok) {
      onError(guard.reason);
      return;
    }

    // La commande devient RÉELLE (PENDING → À traiter/Livrée) : on paie le stock.
    // Si un coût est renseigné, on demande d'où sort l'argent (trésorerie).
    if (current === "PENDING" && (next === "READY" || next === "DELIVERED") && cost > 0.005) {
      setCostPocketId(null);
      setCostTarget(next);
      return;
    }

    if (next === "PENDING" || (current === "DELIVERED" && next === "READY")) {
      setConfirmTarget(next);
      return;
    }

    void patchStatus(next);
  };

  const patchStatus = async (next: EditableStatus, pocketId?: string | null) => {
    startTransition(async () => {
      const body: Record<string, unknown> = { status: next };
      if (pocketId !== undefined) body.costPocketId = pocketId;
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        onError(err.error ?? "Impossible de changer le statut.");
        return;
      }
      const json = (await res.json()) as { order: { status: OrderStatus } };
      onStatusChange(json.order.status);
      setConfirmTarget(null);
      setCostTarget(null);
    });
  };

  const confirmCopy =
    confirmTarget === "PENDING"
      ? {
          title: "Repasser en attente ?",
          description: "La commande sortira de la file « à traiter » et son coût sera réintégré en trésorerie.",
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

      {/* Achat du stock : d'où sort l'argent (coût de revient → trésorerie). */}
      <Sheet
        open={costTarget !== null}
        onOpenChange={(o) => (o ? null : setCostTarget(null))}
        title="Achat du stock"
        description="La commande devient réelle : tu paies le stock. D'où sort l'argent ?"
        footer={
          <Button
            variant="primary"
            size="lg"
            fullWidth
            isLoading={pending}
            onClick={() => costTarget && patchStatus(costTarget, costPocketId)}
          >
            C&apos;est payé — passer en «&nbsp;{costTarget ? statusLabel(costTarget).toLowerCase() : ""}&nbsp;»
          </Button>
        }
      >
        <Stack gap={3}>
          <div
            className="rounded-[14px] p-3"
            style={{ background: "var(--admin-surface-alt)" }}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
              Coût d&apos;achat (sortie de trésorerie)
            </p>
            <p className="mt-1 text-[24px] font-bold leading-none">
              <Money value={cost} />
            </p>
          </div>
          {pockets.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-[var(--admin-text-muted)]">
                Payé depuis (poche)
              </p>
              <PocketSelector pockets={pockets} value={costPocketId} onChange={setCostPocketId} />
              <p className="mt-1 text-[11px] text-[var(--admin-text-subtle)]">
                Sans choix → « Non attribué », à répartir plus tard.
              </p>
            </div>
          ) : (
            <p className="text-[12px] text-[var(--admin-text-subtle)]">
              Crée une poche (Espèces, Revolut, Fournisseur…) dans Trésorerie pour tracer d&apos;où
              sort l&apos;argent. Sans poche, la sortie ira dans « Non attribué ».
            </p>
          )}
        </Stack>
      </Sheet>
    </>
  );
}
