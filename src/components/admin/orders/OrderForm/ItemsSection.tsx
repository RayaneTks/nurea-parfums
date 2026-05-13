"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Minus, Plus, PlusCircle, Trash2 } from "lucide-react";
import { SectionCard } from "../../ui/SectionCard";
import { AdminInput } from "../../ui/AdminInput";
import { AdminButton } from "../../ui/AdminButton";
import { VOLUMES, type OrderFormLine } from "./types";
import type { PerfumePickerRow } from "@/lib/gestion/types";

const PerfumePicker = dynamic(
  () => import("../../gestion/PerfumePicker").then((m) => m.PerfumePicker),
  { ssr: false },
);

type ItemsSectionProps = {
  items: OrderFormLine[];
  exchangeRateDefault: string;
  onAddItem: (perfume: PerfumePickerRow) => Promise<void>;
  onPatchItem: (key: string, patch: Partial<OrderFormLine>) => Promise<void>;
  onRemoveItem: (key: string) => void;
  onQuantityDelta: (key: string, delta: number) => void;
};

function toNum(v: string | number): number {
  const n = Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

export function ItemsSection({
  items,
  onAddItem,
  onPatchItem,
  onRemoveItem,
  onQuantityDelta,
}: ItemsSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const lineTotal = useCallback(
    (it: OrderFormLine) => toNum(it.unitPrice) * it.quantity,
    [],
  );

  return (
    <>
      <SectionCard>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">
            Parfums {items.length > 0 ? `(${items.length})` : ""}
          </h2>
          <AdminButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPickerOpen(true)}
          >
            <PlusCircle size={14} /> Ajouter
          </AdminButton>
        </div>

        {items.length === 0 ? (
          <p className="py-2 text-sm text-neutral-500">
            Aucune ligne. Clique sur « Ajouter » pour choisir un parfum.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => (
              <li
                key={it.key}
                className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    {it.perfume.image ? (
                      <Image
                        src={it.perfume.image}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {it.perfume.name}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {it.perfume.brand?.name ?? "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(it.key)}
                    className="text-neutral-400 hover:text-red-600"
                    aria-label="Retirer cette ligne"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-16 text-xs text-neutral-700">Volume</span>
                  <div className="flex gap-1.5">
                    {VOLUMES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => void onPatchItem(it.key, { volumeMl: v })}
                        className={
                          it.volumeMl === v
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
                  <span className="w-16 text-xs text-neutral-700">Qté</span>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white">
                    <button
                      type="button"
                      onClick={() => onQuantityDelta(it.key, -1)}
                      className="inline-flex h-9 w-9 items-center justify-center text-neutral-600"
                      aria-label="Diminuer"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="min-w-[2ch] text-center text-sm font-medium tabular-nums">
                      {it.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onQuantityDelta(it.key, 1)}
                      className="inline-flex h-9 w-9 items-center justify-center text-neutral-600"
                      aria-label="Augmenter"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="ml-auto text-sm font-semibold tabular-nums text-neutral-900">
                    {lineTotal(it).toFixed(2)} €
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <AdminInput
                    label="Prix € (unitaire)"
                    inputMode="decimal"
                    value={it.unitPrice}
                    onChange={(e) => void onPatchItem(it.key, { unitPrice: e.target.value })}
                    placeholder="120"
                  />
                  <AdminInput
                    label="Coût DZD"
                    inputMode="decimal"
                    value={it.unitCostDzd}
                    onChange={(e) => void onPatchItem(it.key, { unitCostDzd: e.target.value })}
                    placeholder="36000"
                  />
                </div>
                <AdminInput
                  label="Taux DZD→EUR"
                  inputMode="decimal"
                  value={it.exchangeRate}
                  onChange={(e) => void onPatchItem(it.key, { exchangeRate: e.target.value })}
                  placeholder="277"
                />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <PerfumePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(p) => {
          void onAddItem(p);
          setPickerOpen(false);
        }}
        excludedIds={[]}
      />
    </>
  );
}
