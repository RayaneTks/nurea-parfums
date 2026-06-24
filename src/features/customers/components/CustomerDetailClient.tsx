"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Pencil, Phone, Trash2 } from "lucide-react";
import { Stack } from "@/ui/primitives/Stack";
import { Card } from "@/ui/primitives/Card";
import { Button } from "@/ui/primitives/Button";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { ConfirmDialog } from "@/ui/patterns/ConfirmDialog";
import { CustomerHeader } from "./CustomerHeader";
import { CustomerKpiRow } from "./CustomerKpiRow";
import { CustomerOrdersHistory } from "./CustomerOrdersHistory";
import { updateCustomerAction } from "@/server/customers/actions";
import { useUndo } from "@/app-shell/UndoProvider";
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
  const router = useRouter();
  const { scheduleDelete } = useUndo();
  const [current, setCurrent] = useState(customer);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [_pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteCustomer = async () => {
    // Suppression différée : retour liste immédiat + filet « Annuler » 5 s (shell).
    setConfirmDelete(false);
    const id = current.id;
    router.push("/admin/clients");
    scheduleDelete({
      message: "Client supprimé",
      errorMessage: "Suppression échouée.",
      onUndo: () => router.refresh(),
      onCommit: async () => {
        const res = await fetch(`/api/admin/customers/${id}`, {
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

        {(current.phoneE164 ?? current.whatsappE164 ?? current.snapchat) ? (
          <div className="flex flex-wrap gap-2">
            {current.phoneE164 ? (
              <a
                href={`tel:${current.phoneE164}`}
                className="inline-flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[14px] font-medium tap-scale"
                style={{
                  background: "var(--admin-success-bg)",
                  color: "var(--admin-success)",
                  border: "1px solid color-mix(in srgb, var(--admin-success) 25%, transparent)",
                }}
              >
                <Phone size={15} aria-hidden /> Appeler
              </a>
            ) : null}
            {current.whatsappE164 ? (
              <a
                href={`https://wa.me/${current.whatsappE164.replace(/^\+/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[14px] font-medium tap-scale"
                style={{
                  background: "var(--admin-success-bg)",
                  color: "var(--admin-success)",
                  border: "1px solid color-mix(in srgb, var(--admin-success) 25%, transparent)",
                }}
              >
                <MessageCircle size={15} aria-hidden /> WhatsApp
              </a>
            ) : null}
            {current.snapchat ? (
              <a
                href={`https://www.snapchat.com/add/${current.snapchat}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[14px] font-medium tap-scale"
                style={{
                  background: "var(--admin-warning-bg)",
                  color: "var(--admin-warning)",
                  border: "1px solid color-mix(in srgb, var(--admin-warning) 25%, transparent)",
                }}
              >
                <span className="text-[13px] leading-none font-bold">👻</span> Snap
              </a>
            ) : null}
          </div>
        ) : null}

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

        <Button
          variant="ghost"
          size="md"
          fullWidth
          leadingIcon={<Trash2 size={14} />}
          onClick={() => setConfirmDelete(true)}
        >
          Supprimer le client
        </Button>
      </Stack>

      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Supprimer ce client ?"
        description={`${current.fullName} et son historique seront supprimés.`}
        confirmLabel="Supprimer"
        onConfirm={deleteCustomer}
      />
    </>
  );
}
