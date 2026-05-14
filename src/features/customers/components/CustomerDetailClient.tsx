"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Stack } from "@/ui/primitives/Stack";
import { Card } from "@/ui/primitives/Card";
import { Button } from "@/ui/primitives/Button";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { CustomerHeader } from "./CustomerHeader";
import { CustomerKpiRow } from "./CustomerKpiRow";
import { CustomerOrdersHistory } from "./CustomerOrdersHistory";
import { updateCustomerAction } from "@/server/customers/actions";
import type { CustomerDetail } from "@/server/customers/queries";
import type { OrderStatus } from "@prisma/client";

type CustomerDetailClientProps = {
  customer: CustomerDetail;
  orders: Array<{
    id: string;
    orderedAt: string;
    total: string;
    status: OrderStatus;
  }>;
};

export function CustomerDetailClient({ customer, orders }: CustomerDetailClientProps) {
  const [current, setCurrent] = useState(customer);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [_pending, startTransition] = useTransition();

  const handleNameSave = async (next: string) => {
    const result = await updateCustomerAction(current.id, { fullName: next });
    if (!result.ok) {
      setToast({ type: "error", message: result.error });
      return;
    }
    startTransition(() => {
      setCurrent({ ...current, fullName: next });
      setToast({ type: "success", message: "Nom mis à jour." });
    });
  };

  return (
    <>
      <Stack gap={4}>
        <CustomerHeader customer={current} onNameSave={handleNameSave} />
        <CustomerKpiRow customer={current} />

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
            Historique commandes ({orders.length})
          </h3>
          <CustomerOrdersHistory orders={orders} />
        </div>

        <Link href={`/admin/clients/${current.id}/edit`}>
          <Button variant="secondary" size="lg" fullWidth leadingIcon={<Pencil size={16} />}>
            Modifier la fiche
          </Button>
        </Link>
      </Stack>

      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}
