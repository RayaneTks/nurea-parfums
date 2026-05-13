"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type Option<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
  fullWidth?: boolean;
  className?: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  fullWidth = true,
  className,
}: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-stretch p-1 rounded-[12px] bg-[var(--admin-surface-muted)]",
        fullWidth ? "w-full" : null,
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 inline-flex items-center justify-center min-h-[36px] px-3 rounded-[10px]",
              "text-[13px] font-semibold whitespace-nowrap select-none",
              "transition-[background-color,color] duration-[var(--admin-duration-default)] ease-[var(--admin-easing-default)]",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
              active
                ? "bg-[var(--admin-surface)] text-[var(--admin-text)] shadow-[var(--admin-shadow-sm)]"
                : "text-[var(--admin-text-muted)]",
            )}
            name={name}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
