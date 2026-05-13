"use client";

import { Stack } from "@/ui/primitives/Stack";
import { TicketItemRow } from "./TicketItemRow";
import type { TicketDraftLine } from "../hooks/useTicketEdit";

type TicketItemsListProps = {
  lines: TicketDraftLine[];
  mode: "view" | "edit";
  onPatch: (key: string, patch: Partial<TicketDraftLine>) => void;
  onQuantityDelta: (key: string, delta: number) => void;
  onRemove: (key: string) => void;
};

export function TicketItemsList({
  lines,
  mode,
  onPatch,
  onQuantityDelta,
  onRemove,
}: TicketItemsListProps) {
  return (
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
    </Stack>
  );
}
