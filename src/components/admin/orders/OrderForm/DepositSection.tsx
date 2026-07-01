"use client";

import { Check } from "lucide-react";
import { Card } from "@/ui/primitives/Card";
import { Input } from "@/ui/primitives/Input";
import { PocketSelector, type PocketOption } from "@/features/treasury/components/PocketSelector";

type DepositSectionProps = {
  on: boolean;
  amount: string;
  method: string;
  pocketId: string | null;
  pockets: PocketOption[];
  onToggle: (on: boolean) => void;
  onAmountChange: (v: string) => void;
  onMethodChange: (v: string) => void;
  onPocketChange: (v: string | null) => void;
};

export function DepositSection({
  on,
  amount,
  method,
  pocketId,
  pockets,
  onToggle,
  onAmountChange,
  onMethodChange,
  onPocketChange,
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
            Enregistré et tracé en trésorerie. Passe la commande en « à traiter ».
          </span>
        </span>
      </button>
      {on ? (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Montant €"
              inputMode="decimal"
              numeric
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="ex. 50"
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
          {pockets.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-[var(--admin-text-muted)]">
                Encaissé dans (poche)
              </p>
              <PocketSelector pockets={pockets} value={pocketId} onChange={onPocketChange} />
              <p className="mt-1 text-[11px] text-[var(--admin-text-subtle)]">
                Sans choix → « Non attribué », à répartir plus tard.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
