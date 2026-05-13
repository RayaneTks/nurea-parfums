"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { Stepper } from "@/ui/primitives/Stepper";
import { Chip } from "@/ui/primitives/Chip";
import { Input } from "@/ui/primitives/Input";
import { Money } from "@/ui/patterns/Money";
import { Stack, HStack } from "@/ui/primitives/Stack";
import type { TicketDraftLine } from "../hooks/useTicketEdit";

const VOLUMES = [30, 50, 100] as const;

function lineTotal(unitPrice: string, qty: number): number {
  const p = Number(unitPrice.replace(",", "."));
  return Number.isFinite(p) ? p * qty : 0;
}

type TicketItemRowProps = {
  line: TicketDraftLine;
  mode: "view" | "edit";
  onPatch: (key: string, patch: Partial<TicketDraftLine>) => void;
  onQuantityDelta: (key: string, delta: number) => void;
  onRemove: (key: string) => void;
};

export function TicketItemRow({
  line,
  mode,
  onPatch,
  onQuantityDelta,
  onRemove,
}: TicketItemRowProps) {
  return (
    <div
      className="flex flex-col gap-2 rounded-[14px] bg-[var(--admin-surface-alt)] px-3 py-3"
      style={{ border: "1px solid var(--admin-border)" }}
    >
      <HStack gap={3} align="center">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px] bg-[var(--admin-surface-muted)]">
          {line.snapshot.image ? (
            <Image
              src={line.snapshot.image}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight text-[var(--admin-text)]">
            {line.snapshot.name}
          </p>
          <p className="truncate text-[12px] text-[var(--admin-text-subtle)] mt-0.5">
            {line.snapshot.brandName ?? "—"}
            {mode === "view" && line.volumeMl ? ` · ${line.volumeMl} ml` : ""}
            {mode === "view" ? ` · ×${line.quantity}` : ""}
          </p>
        </div>
        {mode === "view" ? (
          <Money value={lineTotal(line.unitPrice, line.quantity)} bold />
        ) : (
          <button
            type="button"
            onClick={() => onRemove(line.key)}
            aria-label="Retirer la ligne"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--admin-danger)] tap-scale hover:bg-[var(--admin-danger-bg)]"
          >
            <Trash2 size={16} />
          </button>
        )}
      </HStack>

      {mode === "edit" ? (
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
            <div className="ml-auto">
              <Money value={lineTotal(line.unitPrice, line.quantity)} bold />
            </div>
          </HStack>

          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Prix €"
              numeric
              inputMode="decimal"
              value={line.unitPrice}
              onChange={(e) => onPatch(line.key, { unitPrice: e.target.value })}
              placeholder="120"
            />
            <Input
              label="Coût DZD"
              numeric
              inputMode="decimal"
              value={line.unitCostDzd}
              onChange={(e) => onPatch(line.key, { unitCostDzd: e.target.value })}
              placeholder="36000"
            />
            <Input
              label="Taux"
              numeric
              inputMode="decimal"
              value={line.exchangeRate}
              onChange={(e) => onPatch(line.key, { exchangeRate: e.target.value })}
              placeholder="277"
            />
          </div>
        </Stack>
      ) : null}
    </div>
  );
}
