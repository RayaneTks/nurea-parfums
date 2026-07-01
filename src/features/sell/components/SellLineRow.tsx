"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { Stack, HStack } from "@/ui/primitives/Stack";
import { Stepper } from "@/ui/primitives/Stepper";
import { Chip } from "@/ui/primitives/Chip";
import { Input } from "@/ui/primitives/Input";
import { Money } from "@/ui/patterns/Money";
import { GiftToggle } from "@/ui/patterns/GiftToggle";

const VOLUMES = [30, 50, 100] as const;

export type SellLine = {
  key: string;
  perfumeId: number | null;
  snapshot: { name: string; brandName: string; image: string | null };
  quantity: number;
  volumeMl: 30 | 50 | 100;
  unitPrice: string;
  unitCostDzd: string;
  exchangeRate: string;
  /** Don : parfum offert (prix 0, coût compté). */
  isGift?: boolean;
};

function lineTotal(unitPrice: string, qty: number): number {
  const n = Number(unitPrice.replace(",", "."));
  return Number.isFinite(n) ? n * qty : 0;
}

type SellLineRowProps = {
  line: SellLine;
  onPatch: (key: string, patch: Partial<SellLine>) => void;
  onRemove: (key: string) => void;
};

export function SellLineRow({ line, onPatch, onRemove }: SellLineRowProps) {
  return (
    <div
      className="flex flex-col gap-2 rounded-[14px] bg-[var(--admin-surface)] px-3 py-3"
      style={{ border: "1px solid var(--admin-border)" }}
    >
      <HStack gap={3} align="center">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px] bg-[var(--admin-surface-muted)]">
          {line.snapshot.image ? (
            <Image src={line.snapshot.image} alt="" fill sizes="48px" className="object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight text-[var(--admin-text)]">
            {line.snapshot.name}
            {line.perfumeId === null ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-[var(--admin-warning-bg)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--admin-warning)]">
                Libre
              </span>
            ) : null}
          </p>
          <p className="truncate text-[12px] text-[var(--admin-text-subtle)] mt-0.5">
            {line.snapshot.brandName}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(line.key)}
          aria-label="Retirer"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--admin-danger)] tap-scale hover:bg-[var(--admin-danger-bg)]"
        >
          <Trash2 size={16} />
        </button>
      </HStack>

      <Stack gap={2}>
        <HStack gap={2} align="center">
          <span className="w-[64px] text-[12px] text-[var(--admin-text-muted)]">Volume</span>
          <div className="flex gap-1.5">
            {VOLUMES.map((v) => (
              <Chip
                key={v}
                active={line.volumeMl === v}
                onClick={() => onPatch(line.key, { volumeMl: v })}
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
            value={line.quantity}
            onChange={(n) => onPatch(line.key, { quantity: n })}
          />
          <GiftToggle
            active={!!line.isGift}
            onToggle={() =>
              onPatch(line.key, line.isGift ? { isGift: false } : { isGift: true, unitPrice: "0" })
            }
          />
          <div className="ml-auto">
            {line.isGift ? (
              <span className="text-[14px] font-bold text-[var(--admin-accent)]">Offert</span>
            ) : (
              <Money value={lineTotal(line.unitPrice, line.quantity)} bold />
            )}
          </div>
        </HStack>
        <div className="grid grid-cols-3 gap-2">
          <Input
            label="Prix €"
            numeric
            inputMode="decimal"
            value={line.isGift ? "0" : line.unitPrice}
            disabled={line.isGift}
            onChange={(e) => onPatch(line.key, { unitPrice: e.target.value })}
            placeholder="ex. 120"
            enterKeyHint="next"
          />
          <Input
            label="Coût DZD"
            numeric
            inputMode="decimal"
            value={line.unitCostDzd}
            onChange={(e) => onPatch(line.key, { unitCostDzd: e.target.value })}
            placeholder="ex. 36000"
            enterKeyHint="next"
          />
          <Input
            label="Taux"
            numeric
            inputMode="decimal"
            value={line.exchangeRate}
            onChange={(e) => onPatch(line.key, { exchangeRate: e.target.value })}
            placeholder="ex. 277"
            enterKeyHint="done"
          />
        </div>
      </Stack>
    </div>
  );
}
