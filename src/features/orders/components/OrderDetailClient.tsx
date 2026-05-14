"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Stack } from "@/ui/primitives/Stack";
import { Card } from "@/ui/primitives/Card";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { OrderDetailHeader } from "./OrderDetailHeader";
import { OrderSummaryCard } from "./OrderSummaryCard";
import { OrderItemsList } from "./OrderItemsList";
import { OrderActionsBar } from "./OrderActionsBar";
import type { OrderDetailRow } from "@/server/orders/queries";

type OrderDetailClientProps = {
  order: OrderDetailRow;
  /** Slot pour BalancePanel (passe le composant existant). */
  balanceSlot?: React.ReactNode;
};

export function OrderDetailClient({ order, balanceSlot }: OrderDetailClientProps) {
  const [current, setCurrent] = useState(order);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [_pending, startTransition] = useTransition();

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
      </Stack>

      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}
