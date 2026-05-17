"use client";

import { Check } from "lucide-react";
import { Card } from "@/ui/primitives/Card";
import { Input } from "@/ui/primitives/Input";

type DepositSectionProps = {
  on: boolean;
  amount: string;
  method: string;
  onToggle: (on: boolean) => void;
  onAmountChange: (v: string) => void;
  onMethodChange: (v: string) => void;
};

export function DepositSection({
  on,
  amount,
  method,
  onToggle,
  onAmountChange,
  onMethodChange,
}: DepositSectionProps) {
  return (
    <Card padding={3}>
      <button
        type="button"
        onClick={() => onToggle(!on)}
        className="flex w-full items-start gap-3 text-left tap-scale"
        aria-pressed={on}
      >
        <span
          className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 transition-colors"
          style={{
            background: on ? "var(--admin-accent)" : "transparent",
            borderColor: on ? "var(--admin-accent)" : "var(--admin-border-strong)",
            color: "white",
          }}
          aria-hidden
        >
          {on ? <Check size={14} strokeWidth={3} /> : null}
        </span>
        <span className="flex-1">
          <span className="block text-[14px] font-semibold text-[var(--admin-text)]">
            Acompte encaissé
          </span>
          <span className="mt-0.5 block text-[12px] text-[var(--admin-text-subtle)]">
            Coché → commande passe immédiatement en « à traiter ».
          </span>
        </span>
      </button>
      {on ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Input
            label="Montant €"
            inputMode="decimal"
            numeric
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="50"
            enterKeyHint="next"
          />
          <Input
            label="Méthode (opt.)"
            value={method}
            onChange={(e) => onMethodChange(e.target.value)}
            placeholder="cash, virement…"
            enterKeyHint="done"
          />
        </div>
      ) : null}
    </Card>
  );
}
