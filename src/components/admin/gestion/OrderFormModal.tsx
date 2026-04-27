"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Minus, Plus, Trash2, AlertCircle, ListOrdered } from "lucide-react";
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
  lineKey: string;
  perfume: PerfumePickerRow;
  manualLabel: string | null;
  quantity: number;
  volumeMl: (typeof ORDER_VOLUMES_ML)[number];
  unitPrice: string;
  unitCost: string;
};

function newLineKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `k-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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
  const manual = item.manualLabel?.trim() || null;
  return {
    lineKey: item.id,
    perfume: {
      id: item.perfume.id,
      name: item.perfume.name,
      image: item.perfume.image,
      status: "PUBLISHED",
      brand: item.perfume.brand,
    },
    manualLabel: manual && manual.length >= 2 ? manual : null,
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
  const [manualPlaceholder, setManualPlaceholder] = useState<PerfumePickerRow | null>(null);
  const [manualPlaceholderError, setManualPlaceholderError] = useState<string | null>(null);

  const resetEmpty = useCallback(() => {
    setCustomerName("");
    setDeliveryAt("");
    setNotes("");
    setItems([]);
    setSaving(false);
    setDepositPaid(false);
    setDepositAmount("");
    setManualPlaceholder(null);
    setManualPlaceholderError(null);
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
    if (!open) return;
    let cancelled = false;
    setManualPlaceholderError(null);
    fetch("/api/admin/orders/manual-placeholder", { credentials: "include", cache: "no-store" })
      .then(async (r) => {
        const j = await readJsonSafe<{ perfume?: PerfumePickerRow; error?: string }>(r);
        if (!r.ok) throw new Error(j?.error ?? "Préparation hors catalogue impossible.");
        if (!j?.perfume) throw new Error("Réponse invalide.");
        if (!cancelled) setManualPlaceholder(j.perfume);
      })
      .catch((e) => {
        if (!cancelled) {
          setManualPlaceholderError(e instanceof Error ? e.message : "Erreur");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

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
      if (prev.some((it) => it.manualLabel == null && it.perfume.id === p.id)) return prev;
      return [
        ...prev,
        {
          lineKey: newLineKey(),
          perfume: p,
          manualLabel: null,
          quantity: 1,
          volumeMl: 100,
          unitPrice: "",
          unitCost: "",
        },
      ];
    });
  };

  const addManualLine = () => {
    if (!manualPlaceholder) return;
    setItems((prev) => [
      ...prev,
      {
        lineKey: newLineKey(),
        perfume: manualPlaceholder,
        manualLabel: "",
        quantity: 1,
        volumeMl: 100,
        unitPrice: "",
        unitCost: "",
      },
    ]);
  };

  const patchItem = (lineKey: string, patch: Partial<OrderFormLine>) => {
    setItems((prev) => prev.map((it) => (it.lineKey === lineKey ? { ...it, ...patch } : it)));
  };

  const updateQty = (lineKey: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) =>
          it.lineKey === lineKey
            ? { ...it, quantity: Math.max(1, it.quantity + delta) }
            : it,
        )
        .filter((it) => it.quantity > 0),
    );
  };

  const removeItem = (lineKey: string) => {
    setItems((prev) => prev.filter((it) => it.lineKey !== lineKey));
  };

  const canSubmit = useMemo(() => {
    if (saving) return false;
    if (customerName.trim().length < 2) return false;
    if (items.length === 0) return false;
    for (const it of items) {
      if (toNum(it.unitPrice) < 0 || toNum(it.unitCost) < 0) return false;
      if (it.perfume.id === manualPlaceholder?.id) {
        if ((it.manualLabel ?? "").trim().length < 2) return false;
      }
    }
    if (depositPaid && toNum(depositAmount) <= 0) return false;
    return true;
  }, [items, saving, customerName, depositPaid, depositAmount, manualPlaceholder?.id]);

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        deliveryAt: deliveryAt ? new Date(deliveryAt).toISOString() : null,
        notes: notes.trim() || null,
        depositPaid,
        depositAmount: depositPaid ? toNum(depositAmount) : 0,
        items: items.map((i) => {
          const manual = (i.manualLabel ?? "").trim();
          const isMan = manual.length >= 2 && i.perfume.id === manualPlaceholder?.id;
          return {
            perfumeId: i.perfume.id,
            manualLabel: isMan ? manual : null,
            quantity: i.quantity,
            volumeMl: i.volumeMl,
            unitPrice: toNum(i.unitPrice),
            unitCost: toNum(i.unitCost),
          };
        }),
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

  const displayName = (it: OrderFormLine) => {
    const m = (it.manualLabel ?? "").trim();
    if (m.length >= 2) return m;
    return it.perfume.name;
  };

  const showManualField = (it: OrderFormLine) =>
    it.perfume.id === manualPlaceholder?.id || Boolean((it.manualLabel ?? "").trim());

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={title}
        description="Client, lignes, puis acompte si besoin. Défilement vertical uniquement."
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
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-xl border border-admin-border bg-admin-bg/60 px-3 py-2.5">
            <ListOrdered className="mt-0.5 h-4 w-4 shrink-0 text-admin-accent" aria-hidden />
            <p className="text-[12px] leading-snug text-admin-muted">
              <span className="font-medium text-admin-text">Étapes :</span> client → parfums (catalogue ou hors
              site) → prix par ligne → acompte seulement si déjà encaissé.
            </p>
          </div>

          <AdminInput
            label="Client"
            name="customerName"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nom ou pseudo"
          />

          <AdminInput
            label="Livraison prévue"
            name="deliveryAt"
            type="datetime-local"
            value={deliveryAt}
            onChange={(e) => setDeliveryAt(e.target.value)}
          />

          <SectionCard className="space-y-3 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-admin-muted">Acompte</p>
            {mode === "edit" && order?.status === "PENDING" ? (
              <p className="text-[11px] leading-snug text-admin-muted">
                Premier encaissement : depuis la fiche commande (« Passer en à traiter »). Ici : client, panier,
                corrections.
              </p>
            ) : null}
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[14px] text-admin-text">
              <input
                type="checkbox"
                checked={depositPaid}
                onChange={(e) => {
                  const on = e.target.checked;
                  setDepositPaid(on);
                  if (!on) setDepositAmount("");
                }}
                className="h-4 w-4 shrink-0 rounded border-admin-border"
              />
              Acompte déjà encaissé
            </label>
            {depositPaid ? (
              <AdminInput
                label="Montant encaissé (€)"
                name="depositAmount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                inputMode="decimal"
                placeholder="ex. 25"
                hint={
                  mode === "edit" && order?.status === "PENDING"
                    ? "Obligatoire si coché. Sinon utilise la fiche pour l’encaissement."
                    : "Obligatoire si coché (> 0 €)."
                }
              />
            ) : (
              <p className="text-[11px] text-admin-muted">Pas d’acompte : aucun montant à saisir.</p>
            )}
          </SectionCard>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-admin-muted">
                Parfums · {items.length}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((it) => (
                <SectionCard key={it.lineKey} className="space-y-3 p-3">
                  <div className="flex items-start gap-3">
                    <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-none border border-admin-border bg-admin-bg">
                      <Image
                        loader={nureaAdminThumbLoader}
                        src={it.perfume.image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="36px"
                        quality={60}
                        fetchPriority="low"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      {showManualField(it) ? (
                        <AdminInput
                          label="Libellé (hors catalogue)"
                          name={`manual-${it.lineKey}`}
                          value={it.manualLabel ?? ""}
                          onChange={(e) =>
                            patchItem(it.lineKey, { manualLabel: e.target.value || null })
                          }
                          placeholder="ex. Fragrance X — édition limitée"
                          hint="Ce texte figure sur la commande pour trace écrite."
                        />
                      ) : (
                        <>
                          <p className="font-sans text-[14px] font-semibold leading-tight text-admin-text">
                            {displayName(it)}
                          </p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-admin-subtle">
                            {it.perfume.brand.name}
                          </p>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(it.lineKey)}
                      aria-label="Retirer la ligne"
                      className="h-9 w-9 shrink-0 text-admin-subtle tap-scale [@media(hover:hover)]:hover:text-admin-danger"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[10px] uppercase tracking-wider text-admin-subtle">Volume</p>
                    <div className="flex min-w-0 gap-1">
                      {ORDER_VOLUMES_ML.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => patchItem(it.lineKey, { volumeMl: v })}
                          className={cn(
                            "min-h-9 min-w-0 flex-1 rounded-none py-2 text-center text-[12px] font-semibold",
                            it.volumeMl === v
                              ? "bg-admin-accent text-white"
                              : "border border-admin-border bg-admin-bg text-admin-muted",
                          )}
                        >
                          {v} ml
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="min-w-0 space-y-3">
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-admin-subtle">Qté</p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateQty(it.lineKey, -1)}
                          className="flex h-9 w-10 shrink-0 items-center justify-center rounded-none border border-admin-border"
                          aria-label="Diminuer la quantité"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[2rem] text-center text-[15px] font-sans tabular-nums">
                          {it.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(it.lineKey, 1)}
                          className="flex h-9 w-10 shrink-0 items-center justify-center rounded-none border border-admin-border"
                          aria-label="Augmenter la quantité"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] font-medium uppercase leading-tight text-admin-subtle">
                        Prix client (€)
                      </p>
                      <p className="mb-1 text-[8px] font-normal normal-case leading-tight text-admin-muted">
                        Facturé au client pour ce flacon
                      </p>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={it.unitPrice}
                        onChange={(e) => patchItem(it.lineKey, { unitPrice: e.target.value })}
                        className="h-9 w-full max-w-full rounded-none border border-admin-border bg-admin-surface px-2 font-sans text-[14px] tabular-nums text-admin-text"
                        placeholder="ex. 35"
                        autoComplete="off"
                        aria-label="Prix client pour ce flacon"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] font-medium uppercase leading-tight text-admin-subtle">
                        Mon achat (€)
                      </p>
                      <p className="mb-1 text-[8px] font-normal normal-case leading-tight text-admin-muted">
                        Coût d’achat du flacon
                      </p>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={it.unitCost}
                        onChange={(e) => patchItem(it.lineKey, { unitCost: e.target.value })}
                        className="h-9 w-full max-w-full rounded-none border border-admin-border bg-admin-surface px-2 font-sans text-[14px] tabular-nums text-admin-text"
                        placeholder="ex. 10,86"
                        autoComplete="off"
                        aria-label="Prix d’achat du flacon"
                      />
                    </div>
                  </div>
                  <p className="text-right font-sans text-[12px] tabular-nums text-admin-text">
                    {(toNum(it.unitPrice) * it.quantity).toFixed(2).replace(".", ",")}&nbsp;€
                  </p>
                </SectionCard>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <AdminButton
                type="button"
                variant="outline"
                size="md"
                leftIcon={Plus}
                className="w-full"
                onClick={() => setPickerOpen(true)}
              >
                Depuis le catalogue
              </AdminButton>
              <AdminButton
                type="button"
                variant="secondary"
                size="md"
                className="w-full"
                disabled={!manualPlaceholder}
                onClick={addManualLine}
              >
                Hors catalogue (nom manuel)
              </AdminButton>
            </div>
            {manualPlaceholderError ? (
              <p className="text-[11px] text-admin-danger">{manualPlaceholderError}</p>
            ) : null}
            {items.length === 0 ? (
              <p className="flex items-center gap-2 text-[11px] text-[color:var(--admin-warning)]">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Ajoute au moins une ligne (catalogue ou libellé manuel).
              </p>
            ) : null}
          </div>

          {items.length > 0 ? (
            <div className="flex items-center justify-between rounded-none border border-admin-border bg-admin-surface px-3 py-2.5">
              <span className="font-sans text-[12px] font-medium text-admin-muted">Total commande</span>
              <span className="font-sans text-[18px] font-semibold tabular-nums text-admin-text">
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
              placeholder="Optionnel"
              className="block w-full max-w-full rounded-none border border-admin-border bg-admin-surface px-4 py-3 font-sans text-[16px] text-admin-text placeholder:text-admin-subtle transition-colors focus-visible:border-admin-accent focus-visible:outline-none"
            />
          </div>
        </div>
      </Modal>

      <PerfumePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addPerfume}
        excludedIds={(() => {
          const ids = new Set<number>();
          if (manualPlaceholder) ids.add(manualPlaceholder.id);
          for (const i of items) {
            if (manualPlaceholder && i.perfume.id === manualPlaceholder.id) continue;
            ids.add(i.perfume.id);
          }
          return [...ids];
        })()}
      />
    </>
  );
}
