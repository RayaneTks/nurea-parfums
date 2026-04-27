"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Minus, Plus, Trash2, AlertCircle } from "lucide-react";
import { SectionCard } from "../ui/SectionCard";
import { AdminButton } from "../ui/AdminButton";
import { AdminInput } from "../ui/AdminInput";
import { Modal } from "../ui/Modal";
import { cn } from "@/lib/utils";
import { nureaAdminThumbLoader } from "@/lib/image/cappedImageLoader";
import { ORDER_VOLUMES_ML, isValidVolumeMl } from "@/lib/gestion/orderLineValidation";
import type { OrderItemRow, OrderRow, PerfumePickerRow } from "@/lib/gestion/types";

const PerfumePicker = dynamic(
  () => import("./PerfumePicker").then((mod) => mod.PerfumePicker),
  { ssr: false },
);

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function toNum(v: string): number {
  const n = Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

export type OrderFormLine = {
  perfume: PerfumePickerRow;
  quantity: number;
  volumeMl: (typeof ORDER_VOLUMES_ML)[number];
  unitPrice: string;
  unitCost: string;
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function orderItemToLine(item: OrderItemRow): OrderFormLine | null {
  if (!item.perfume) return null;
  const vol = item.volumeMl;
  const volumeMl: (typeof ORDER_VOLUMES_ML)[number] = isValidVolumeMl(vol) ? vol : 100;
  return {
    perfume: {
      id: item.perfumeId,
      name: item.perfume.name,
      image: item.perfume.image,
      status: "PUBLISHED",
      brand: item.perfume.brand,
    },
    quantity: item.quantity,
    volumeMl,
    unitPrice: item.unitPrice,
    unitCost: item.unitCost,
  };
}

type OrderFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
  mode: "create" | "edit";
  /** Obligatoire si mode === "edit" */
  order?: OrderRow | null;
};

export function OrderFormModal({
  open,
  onClose,
  onSuccess,
  onError,
  mode,
  order,
}: OrderFormModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [deliveryAt, setDeliveryAt] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderFormLine[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [depositPaid, setDepositPaid] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");

  const resetEmpty = useCallback(() => {
    setCustomerName("");
    setDeliveryAt("");
    setNotes("");
    setItems([]);
    setSaving(false);
    setDepositPaid(false);
    setDepositAmount("");
  }, []);

  useEffect(() => {
    if (!open) {
      resetEmpty();
      return;
    }
    if (mode === "create") {
      resetEmpty();
    }
  }, [open, mode, resetEmpty]);

  useEffect(() => {
    if (!open || mode !== "edit" || !order) return;
    setCustomerName(order.customerName?.trim() || "");
    setDeliveryAt(toDatetimeLocal(order.deliveryAt));
    setNotes(order.notes?.trim() || "");
    const lines: OrderFormLine[] = [];
    for (const it of order.items) {
      const line = orderItemToLine(it);
      if (line) lines.push(line);
    }
    setItems(lines);
    setDepositPaid(order.depositPaid);
    const da = order.depositAmount?.trim() || "";
    const num = Number(String(da).replace(",", "."));
    setDepositAmount(order.depositPaid && num > 0 ? da.replace(".", ",") : "");
    setSaving(false);
  }, [open, mode, order]);

  const orderTotal = useMemo(
    () => items.reduce((s, it) => s + toNum(it.unitPrice) * it.quantity, 0),
    [items],
  );

  const addPerfume = (p: PerfumePickerRow) => {
    setItems((prev) => {
      if (prev.some((it) => it.perfume.id === p.id)) return prev;
      return [
        ...prev,
        { perfume: p, quantity: 1, volumeMl: 100, unitPrice: "", unitCost: "" },
      ];
    });
  };

  const patchItem = (id: number, patch: Partial<OrderFormLine>) => {
    setItems((prev) => prev.map((it) => (it.perfume.id === id ? { ...it, ...patch } : it)));
  };

  const updateQty = (id: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) =>
          it.perfume.id === id
            ? { ...it, quantity: Math.max(1, it.quantity + delta) }
            : it,
        )
        .filter((it) => it.quantity > 0),
    );
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((it) => it.perfume.id !== id));
  };

  const canSubmit = useMemo(() => {
    if (saving) return false;
    if (customerName.trim().length < 2) return false;
    if (items.length === 0) return false;
    for (const it of items) {
      if (toNum(it.unitPrice) < 0 || toNum(it.unitCost) < 0) return false;
    }
    if (depositPaid && toNum(depositAmount) <= 0) return false;
    return true;
  }, [items, saving, customerName, depositPaid, depositAmount]);

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        deliveryAt: deliveryAt ? new Date(deliveryAt).toISOString() : null,
        notes: notes.trim() || null,
        depositPaid,
        depositAmount: toNum(depositAmount),
        items: items.map((i) => ({
          perfumeId: i.perfume.id,
          quantity: i.quantity,
          volumeMl: i.volumeMl,
          unitPrice: toNum(i.unitPrice),
          unitCost: toNum(i.unitCost),
        })),
      };

      if (mode === "create") {
        const r = await fetch("/api/admin/orders", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const j = await readJsonSafe<{ error?: string }>(r);
          throw new Error(j?.error ?? "Création impossible.");
        }
      } else {
        if (!order?.id) throw new Error("Commande manquante.");
        const r = await fetch(`/api/admin/orders/${order.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const j = await readJsonSafe<{ error?: string }>(r);
          throw new Error(j?.error ?? "Enregistrement impossible.");
        }
      }
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "create" ? "Nouvelle commande" : "Modifier la commande";
  const submitLabel = mode === "create" ? "Créer la commande" : "Enregistrer les modifications";

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={title}
        size="md"
        footer={
          <AdminButton
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={saving}
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            {submitLabel}
          </AdminButton>
        }
      >
        <div className="max-h-[min(70dvh,540px)] space-y-5 overflow-y-auto pr-0.5">
          <AdminInput
            label="Client"
            name="customerName"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nom"
          />

          <AdminInput
            label="Livraison"
            name="deliveryAt"
            type="datetime-local"
            value={deliveryAt}
            onChange={(e) => setDeliveryAt(e.target.value)}
          />

          <SectionCard className="space-y-3 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-admin-muted">Acompte</p>
            {mode === "edit" && order?.status === "PENDING" ? (
              <p className="text-[11px] leading-snug text-admin-muted">
                Acompte + passage en « à traiter » : bouton sur la fiche. Ici : client, panier, corrections.
              </p>
            ) : null}
            <label className="flex items-center gap-2 text-[14px] text-admin-text">
              <input
                type="checkbox"
                checked={depositPaid}
                onChange={(e) => setDepositPaid(e.target.checked)}
                className="h-4 w-4 rounded border-admin-border"
              />
              Acompte encaissé
            </label>
            <AdminInput
              label="Montant acompte (€)"
              name="depositAmount"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              inputMode="decimal"
              placeholder={depositPaid ? "ex. 25" : "— si non payé"}
              hint={
                mode === "edit" && order?.status === "PENDING"
                  ? "Obligatoire si coché. Premier encaissement : depuis la fiche."
                  : depositPaid
                    ? "Obligatoire si coché (> 0 €)."
                    : "Saisir seulement si encaissé."
              }
            />
          </SectionCard>

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider font-medium text-admin-muted">
              Parfums ({items.length})
            </p>
            <div className="flex flex-col gap-2">
              {items.map((it) => (
                <SectionCard key={it.perfume.id} className="space-y-3 p-3">
                  <div className="flex items-start gap-3">
                    <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-xl border border-admin-border bg-admin-bg">
                      <Image
                        loader={nureaAdminThumbLoader}
                        src={it.perfume.image}
                        alt={it.perfume.name}
                        fill
                        className="object-cover"
                        sizes="36px"
                        quality={60}
                        fetchPriority="low"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-[14px] leading-tight tracking-[-0.01em] text-admin-text">
                        {it.perfume.name}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-admin-subtle">
                        {it.perfume.brand.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(it.perfume.id)}
                      aria-label="Retirer"
                      className="h-9 w-9 shrink-0 text-admin-subtle tap-scale [@media(hover:hover)]:hover:text-admin-danger"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[10px] uppercase tracking-wider text-admin-subtle">Volume</p>
                    <div className="flex gap-1">
                      {ORDER_VOLUMES_ML.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => patchItem(it.perfume.id, { volumeMl: v })}
                          className={cn(
                            "flex-1 rounded-lg py-1.5 text-center text-[12px] font-semibold",
                            it.volumeMl === v
                              ? "bg-admin-accent text-white"
                              : "bg-admin-bg text-admin-muted border border-admin-border",
                          )}
                        >
                          {v} ml
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-admin-subtle">Qté</p>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => updateQty(it.perfume.id, -1)}
                          className="h-9 w-8 rounded-lg border border-admin-border"
                        >
                          <Minus className="mx-auto h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-[15px] tabular-nums">{it.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(it.perfume.id, 1)}
                          className="h-9 w-8 rounded-lg border border-admin-border"
                        >
                          <Plus className="mx-auto h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-medium uppercase leading-tight text-admin-subtle">
                        Prix client (€)
                      </p>
                      <p className="mb-1 text-[8px] font-normal normal-case leading-tight text-admin-muted">
                        Ce que le client paie
                      </p>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={it.unitPrice}
                        onChange={(e) => patchItem(it.perfume.id, { unitPrice: e.target.value })}
                        className="h-9 w-full rounded-lg border border-admin-border bg-admin-surface px-2 text-[14px] tabular-nums"
                        placeholder="ex. 35"
                        autoComplete="off"
                        title="Montant facturé au client pour ce flacon (prix de vente)"
                        aria-label="Prix client, montant facturé pour ce flacon"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-medium uppercase leading-tight text-admin-subtle">
                        Mon achat (€)
                      </p>
                      <p className="mb-1 text-[8px] font-normal normal-case leading-tight text-admin-muted">
                        Ce que le flacon te coûte
                      </p>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={it.unitCost}
                        onChange={(e) => patchItem(it.perfume.id, { unitCost: e.target.value })}
                        className="h-9 w-full rounded-lg border border-admin-border bg-admin-surface px-2 text-[14px] tabular-nums"
                        placeholder="ex. 10,86"
                        autoComplete="off"
                        title="Prix d'achat : à combien tu l'as eu le flacon"
                        aria-label="Mon prix d'achat du flacon (revient)"
                      />
                    </div>
                  </div>
                  <p className="text-right text-[12px] tabular-nums text-admin-text">
                    {(toNum(it.unitPrice) * it.quantity).toFixed(2).replace(".", ",")}&nbsp;€
                  </p>
                </SectionCard>
              ))}
            </div>
            <AdminButton
              type="button"
              variant="outline"
              size="md"
              leftIcon={Plus}
              className="w-full"
              onClick={() => setPickerOpen(true)}
            >
              Ajouter un parfum
            </AdminButton>
            {items.length === 0 ? (
              <p className="flex items-center gap-2 text-[11px] text-[color:var(--admin-warning)]">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Sélectionne au moins un parfum (panier) pour valider la commande.
              </p>
            ) : null}
          </div>

          {items.length > 0 ? (
            <div className="flex items-center justify-between rounded-xl border border-admin-border bg-admin-surface px-3 py-2">
              <span className="text-[12px] font-medium text-admin-muted">Total</span>
              <span className="text-[18px] font-serif tabular-nums text-admin-text">
                {orderTotal.toFixed(2).replace(".", ",")} €
              </span>
            </div>
          ) : null}

          <div>
            <label
              htmlFor="order-form-notes"
              className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-admin-muted"
            >
              Notes
            </label>
            <textarea
              id="order-form-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="—"
              className="block w-full rounded-xl border border-admin-border bg-admin-surface px-4 py-3 text-[16px] text-admin-text placeholder:text-admin-subtle transition-colors focus-visible:border-admin-accent focus-visible:outline-none"
            />
          </div>
        </div>
      </Modal>

      <PerfumePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addPerfume}
        excludedIds={items.map((i) => i.perfume.id)}
      />
    </>
  );
}
