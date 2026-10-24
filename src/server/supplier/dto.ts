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
}): SupplierEntrySummary {
  return { ...row, amountDzd: toDb(dzdFromDb(row.amountDzd)), occurredAt: row.occurredAt.toISOString() };
}
