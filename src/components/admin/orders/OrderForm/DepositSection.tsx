"use client";

import { SectionCard } from "../../ui/SectionCard";
import { AdminInput } from "../../ui/AdminInput";

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
    <SectionCard>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-1 h-4 w-4 accent-nurea-bordeaux"
        />
        <span className="flex-1">
          <span className="block text-sm font-medium text-neutral-900">Acompte encaissé</span>
          <span className="block text-xs text-neutral-500">
            Coché → commande passe immédiatement en « à traiter ».
          </span>
        </span>
      </label>
      {on ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <AdminInput
            label="Montant €"
            inputMode="decimal"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="50"
          />
          <AdminInput
            label="Méthode (opt.)"
            value={method}
            onChange={(e) => onMethodChange(e.target.value)}
            placeholder="cash, virement…"
          />
        </div>
      ) : null}
    </SectionCard>
  );
}
