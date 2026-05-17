"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Stack, HStack } from "@/ui/primitives/Stack";
import { Card } from "@/ui/primitives/Card";
import { Button } from "@/ui/primitives/Button";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { Money } from "@/ui/patterns/Money";
import { ConfirmDialog } from "@/ui/patterns/ConfirmDialog";
import { OrderDetailHeader } from "./OrderDetailHeader";
import { OrderSummaryCard } from "./OrderSummaryCard";
import { OrderItemsList } from "./OrderItemsList";
import { OrderActionsBar } from "./OrderActionsBar";
import type { OrderDetailRow } from "@/server/orders/queries";

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
  const [current, setCurrent] = useState(order);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [_pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteOrder = async () => {
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
      setToast({ type: "error", message: msg });
      return;
    }
    setConfirmDelete(false);
    router.push("/admin/ordres");
    router.refresh();
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
                  <Money value={margin} bold tone="success" className="text-[18px]" />
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
          <h3 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--admin-text-muted)]">
            Articles ({current.items.length})
          </h3>
          <OrderItemsList items={current.items} />
        </div>

        <OrderActionsBar order={current} />

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
