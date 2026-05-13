"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Minus, PlusCircle, Trash2 } from "lucide-react";
import { CustomerCombobox, type SelectedCustomer } from "../customers/CustomerCombobox";
import { AdminInput } from "../ui/AdminInput";
import { AdminButton } from "../ui/AdminButton";
import { AdminToast, type ToastType } from "../ui/AdminToast";
import { StickyAction } from "../shell/StickyAction";
import { SectionCard } from "../ui/SectionCard";
import { createOrderAction } from "@/server/orders/actions";
import type { PerfumePickerRow } from "@/lib/gestion/types";
import type { CreateOrderInput, OrderItemInput } from "@/schemas/order";

const PerfumePicker = dynamic(
  () => import("../gestion/PerfumePicker").then((m) => m.PerfumePicker),
  { ssr: false },
);

type LineState = {
  perfume: PerfumePickerRow;
  quantity: number;
  volumeMl: 30 | 50 | 100;
  unitPrice: string;
  unitCostDzd: string;
  exchangeRate: string;
};

const VOLUMES = [30, 50, 100] as const;

function toNum(v: string | number): number {
  const n = Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

async function fetchPricing(perfumeId: number, volumeMl: number): Promise<{
  defaultUnitPriceEur: string;
  defaultUnitCostDzd: string | null;
} | null> {
  const r = await fetch(`/api/admin/perfumes/${perfumeId}/pricing?volumeMl=${volumeMl}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!r.ok) return null;
  const json = (await r.json()) as unknown;
  if (
    typeof json === "object" &&
    json !== null &&
    "row" in json &&
    typeof (json as { row: unknown }).row === "object" &&
    (json as { row: unknown }).row !== null
  ) {
    return (json as { row: { defaultUnitPriceEur: string; defaultUnitCostDzd: string | null } }).row;
  }
  return null;
}

export function QuickOrderForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [customer, setCustomer] = useState<SelectedCustomer | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [line, setLine] = useState<LineState | null>(null);
  const [depositOn, setDepositOn] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [exchangeRateDefault, setExchangeRateDefault] = useState("277");

  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  const total = useMemo(
    () => (line ? toNum(line.unitPrice) * line.quantity : 0),
    [line],
  );

  const onSelectPerfume = useCallback(
    async (p: PerfumePickerRow) => {
      const pricing = await fetchPricing(p.id, 100);
      setLine({
        perfume: p,
        quantity: 1,
        volumeMl: 100,
        unitPrice: pricing?.defaultUnitPriceEur ?? "",
        unitCostDzd: pricing?.defaultUnitCostDzd ?? "",
        exchangeRate: exchangeRateDefault,
      });
      setPickerOpen(false);
    },
    [exchangeRateDefault],
  );

  const onChangeVolume = useCallback(
    async (v: 30 | 50 | 100) => {
      if (!line) return;
      const pricing = await fetchPricing(line.perfume.id, v);
      setLine({
        ...line,
        volumeMl: v,
        unitPrice: pricing?.defaultUnitPriceEur ?? line.unitPrice,
        unitCostDzd: pricing?.defaultUnitCostDzd ?? line.unitCostDzd,
      });
    },
    [line],
  );

  const submit = useCallback(() => {
    if (!line) {
      setToast({ type: "error", message: "Ajoute un parfum." });
      return;
    }
    const name = customer?.fullName ?? customerName.trim();
    if (name.length < 2) {
      setToast({ type: "error", message: "Indique un client." });
      return;
    }
    if (toNum(line.unitPrice) <= 0) {
      setToast({ type: "error", message: "Renseigne le prix unitaire." });
      return;
    }
    if (depositOn && toNum(depositAmount) <= 0) {
      setToast({ type: "error", message: "Acompte coché → montant > 0." });
      return;
    }

    const items: OrderItemInput[] = [
      {
        perfumeId: line.perfume.id,
        perfumeSnapshot: undefined,
        quantity: line.quantity,
        volumeMl: line.volumeMl,
        unitPrice: line.unitPrice.replace(",", "."),
        unitCostDzd: line.unitCostDzd === "" ? "0" : line.unitCostDzd.replace(",", "."),
        exchangeRate: line.exchangeRate === "" ? "0" : line.exchangeRate.replace(",", "."),
        note: null,
      },
    ];

    const payload: CreateOrderInput = {
      customerId: customer?.id ?? null,
      customerName: name,
      deliveryAt: null,
      notes: null,
      items,
      initialDeposit: depositOn
        ? { amount: depositAmount.replace(",", "."), method: null }
        : null,
    };

    startTransition(async () => {
      const result = await createOrderAction(payload);
      if (!result.ok) {
        setToast({ type: "error", message: result.error });
        return;
      }
      setToast({
        type: "success",
        message: result.data.status === "READY" ? "Commande créée et à traiter." : "Commande créée.",
      });
      router.push(`/admin/ordres/${result.data.id}`);
      router.refresh();
    });
  }, [customer, customerName, depositAmount, depositOn, line, router]);

  return (
    <>
      <SectionCard>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Client</h2>
        <CustomerCombobox
          value={customer}
          onChange={(c) => {
            setCustomer(c);
            if (c) setCustomerName(c.fullName);
          }}
          placeholder="Choisir ou créer un client…"
        />
        {customer === null ? (
          <div className="mt-2">
            <AdminInput
              label="Ou nom seul (sans fiche)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Prénom Nom"
              autoComplete="off"
            />
          </div>
        ) : null}
      </SectionCard>

      <SectionCard>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Parfum</h2>
          {line ? (
            <button
              type="button"
              onClick={() => setLine(null)}
              className="inline-flex items-center gap-1 text-xs text-red-600"
              aria-label="Retirer le parfum"
            >
              <Trash2 size={12} /> Retirer
            </button>
          ) : null}
        </div>

        {!line ? (
          <AdminButton
            type="button"
            variant="outline"
            onClick={() => setPickerOpen(true)}
            className="w-full"
          >
            <PlusCircle size={16} /> Choisir un parfum
          </AdminButton>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-2.5">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                {line.perfume.image ? (
                  <Image
                    src={line.perfume.image}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{line.perfume.name}</p>
                <p className="truncate text-xs text-neutral-500">
                  {line.perfume.brand?.name ?? ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-20 text-xs font-medium text-neutral-700">Volume</span>
              <div className="flex gap-1.5">
                {VOLUMES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => void onChangeVolume(v)}
                    className={
                      line.volumeMl === v
                        ? "rounded-lg border border-nurea-bordeaux bg-nurea-bordeaux/10 px-3 py-1.5 text-xs font-semibold text-nurea-bordeaux"
                        : "rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700"
                    }
                  >
                    {v} ml
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-20 text-xs font-medium text-neutral-700">Quantité</span>
              <div className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white">
                <button
                  type="button"
                  onClick={() => setLine({ ...line, quantity: Math.max(1, line.quantity - 1) })}
                  className="inline-flex h-9 w-9 items-center justify-center text-neutral-600"
                  aria-label="Diminuer"
                >
                  <Minus size={14} />
                </button>
                <span className="min-w-[2ch] text-center text-sm font-medium tabular-nums">
                  {line.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setLine({ ...line, quantity: line.quantity + 1 })}
                  className="inline-flex h-9 w-9 items-center justify-center text-neutral-600"
                  aria-label="Augmenter"
                >
                  <PlusCircle size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <AdminInput
                label="Prix unitaire €"
                inputMode="decimal"
                value={line.unitPrice}
                onChange={(e) => setLine({ ...line, unitPrice: e.target.value })}
                placeholder="120"
              />
              <AdminInput
                label="Coût DZD (opt.)"
                inputMode="decimal"
                value={line.unitCostDzd}
                onChange={(e) => setLine({ ...line, unitCostDzd: e.target.value })}
                placeholder="36000"
              />
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={depositOn}
            onChange={(e) => setDepositOn(e.target.checked)}
            className="mt-1 h-4 w-4 accent-nurea-bordeaux"
          />
          <span className="flex-1">
            <span className="block text-sm font-medium text-neutral-900">Acompte encaissé</span>
            <span className="block text-xs text-neutral-500">
              Active la transition automatique vers « À traiter ».
            </span>
          </span>
        </label>
        {depositOn ? (
          <div className="mt-3">
            <AdminInput
              label="Montant acompte €"
              inputMode="decimal"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="50"
            />
          </div>
        ) : null}
      </SectionCard>

      <SectionCard>
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">Total commande</span>
          <span className="text-lg font-bold tabular-nums">{total.toFixed(2)} €</span>
        </div>
      </SectionCard>

      <StickyAction>
        <AdminButton
          type="button"
          variant="primary"
          isLoading={pending}
          onClick={submit}
          className="w-full"
        >
          <CheckCircle2 size={16} /> Créer la commande
        </AdminButton>
      </StickyAction>

      <PerfumePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(p) => void onSelectPerfume(p)}
        excludedIds={line ? [line.perfume.id] : []}
      />

      {toast ? (
        <AdminToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}
