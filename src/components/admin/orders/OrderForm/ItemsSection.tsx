"use client";

import Image from "next/image";
import { useState } from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import { GiftToggle } from "@/ui/patterns/GiftToggle";
import { Card } from "@/ui/primitives/Card";
import { Stack, HStack } from "@/ui/primitives/Stack";
import { Stepper } from "@/ui/primitives/Stepper";
import { Chip } from "@/ui/primitives/Chip";
import { Input } from "@/ui/primitives/Input";
import { Button } from "@/ui/primitives/Button";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { Money } from "@/ui/patterns/Money";
import { PerfumePicker, type PickerResult } from "@/features/sell";
import { VOLUMES, type OrderFormLine } from "./types";

type ItemsSectionProps = {
  items: OrderFormLine[];
  exchangeRateDefault: string;
  onAddItem: (result: PickerResult) => Promise<void>;
  onPatchItem: (key: string, patch: Partial<OrderFormLine>) => Promise<void>;
  onRemoveItem: (key: string) => void;
  onQuantityDelta: (key: string, delta: number) => void;
};

function toNum(v: string | number): number {
  const n = Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

export function ItemsSection({ items, onAddItem, onPatchItem, onRemoveItem }: ItemsSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <Card padding={3}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-[var(--admin-text)]">
            Parfums {items.length > 0 ? `(${items.length})` : ""}
          </h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leadingIcon={<Plus size={14} />}
            onClick={() => setPickerOpen(true)}
          >
            Ajouter
          </Button>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Aucun parfum"
            description="Ajoute au moins un parfum au catalogue ou en saisie libre."
            action={
              <Button
                type="button"
                variant="secondary"
                size="md"
                leadingIcon={<Plus size={16} />}
                onClick={() => setPickerOpen(true)}
              >
                Choisir un parfum
              </Button>
            }
            className="py-6"
          />
        ) : (
          <Stack gap={2}>
            {items.map((it) => (
              <div
                key={it.key}
                className="flex flex-col gap-2 rounded-[14px] bg-[var(--admin-surface-alt)] px-3 py-3"
                style={{ border: "1px solid var(--admin-border)" }}
              >
                <HStack gap={3} align="center">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px] bg-[var(--admin-surface-muted)]">
                    {it.snapshot.image ? (
                      <Image
                        src={it.snapshot.image}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold leading-tight text-[var(--admin-text)]">
                      {it.snapshot.name}
                      {it.perfumeId === null ? (
                        <span className="ml-2 inline-flex items-center rounded-full bg-[var(--admin-warning-bg)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--admin-warning)]">
                          Libre
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-[12px] text-[var(--admin-text-subtle)] mt-0.5">
                      {it.snapshot.brandName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(it.key)}
                    aria-label="Retirer"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--admin-danger)] tap-scale hover:bg-[var(--admin-danger-bg)]"
                  >
                    <Trash2 size={16} />
                  </button>
                </HStack>

                <HStack gap={2} align="center">
                  <span className="w-[64px] text-[12px] text-[var(--admin-text-muted)]">Volume</span>
                  <div className="flex gap-1.5">
                    {VOLUMES.map((v) => (
                      <Chip
                        key={v}
                        active={it.volumeMl === v}
                        onClick={() => void onPatchItem(it.key, { volumeMl: v })}
                        ariaLabel={`${v} ml`}
                      >
                        {v} ml
                      </Chip>
                    ))}
                  </div>
                </HStack>

                <HStack gap={2} align="center">
                  <span className="w-[64px] text-[12px] text-[var(--admin-text-muted)]">Qté</span>
                  <Stepper
                    value={it.quantity}
                    onChange={(n) => void onPatchItem(it.key, { quantity: n })}
                  />
                  <GiftToggle
                    active={!!it.isGift}
                    onToggle={() =>
                      void onPatchItem(
                        it.key,
                        it.isGift ? { isGift: false } : { isGift: true, unitPrice: "0" },
                      )
                    }
                  />
                  <div className="ml-auto">
                    {it.isGift ? (
                      <span className="text-[14px] font-bold text-[var(--admin-accent)]">Offert</span>
                    ) : (
                      <Money value={toNum(it.unitPrice) * it.quantity} bold />
                    )}
                  </div>
                </HStack>

                <div className="grid grid-cols-3 gap-2">
                  <Input
                    label="Prix €"
                    numeric
                    inputMode="decimal"
                    value={it.isGift ? "0" : it.unitPrice}
                    disabled={it.isGift}
                    onChange={(e) => void onPatchItem(it.key, { unitPrice: e.target.value })}
                    placeholder="120"
                    enterKeyHint="next"
                  />
                  <Input
                    label="Coût DZD"
                    numeric
                    inputMode="decimal"
                    value={it.unitCostDzd}
                    onChange={(e) => void onPatchItem(it.key, { unitCostDzd: e.target.value })}
                    placeholder="36000"
                    enterKeyHint="next"
                  />
                  <Input
                    label="Taux"
                    numeric
                    inputMode="decimal"
                    value={it.exchangeRate}
                    onChange={(e) => void onPatchItem(it.key, { exchangeRate: e.target.value })}
                    placeholder="277"
                    enterKeyHint="done"
                  />
                </div>
              </div>
            ))}
          </Stack>
        )}
      </Card>

      <PerfumePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(result) => void onAddItem(result)}
        excludedIds={items
          .map((it) => it.perfumeId)
          .filter((id): id is number => id !== null)}
      />
    </>
  );
}
