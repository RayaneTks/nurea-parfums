"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Minus, Plus, Trash2, AlertCircle, ArrowLeft } from "lucide-react";
import { HeaderAction } from "../shell/HeaderAction";
import { SectionCard } from "../ui/SectionCard";
import { AdminButton } from "../ui/AdminButton";
import { AdminInput } from "../ui/AdminInput";
import { AdminToast, type ToastType } from "../ui/AdminToast";
import { cn } from "@/lib/utils";
import { nureaAdminThumbLoader } from "@/lib/image/cappedImageLoader";
import { ORDER_VOLUMES_ML, isValidVolumeMl } from "@/lib/gestion/orderLineValidation";
import type { OrderItemRow, OrderRow, PerfumePickerRow } from "@/lib/gestion/types";
import { getPricingMemory, savePricingMemory } from "@/lib/gestion/pricingMemory";

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

export function toNum(v: string | number): number {
  const n = Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

export type OrderFormLine = {
  key: string; // Pour gérer la liste proprement
  perfume: PerfumePickerRow;
  quantity: number;
  volumeMl: (typeof ORDER_VOLUMES_ML)[number];
  unitPrice: string;
  unitCostDzd: string;
  exchangeRate: string;
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
    key: `item-${item.id}-${Date.now()}`,
    perfume: {
      id: item.perfumeId,
      name: item.perfume.name,
      image: item.perfume.image,
      status: "PUBLISHED",
      brand: item.perfume.brand,
    },
    quantity: item.quantity,
    volumeMl,
    unitPrice: String(item.unitPrice ?? ""),
    unitCostDzd: item.unitCostDzd !== null ? String(item.unitCostDzd) : "",
    exchangeRate: item.exchangeRate !== null ? String(item.exchangeRate) : "",
  };
}

function computeEuroCost(dzd: string, rate: string): string {
  const d = toNum(dzd);
  const r = toNum(rate);
  if (d === 0 && r === 0) return "";
  if (r <= 0) return "0";
  return (d / r).toFixed(2);
}

export interface OrderFullPageFormProps {
  mode: "create" | "edit";
  order?: OrderRow | null;
}

