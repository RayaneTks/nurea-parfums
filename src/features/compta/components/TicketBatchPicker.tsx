"use client";

import { BatchPicker } from "./BatchPicker";

type TicketBatchPickerProps = {
  saleId: string;
  current: { id: string; name: string; status: "OPEN" | "CLOSED" } | null;
  onAssigned: (next: { id: string; name: string } | null) => void;
  onError: (message: string) => void;
};

export function TicketBatchPicker({ saleId, current, onAssigned, onError }: TicketBatchPickerProps) {
  return (
    <BatchPicker
      endpoint={`/api/admin/sales/${saleId}`}
      current={current ? { id: current.id, name: current.name } : null}
      onAssigned={onAssigned}
      onError={onError}
    />
  );
}
