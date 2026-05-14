"use client";

import { useMemo } from "react";
import { Card } from "@/ui/primitives/Card";
import { Input } from "@/ui/primitives/Input";
import { Money } from "@/ui/patterns/Money";
import { Check, AlertCircle } from "lucide-react";

type TicketPaymentProps = {
  total: number;
  remainingDue: string;
  mode: "view" | "edit";
  onChange: (value: string) => void;
};

function parseAmount(raw: string): number {
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function TicketPayment({ total, remainingDue, mode, onChange }: TicketPaymentProps) {
  const rem = useMemo(() => parseAmount(remainingDue), [remainingDue]);
  const paid = Math.max(0, total - rem);
  const isFullyPaid = rem <= 0;
  const isOver = rem > total + 0.001;

  if (mode === "view") {
    return (
      <Card padding={3} tone={isFullyPaid ? "surface" : "alt"}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {isFullyPaid ? (
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: "var(--admin-success-bg)",
                  color: "var(--admin-success)",
                }}
                aria-hidden
              >
                <Check size={14} />
              </span>
            ) : (
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: "var(--admin-warning-bg)",
                  color: "var(--admin-warning)",
                }}
                aria-hidden
              >
                <AlertCircle size={14} />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-tight text-[var(--admin-text)]">
                {isFullyPaid ? "Payé intégralement" : "Paiement partiel"}
              </p>
              <p className="text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
                Payé <Money value={paid.toFixed(2)} compact /> / <Money value={total.toFixed(2)} compact />
              </p>
            </div>
          </div>
          {!isFullyPaid ? (
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
                Reste
              </p>
              <span
                className="tnum whitespace-nowrap text-[14px] font-semibold"
                style={{ color: "var(--admin-warning)" }}
              >
                {rem.toFixed(0)} €
              </span>
            </div>
          ) : null}
        </div>
      </Card>
    );
  }

  return (
    <Card padding={3} tone="surface">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-medium text-[var(--admin-text)]">Reste à payer</p>
          <p className="text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
            Total <Money value={total.toFixed(2)} compact />
          </p>
        </div>
        <Input
          type="text"
          inputMode="decimal"
          value={remainingDue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          numeric
          aria-label="Reste à payer en euros"
          error={isOver ? "Reste > total" : undefined}
          hint={!isOver ? `Payé: ${paid.toFixed(2)} €` : undefined}
        />
      </div>
    </Card>
  );
}
