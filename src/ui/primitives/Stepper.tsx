"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type StepperProps = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel?: string;
  className?: string;
};

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
  ariaLabel,
  className,
}: StepperProps) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  return (
    <div
      role="group"
      aria-label={ariaLabel ?? "Quantité"}
      className={cn(
        "inline-flex items-center gap-1 rounded-[10px] border border-[var(--admin-border-strong)] bg-[var(--admin-surface)]",
        className,
      )}
    >
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        aria-label="Diminuer"
        className="inline-flex h-9 w-9 items-center justify-center text-[var(--admin-text-muted)] disabled:opacity-30 tap-scale"
      >
        <Minus size={14} />
      </button>
      <span
        className="min-w-[2.5ch] text-center text-[14px] font-semibold tabular-nums tnum text-[var(--admin-text)]"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        aria-label="Augmenter"
        className="inline-flex h-9 w-9 items-center justify-center text-[var(--admin-text-muted)] disabled:opacity-30 tap-scale"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
