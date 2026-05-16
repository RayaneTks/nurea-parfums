"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Stack } from "@/ui/primitives/Stack";
import { TicketItemRow } from "./TicketItemRow";
import { PerfumePicker, type PickerResult } from "@/features/sell/components/PerfumePicker";
import type { TicketDraftLine } from "../hooks/useTicketEdit";

type TicketItemsListProps = {
  lines: TicketDraftLine[];
  mode: "view" | "edit";
  onPatch: (key: string, patch: Partial<TicketDraftLine>) => void;
  onQuantityDelta: (key: string, delta: number) => void;
  onRemove: (key: string) => void;
  onAdd: (line: TicketDraftLine) => void;
};

export function TicketItemsList({
  lines,
  mode,
  onPatch,
  onQuantityDelta,
  onRemove,
  onAdd,
}: TicketItemsListProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handlePick = (result: PickerResult) => {
    const key = `new:${Date.now()}`;
    if (result.kind === "catalog") {
      onAdd({
        key,
        perfumeId: result.perfume.id,
        snapshot: {
          name: result.perfume.name,
          brandName: result.perfume.brand?.name ?? null,
          image: result.perfume.image ?? null,
        },
        quantity: 1,
        volumeMl: 100,
        unitPrice: "",
        unitCostDzd: "",
        exchangeRate: "277",
      });
    } else {
      onAdd({
        key,
        perfumeId: null,
        snapshot: {
          name: result.name,
          brandName: result.brandName || "Hors catalogue",
          image: null,
        },
        quantity: 1,
        volumeMl: 100,
        unitPrice: "",
        unitCostDzd: "",
        exchangeRate: "277",
      });
    }
  };

  return (
    <>
      <Stack gap={2}>
        {lines.map((line) => (
          <TicketItemRow
            key={line.key}
            line={line}
            mode={mode}
            onPatch={onPatch}
            onQuantityDelta={onQuantityDelta}
            onRemove={onRemove}
          />
        ))}

        {mode === "edit" && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-dashed py-4 text-[13px] font-medium text-[var(--admin-text-muted)] transition-colors hover:border-[var(--admin-accent)] hover:text-[var(--admin-accent)] active:scale-[0.98]"
            style={{ borderColor: "var(--admin-border-hover)" }}
          >
            <Plus size={16} />
            Ajouter un parfum
          </button>
        )}
      </Stack>

      <PerfumePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePick}
        allowManual
      />
    </>
  );
}
