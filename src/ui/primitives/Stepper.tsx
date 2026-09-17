"use client";

import { Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StepperProps = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** « Quantité de Sauvage 100 ml ». */
  ariaLabel: string;
  /**
   * Remplace le « − » quand la valeur est au minimum (« Retirer » sur une ligne
   * du composeur) ; sans lui, le bouton se désactive à la borne.
   */
  decrementAtMin?: { icon: ReactNode; ariaLabel: string; onPress: () => void };
  /** Raccourci à droite (« Tout », pointage de livraison). */
  trailing?: ReactNode;
  className?: string;
};

const stepButton = cn(
  "tap-scale inline-flex h-[var(--admin-touch-min)] w-[var(--admin-touch-min)] items-center justify-center rounded-[var(--admin-radius-md)]",
  "text-[var(--admin-text)] active:bg-[var(--admin-surface-muted)]",
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
  "disabled:cursor-not-allowed disabled:opacity-30",
);

/** Quantité −/+ : boutons de 44 px, borne atteinte = bouton désactivé. */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  ariaLabel,
  decrementAtMin,
  trailing,
  className,
}: StepperProps) {
  const atMin = value <= min;
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div
        role="group"
        aria-label={ariaLabel}
        className="inline-flex items-center rounded-[var(--admin-radius-md)] border border-[var(--admin-border-strong)] bg-[var(--admin-surface)]"
      >
        {atMin && decrementAtMin ? (
          <button type="button" onClick={decrementAtMin.onPress} aria-label={decrementAtMin.ariaLabel} className={stepButton}>
            {decrementAtMin.icon}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onChange(Math.max(min, value - step))}
            disabled={atMin}
            aria-label="Diminuer"
            className={stepButton}
          >
            <Minus size={16} />
          </button>
        )}
        <span className="admin-type-body-em tnum min-w-[3ch] text-center text-[var(--admin-text)]" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
          aria-label="Augmenter"
          className={stepButton}
        >
          <Plus size={16} />
        </button>
      </div>
      {trailing}
    </div>
  );
}
