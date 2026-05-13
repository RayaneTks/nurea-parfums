"use client";

import { useCallback, useEffect, useState } from "react";
import { Sheet } from "@/ui/primitives/Sheet";
import { Button } from "@/ui/primitives/Button";
import { Stack, HStack } from "@/ui/primitives/Stack";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { Skeleton } from "@/ui/primitives/Skeleton";
import { TicketHeader } from "./TicketHeader";
import { TicketTotals } from "./TicketTotals";
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
  const r = await fetch(`/api/admin/sales/${id}`, { credentials: "include", cache: "no-store" });
  if (!r.ok) return null;
  const json = (await r.json()) as { sale?: SaleDetailRow };
  return json.sale ?? null;
}

export function TicketSheet({ saleId, open, onOpenChange, onSaved }: TicketSheetProps) {
  const [sale, setSale] = useState<SaleDetailRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !saleId) return;
    setLoading(true);
    void fetchSale(saleId).then((s) => {
      setSale(s);
      setLoading(false);
    });
  }, [saleId, open]);

  // Init edit state hook avec default vide ; sera reset à la donnée serveur.
  const ticket = useTicketEdit({
    id: "",
    customerId: null,
    customerName: "",
    soldAt: new Date().toISOString(),
    totalRevenue: "0",
    totalCost: "0",
    totalMargin: "0",
    itemCount: 0,
    orderId: null,
    notes: null,
    items: [],
  });

  useEffect(() => {
    if (sale) {
      ticket.reset({
        customerId: sale.customerId,
        customerName: sale.customerName ?? "",
        notes: sale.notes ?? "",
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
    },
    [sale, onSaved],
  );

  const saveAll = useCallback(async () => {
    if (!sale) return;
    setSaving(true);
    try {
      const payload = {
        customerId: ticket.draft.customerId,
        customerName: ticket.draft.customerName,
        notes: ticket.draft.notes || null,
        items: ticket.draft.lines.map((l) => ({
          perfumeId: l.perfumeId,
          perfumeSnapshot: l.perfumeId === null ? l.snapshot : undefined,
          quantity: l.quantity,
          volumeMl: l.volumeMl ?? 100,
          unitPrice: l.unitPrice.replace(",", "."),
          unitCostDzd: l.unitCostDzd === "" ? "0" : l.unitCostDzd.replace(",", "."),
          exchangeRate: l.exchangeRate === "" ? "0" : l.exchangeRate.replace(",", "."),
        })),
      };
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
      setToast({ type: "success", message: "Vente mise à jour." });
      ticket.exitEdit();
      onSaved();
      // Refetch
      const refreshed = await fetchSale(sale.id);
      if (refreshed) setSale(refreshed);
    } finally {
      setSaving(false);
    }
  }, [sale, ticket, onSaved]);

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
      <Button variant="primary" size="lg" fullWidth onClick={() => ticket.enterEdit()}>
        Modifier
      </Button>
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
        description={loading || !sale ? "Chargement…" : undefined}
        footer={sale ? footer : undefined}
        dismissible={ticket.mode === "view" || !ticket.isDirty}
      >
        {loading || !sale ? (
          <Stack gap={3}>
            <Skeleton height={56} />
            <Skeleton height={72} />
            <Skeleton height={72} />
          </Stack>
        ) : (
          <Stack gap={3}>
            <TicketHeader
              customerName={ticket.draft.customerName}
              customerId={ticket.draft.customerId}
              soldAt={sale.soldAt}
              orderId={sale.orderId}
              mode={ticket.mode}
              onCustomerNameSave={async (next) => {
                ticket.setCustomerName(next);
                if (ticket.mode === "view") {
                  await saveCustomerName(next);
                }
              }}
            />
            <TicketTotals sale={sale} />
            <TicketItemsList
              lines={ticket.draft.lines}
              mode={ticket.mode}
              onPatch={ticket.patchLine}
              onQuantityDelta={ticket.quantityDelta}
              onRemove={ticket.removeLine}
            />
          </Stack>
        )}
      </Sheet>
      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}
