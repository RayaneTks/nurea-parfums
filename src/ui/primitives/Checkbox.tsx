"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type CheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Nom accessible : « Sélectionner Commande du 12 sept. ». */
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Case à cocher de sélection multiple (05 §3.1, rattachement en masse 06 S13).
 *
 * Se pose en `leading` d'une `ListRow` dont l'`onClick` bascule la même
 * sélection : TOUTE la rangée (56 px) est la cible, la case n'en est que le
 * témoin et le contrôle annoncé. Seule, elle garde une cible de 44 px.
 * Jamais pour un réglage à effet immédiat : c'est le rôle de `Switch`.
 */
export function Checkbox({ checked, onCheckedChange, ariaLabel, disabled = false, className }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "tap-scale inline-flex h-[var(--admin-touch-min)] w-[var(--admin-touch-min)] shrink-0 items-center justify-center rounded-[var(--admin-radius-md)]",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "admin-transition inline-flex h-[22px] w-[22px] items-center justify-center rounded-[var(--admin-radius-xs)] border",
          checked
            ? "border-[var(--admin-accent)] bg-[var(--admin-accent)] text-[var(--admin-on-accent)]"
            : // Bordure `text-subtle` : un composant d'interface doit tenir 3:1 (05 §6).
              "border-[var(--admin-text-subtle)] bg-[var(--admin-surface)] text-transparent",
        )}
      >
        <Check size={15} strokeWidth={3} />
      </span>
    </button>
  );
}
