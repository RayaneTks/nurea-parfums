"use client";

import { Banknote, CreditCard, Truck, Wallet, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PocketKind } from "@prisma/client";
import { cn } from "@/lib/utils";

export type PocketOption = {
  id: string;
  name: string;
  kind: PocketKind;
  isSystem?: boolean;
};

const ICON: Record<PocketKind, LucideIcon> = {
  CASH: Banknote,
  BANK: CreditCard,
  SUPPLIER: Truck,
  OTHER: Wallet,
  UNASSIGNED: HelpCircle,
};

export function pocketIcon(kind: PocketKind): LucideIcon {
  return ICON[kind] ?? Wallet;
}

type PocketSelectorProps = {
  pockets: PocketOption[];
  value: string | null;
  onChange: (id: string) => void;
  /** Inclure la poche système « Non attribué » dans les choix (défaut false). */
  includeSystem?: boolean;
  className?: string;
};

/** Rangée de chips tactiles (44px) pour choisir une poche. Mono-sélection. */
export function PocketSelector({
  pockets,
  value,
  onChange,
  includeSystem = false,
  className,
}: PocketSelectorProps) {
  const list = includeSystem ? pockets : pockets.filter((p) => !p.isSystem);
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {list.map((p) => {
        const Icon = pocketIcon(p.kind);
        const active = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            aria-pressed={active}
            className={cn(
              "inline-flex min-h-[44px] items-center gap-2 rounded-[12px] border px-3 text-[14px] font-medium tap-scale",
              active
                ? "border-[var(--admin-accent)] bg-[var(--admin-accent-bg)] text-[var(--admin-accent)]"
                : "border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-text)]",
            )}
          >
            <Icon size={16} aria-hidden />
            {p.name}
          </button>
        );
      })}
    </div>
  );
}