export function OrderFullPageForm({ mode, order }: OrderFullPageFormProps) {
  const router = useRouter();
  
  const [customerName, setCustomerName] = useState("");
  const [deliveryAt, setDeliveryAt] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderFormLine[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [depositPaid, setDepositPaid] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [toast, setToast] = useState<{ type: ToastType; text: string } | null>(null);

  useEffect(() => {
    if (mode === "edit" && order) {
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
      const num = toNum(da);
      setDepositAmount(order.depositPaid && num > 0 ? String(da).replace(".", ",") : "");
    }
  }, [mode, order]);

  const orderTotal = useMemo(
    () => items.reduce((s, it) => s + toNum(it.unitPrice) * it.quantity, 0),
    [items],
  );

  const addPerfume = (p: PerfumePickerRow) => {
    setItems((prev) => {
      // Chercher si le parfum existe déjà avec le volume par défaut (100ml)
      // Si oui, on n'ajoute pas une nouvelle ligne mais on augmente la qté ? 
      // Non, la maquette permettait plusieurs lignes du même parfum (ex: 50ml et 100ml).
      // Dans le picker, excludedIds l'empêchait. On va l'autoriser ici si volume différent,
      // ou simplement rajouter une ligne fraîche.
      
      const defaultVol = 100;
      const mem = getPricingMemory(p.id, defaultVol);
      
      return [
        ...prev,
        {
          key: `new-${p.id}-${Date.now()}`,
          perfume: p,
          quantity: 1,
          volumeMl: defaultVol,
          unitPrice: mem?.unitPrice ?? "",
          unitCostDzd: mem?.unitCostDzd ?? "",
          exchangeRate: mem?.exchangeRate ?? "",
        },
      ];
    });
  };

  const patchItem = (key: string, patch: Partial<OrderFormLine>) => {
    setItems((prev) => prev.map((it) => {
      if (it.key !== key) return it;
      const updated = { ...it, ...patch };
      
      // Si on change le volume, on vérifie la Smart Memory pour pré-remplir les prix correspondants
      if (patch.volumeMl && patch.volumeMl !== it.volumeMl) {
        const mem = getPricingMemory(it.perfume.id, patch.volumeMl);
        if (mem) {
          updated.unitPrice = mem.unitPrice;
          updated.unitCostDzd = mem.unitCostDzd;
          updated.exchangeRate = mem.exchangeRate;
        }
      }
      return updated;
    }));
  };

  const updateQty = (key: string, delta: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.key === key
          ? { ...it, quantity: Math.max(1, it.quantity + delta) }
          : it,
      ).filter((it) => it.quantity > 0),
    );
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((it) => it.key !== key));
  };

  const canSubmit = useMemo(() => {
    if (saving) return false;
    if (customerName.trim().length < 2) return false;
    if (items.length === 0) return false;
    for (const it of items) {
      if (toNum(it.unitPrice) < 0 || toNum(it.unitCostDzd) < 0 || toNum(it.exchangeRate) < 0) return false;
    }
    if (depositPaid && toNum(depositAmount) <= 0) return false;
    return true;
  }, [items, saving, customerName, depositPaid, depositAmount]);

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    
    // Sauvegarder les prix saisis dans la "Smart Memory"
    items.forEach((it) => {
      savePricingMemory(it.perfume.id, it.volumeMl, it.unitPrice, it.unitCostDzd, it.exchangeRate);
    });

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
          unitCost: computeEuroCost(i.unitCostDzd, i.exchangeRate) || 0,
          unitCostDzd: toNum(i.unitCostDzd),
          exchangeRate: toNum(i.exchangeRate),
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
      router.push(mode === "create" ? "/admin/ordres" : `/admin/ordres/${order?.id}`);
      router.refresh();
    } catch (err) {
      setToast({ type: "error", text: err instanceof Error ? err.message : "Erreur" });
      setSaving(false);
    }
  };

  const title = mode === "create" ? "Nouvelle commande" : "Modifier la commande";
  const submitLabel = mode === "create" ? "Créer la commande" : "Enregistrer";

  return (
    <>
      <div className="flex items-center gap-2 px-5 pt-3">
        <HeaderAction label="Retour" icon={ArrowLeft} onClick={() => router.back()} />
        <h1 className="text-lg font-bold text-admin-text">{title}</h1>
      </div>

      <main id="main-content" className="flex-1 space-y-5 px-5 pt-5 pb-[120px]">
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

        <SectionCard className="space-y-3 p-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-admin-muted">Acompte</p>
          {mode === "edit" && order?.status === "PENDING" ? (
            <p className="text-[11px] leading-snug text-admin-muted">
              Acompte + passage en « à traiter » : bouton sur la fiche.
            </p>
          ) : null}
          <label className="flex items-center gap-2 text-[14px] text-admin-text">
            <input
              type="checkbox"
              checked={depositPaid}
              onChange={(e) => setDepositPaid(e.target.checked)}
              className="h-5 w-5 rounded border-admin-border"
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

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider font-medium text-admin-muted">
              Parfums ({items.length})
            </p>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-[11px] font-medium uppercase tracking-wider text-admin-accent tap-scale"
            >
              + Ajouter
            </button>
          </div>
          
          <div className="flex flex-col gap-3">
            {items.map((it) => (
              <SectionCard key={it.key} className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-xl border border-admin-border bg-admin-bg">
                    <Image
                      loader={nureaAdminThumbLoader}
                      src={it.perfume.image}
                      alt={it.perfume.name}
                      fill
                      className="object-cover"
                      sizes="44px"
                      quality={60}
                      fetchPriority="low"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-[15px] leading-tight tracking-[-0.01em] text-admin-text">
                      {it.perfume.name}
                    </p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wider text-admin-subtle">
                      {it.perfume.brand.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(it.key)}
                    aria-label="Retirer"
                    className="min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center text-admin-subtle tap-scale [@media(hover:hover)]:hover:text-admin-danger"
                  >
                    <Trash2 className="h-5 w-5" aria-hidden />
                  </button>
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] uppercase tracking-wider text-admin-subtle">Volume</p>
                  <div className="flex gap-2">
                    {ORDER_VOLUMES_ML.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => patchItem(it.key, { volumeMl: v })}
                        className={cn(
                          "flex-1 rounded-xl py-2 text-center text-[13px] font-semibold transition-colors",
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
                <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-3 pt-1">
                  <div>
                    <p className="mb-1.5 text-[10px] uppercase tracking-wider text-admin-subtle text-center">Qté</p>
                    <div className="flex items-center gap-1 bg-admin-bg border border-admin-border rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => updateQty(it.key, -1)}
                        className="h-10 w-10 flex items-center justify-center rounded-lg bg-white shadow-sm tap-scale text-admin-text"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-[16px] font-medium tabular-nums">{it.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(it.key, 1)}
                        className="h-10 w-10 flex items-center justify-center rounded-lg bg-white shadow-sm tap-scale text-admin-text"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="mb-0.5 text-[10px] font-medium uppercase leading-tight text-admin-subtle">
                      Prix client
                    </p>
                    <p className="mb-1.5 text-[10px] font-normal normal-case leading-tight text-admin-muted">
                      Ce que le client paie
                    </p>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={it.unitPrice}
                      onChange={(e) => patchItem(it.key, { unitPrice: e.target.value })}
                      className="h-12 w-full rounded-xl border border-admin-border bg-admin-surface px-3 text-[16px] tabular-nums focus-visible:outline-none focus-visible:border-admin-accent"
                      placeholder="ex. 35"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <p className="mb-0.5 text-[10px] font-medium uppercase leading-tight text-admin-subtle">
                      Achat (DZD)
                    </p>
                    <p className="mb-1.5 text-[10px] font-normal normal-case leading-tight text-admin-muted">
                      Ton prix d&apos;achat
                    </p>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={it.unitCostDzd}
                      onChange={(e) => patchItem(it.key, { unitCostDzd: e.target.value })}
                      className="h-12 w-full rounded-xl border border-admin-border bg-admin-surface px-3 text-[16px] tabular-nums focus-visible:outline-none focus-visible:border-admin-accent"
                      placeholder="ex. 2000"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <p className="mb-0.5 text-[10px] font-medium uppercase leading-tight text-admin-subtle">
                      Taux
                    </p>
                    <p className="mb-1.5 text-[10px] font-normal normal-case leading-tight text-admin-muted">
                      DZD / EUR
                    </p>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={it.exchangeRate}
                      onChange={(e) => patchItem(it.key, { exchangeRate: e.target.value })}
                      className="h-12 w-full rounded-xl border border-admin-border bg-admin-surface px-3 text-[16px] tabular-nums focus-visible:outline-none focus-visible:border-admin-accent"
                      placeholder="ex. 277"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-admin-border mt-3">
                  <p className="text-[12px] text-admin-subtle">
                    Coût unitaire calculé : <span className="font-semibold text-admin-text">{(computeEuroCost(it.unitCostDzd, it.exchangeRate) || "0").replace(".", ",")} €</span>
                  </p>
                  <p className="text-right text-[13px] font-medium tabular-nums text-admin-text">
                    Total : {(toNum(it.unitPrice) * it.quantity).toFixed(2).replace(".", ",")}&nbsp;€
                  </p>
                </div>
              </SectionCard>
            ))}
          </div>
          
          <AdminButton
            type="button"
            variant="outline"
            size="lg"
            leftIcon={Plus}
            className="w-full mt-3 border-dashed border-admin-border text-admin-muted hover:text-admin-text"
            onClick={() => setPickerOpen(true)}
          >
            Ajouter un parfum
          </AdminButton>
          
          {items.length === 0 ? (
            <p className="flex items-center gap-2 mt-3 text-[12px] text-[color:var(--admin-warning)]">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              Sélectionne au moins un parfum (panier) pour valider la commande.
            </p>
          ) : null}
        </section>

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
            rows={3}
            placeholder="Ex: Livraison au bureau..."
            className="block w-full rounded-xl border border-admin-border bg-admin-surface px-4 py-3 text-[16px] text-admin-text placeholder:text-admin-subtle transition-colors focus-visible:border-admin-accent focus-visible:outline-none"
          />
        </div>
      </main>

      <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-[55] w-full max-w-[430px] px-5 pointer-events-none">
        <div className="admin-ios-shadow bg-admin-surface/95 backdrop-blur-xl border border-admin-border-hover rounded-2xl p-4 flex items-center justify-between mb-3 pointer-events-auto">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-admin-subtle">Total de la commande</p>
            <p className="text-[20px] font-bold tabular-nums text-admin-text mt-0.5">
              {orderTotal.toFixed(2).replace(".", ",")} €
            </p>
          </div>
          <AdminButton
            variant="primary"
            size="lg"
            isLoading={saving}
            disabled={!canSubmit}
            onClick={onSubmit}
            className="min-w-[140px]"
          >
            {submitLabel}
          </AdminButton>
        </div>
      </div>

      <PerfumePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addPerfume}
        // excludedIds={items.map((i) => i.perfume.id)} // Removed to allow adding same perfume with different volume
      />

      {toast ? (
        <AdminToast
          type={toast.type}
          message={toast.text}
          onClose={() => setToast(null)}
        />
      ) : null}
    </>
  );
}
