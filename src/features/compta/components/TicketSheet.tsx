"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, AlertCircle } from "lucide-react";
import { Sheet } from "@/ui/primitives/Sheet";
import { ShareButton } from "@/ui/patterns/ShareButton";
import { buildSaleShareText } from "@/lib/share";
import { Button } from "@/ui/primitives/Button";
import { Stack, HStack } from "@/ui/primitives/Stack";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { Skeleton } from "@/ui/primitives/Skeleton";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { ConfirmDialog } from "@/ui/patterns/ConfirmDialog";
import { TicketHeader } from "./TicketHeader";
import { TicketTotals } from "./TicketTotals";
import { TicketPayment } from "./TicketPayment";
import { TicketBatchPicker } from "./TicketBatchPicker";
import { TicketItemsList } from "./TicketItemsList";
import { useTicketEdit } from "../hooks/useTicketEdit";
import type { SaleDetailRow } from "@/server/sales/queries";

type TicketSheetProps = {
  saleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

async function fetchSale(id: string): Promise<SaleDetailRow | null> {
  try {
    const r = await fetch(`/api/admin/sales/${id}`, { credentials: "include", cache: "no-store" });
    if (!r.ok) return null;
    const json = (await r.json()) as { sale?: SaleDetailRow };
    return json.sale ?? null;
  } catch (err) {
    console.error("[TicketSheet.fetchSale]", err);
    return null;
  }
}

export function TicketSheet({ saleId, open, onOpenChange, onSaved }: TicketSheetProps) {
  const [sale, setSale] = useState<SaleDetailRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open || !saleId) return;
    setLoading(true);
    setLoadError(null);
    void fetchSale(saleId).then((s) => {
      setSale(s);
      if (!s) setLoadError("Vente introuvable ou accès refusé.");
      setLoading(false);
    });
  }, [saleId, open]);

  // Init edit state hook avec default vide ; sera reset à la donnée serveur.
  const ticket = useTicketEdit({
    id: "",
    customerId: null,
    customerName: "",
    customerContact: null,
    soldAt: new Date().toISOString(),
    totalRevenue: "0",
    totalCost: "0",
    totalMargin: "0",
    remainingDue: "0",
    itemCount: 0,
    orderId: null,
    batchId: null,
    batchName: null,
    batch: null,
    notes: null,
    items: [],
  });

  useEffect(() => {
    if (sale) {
      ticket.reset({
        customerId: sale.customerId,
        customerName: sale.customerName ?? "",
        customerContact: sale.customerContact ?? "",
        notes: sale.notes ?? "",
        remainingDue: sale.remainingDue ?? "0",
        lines: sale.items.map((it) => ({
          key: `id:${it.id}`,
          perfumeId: it.perfumeId,
          snapshot: {
            name: it.snapshot.name,
            brandName: it.snapshot.brandName,
            image: it.snapshot.image ?? null,
          },
          quantity: it.quantity,
          volumeMl:
            it.volumeMl === 30 || it.volumeMl === 50 || it.volumeMl === 100
              ? (it.volumeMl as 30 | 50 | 100)
              : 100,
          unitPrice: it.unitPrice,
          unitCostDzd: it.unitCostDzd ?? "",
          exchangeRate: it.exchangeRate ?? "277",
        })),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale]);

  const saveCustomerName = useCallback(
    async (next: string) => {
      if (!sale) return;
      try {
        const res = await fetch(`/api/admin/sales/${sale.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerName: next }),
        });
        if (!res.ok) {
          setToast({ type: "error", message: "Impossible de modifier le nom." });
          return;
        }
        setSale((s) => (s ? { ...s, customerName: next } : s));
        setToast({ type: "success", message: "Nom mis à jour." });
        onSaved();
      } catch (err) {
        console.error("[TicketSheet.saveCustomerName]", err);
        setToast({ type: "error", message: "Erreur réseau." });
      }
    },
    [sale, onSaved],
  );

  const saveAll = useCallback(async () => {
    if (!sale) return;
    setSaving(true);
    try {
      const items = ticket.draft.lines
        .filter((l) => l.key.startsWith("id:"))
        .map((l) => ({
          id: l.key.slice(3),
          quantity: l.quantity,
          volumeMl: l.volumeMl ?? 100,
          unitPrice: l.unitPrice.replace(",", "."),
          unitCostDzd: l.unitCostDzd === "" ? null : l.unitCostDzd.replace(",", "."),
          exchangeRate: l.exchangeRate === "" ? null : l.exchangeRate.replace(",", "."),
        }));
      const payload: Record<string, unknown> = {
        notes: ticket.draft.notes || null,
        items,
      };
      if (ticket.draft.customerId !== sale.customerId) {
        payload.customerId = ticket.draft.customerId;
      }
      if (ticket.draft.customerName !== (sale.customerName ?? "")) {
        payload.customerName = ticket.draft.customerName;
      }
      if (ticket.draft.customerContact !== (sale.customerContact ?? "")) {
        payload.customerContact = ticket.draft.customerContact;
      }
      if (ticket.draft.remainingDue !== (sale.remainingDue ?? "0")) {
        payload.remainingDue = ticket.draft.remainingDue.replace(",", ".");
      }
      const res = await fetch(`/api/admin/sales/${sale.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg =
          (err && typeof err === "object" && "error" in err && typeof err.error === "string"
            ? err.error
            : null) ?? "Enregistrement échoué.";
        setToast({ type: "error", message: msg });
        return;
      }
      const json = (await res.json().catch(() => ({}))) as { sale?: SaleDetailRow };
      if (json.sale) setSale(json.sale);
      setToast({ type: "success", message: "Vente mise à jour." });
      ticket.exitEdit();
      onSaved();
    } catch (err) {
      console.error("[TicketSheet.saveAll]", err);
      setToast({ type: "error", message: "Erreur réseau." });
    } finally {
      setSaving(false);
    }
  }, [sale, ticket, onSaved]);

  const deleteSale = useCallback(async () => {
    if (!sale) return;
    const res = await fetch(`/api/admin/sales/${sale.id}`, {
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
    setToast({ type: "success", message: "Vente supprimée." });
    onSaved();
    onOpenChange(false);
  }, [sale, onSaved, onOpenChange]);

  const tryClose = useCallback(() => {
    if (ticket.mode === "edit" && ticket.isDirty) {
      const ok = window.confirm("Modifications non enregistrées. Fermer quand même ?");
      if (!ok) return;
      ticket.exitEdit();
    }
    onOpenChange(false);
  }, [ticket, onOpenChange]);

  const footer =
    ticket.mode === "view" ? (
      <HStack gap={2}>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => setConfirmDelete(true)}
          aria-label="Supprimer la vente"
          leadingIcon={<Trash2 size={16} />}
          className="text-[var(--admin-danger)] border-[var(--admin-danger)] hover:bg-[var(--admin-danger-bg)]"
        >
          Supprimer
        </Button>
        <Button variant="primary" size="lg" fullWidth onClick={() => ticket.enterEdit()}>
          Modifier
        </Button>
      </HStack>
    ) : (
      <HStack gap={2}>
        <Button variant="ghost" size="lg" fullWidth onClick={() => ticket.exitEdit()}>
          Annuler
        </Button>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          isLoading={saving}
          disabled={!ticket.isDirty}
          onClick={() => void saveAll()}
        >
          Enregistrer
        </Button>
      </HStack>
    );

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(o) => (o ? onOpenChange(true) : tryClose())}
        title={loading || !sale ? "Vente" : ticket.draft.customerName || "Vente"}
        description={loading ? "Chargement…" : loadError ?? undefined}
        footer={sale ? footer : undefined}
        dismissible={ticket.mode === "view" || !ticket.isDirty}
      >
        {loading ? (
          <Stack gap={3}>
            <Skeleton height={56} />
            <Skeleton height={72} />
            <Skeleton height={72} />
          </Stack>
        ) : loadError || !sale ? (
          <EmptyState
            icon={AlertCircle}
            title="Vente inaccessible"
            description={loadError ?? "Impossible d'afficher ce ticket."}
            action={
              <Button variant="secondary" size="md" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
            }
          />
        ) : (
          <Stack gap={3}>
            <TicketHeader
              customerName={ticket.draft.customerName}
              customerContact={ticket.draft.customerContact}
              soldAt={sale.soldAt}
              orderId={sale.orderId}
              mode={ticket.mode}
              onCustomerNameSave={async (next) => {
                ticket.setCustomerName(next);
                if (ticket.mode === "view") {
                  await saveCustomerName(next);
                }
              }}
              onCustomerContactChange={ticket.setCustomerContact}
            />
            <TicketTotals sale={sale} />
            {ticket.mode === "view" ? (
              <ShareButton
                fullWidth
                label="Partager le reçu au client"
                title="Reçu de vente"
                text={buildSaleShareText({
                  customerName: ticket.draft.customerName,
                  soldAt: sale.soldAt,
                  total: sale.totalRevenue,
                  items: sale.items.map((it) => ({
                    name: it.snapshot.name,
                    brandName: it.snapshot.brandName,
                    quantity: it.quantity,
                    volumeMl: it.volumeMl ?? 100,
                    unitPrice: it.unitPrice,
                  })),
                })}
                onFeedback={(message, type) => setToast({ type, message })}
              />
            ) : null}
            <TicketBatchPicker
              saleId={sale.id}
              current={sale.batch}
              onAssigned={(next) => {
                setSale((s) =>
                  s
                    ? {
                        ...s,
                        batch: next
                          ? { id: next.id, name: next.name, status: "OPEN" }
                          : null,
                        batchId: next?.id ?? null,
                        batchName: next?.name ?? null,
                      }
                    : s,
                );
                setToast({
                  type: "success",
                  message: next ? "Assigné au lot." : "Retiré du lot.",
                });
                onSaved();
              }}
              onError={(message) => setToast({ type: "error", message })}
            />
            <TicketPayment
              total={Number(sale.totalRevenue)}
              remainingDue={ticket.draft.remainingDue}
              mode={ticket.mode}
              onChange={ticket.setRemainingDue}
            />
            <TicketItemsList
              lines={ticket.draft.lines}
              mode={ticket.mode}
              onPatch={ticket.patchLine}
              onQuantityDelta={ticket.quantityDelta}
              onRemove={ticket.removeLine}
              onAdd={ticket.addLine}
            />
          </Stack>
        )}
      </Sheet>
      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Supprimer cette vente ?"
        description={
          sale
            ? `${sale.customerName ?? "Vente"} · ${sale.itemCount} article${sale.itemCount > 1 ? "s" : ""}`
            : undefined
        }
        confirmLabel="Supprimer"
        nested
        onConfirm={deleteSale}
      />
    </>
  );
}
