import "server-only";
import type { SupplierEntrySummary } from "@/contracts/supplier";
import { dzdFromDb, toDb } from "@/domain/money";

/** Une ligne du carnet telle que la base la rend → sa forme de contrat (writer et lectures). */
export function entrySummary(row: {
  id: string;
  kind: "DEBT" | "PAYMENT";
  amountDzd: { toString(): string };
  label: string | null;
  note: string | null;
  occurredAt: Date;
  settlesEntryId: string | null;
  settledBy: { id: string; occurredAt: Date } | null;
}): SupplierEntrySummary {
  return {
    ...row,
    amountDzd: toDb(dzdFromDb(row.amountDzd)),
    occurredAt: row.occurredAt.toISOString(),
    settledBy: row.settledBy ? { id: row.settledBy.id, occurredAt: row.settledBy.occurredAt.toISOString() } : null,
  };
}

/** Les colonnes que `entrySummary` lit (writer et lectures). */
export const ENTRY_SUMMARY_SELECT = {
  id: true,
  kind: true,
  amountDzd: true,
  label: true,
  note: true,
  occurredAt: true,
  settlesEntryId: true,
  settledBy: { select: { id: true, occurredAt: true } },
} as const;
