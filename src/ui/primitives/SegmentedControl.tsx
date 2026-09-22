"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

type Option<T extends string> = {
  value: T;
  /** Peut porter un compteur : « À livrer (8) ». */
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  fullWidth?: boolean;
  className?: string;
};

/**
 * Bascule exclusive de 2 à 4 options (`role="radiogroup"`). Quand elle filtre
 * une liste, son état vit dans l'URL (`?vue=`) — à la charge de l'appelant.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  fullWidth = true,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (delta === 0) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-stretch gap-0.5 rounded-[var(--admin-radius-md)] bg-[var(--admin-surface-muted)] p-1",
        fullWidth ? "w-full" : null,
        className,
      )}
    >
      {options.map((opt, index) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "tap-scale inline-flex min-h-[var(--admin-touch-min)] min-w-0 flex-1 select-none items-center justify-center rounded-[var(--admin-radius-sm)] px-3",
              "admin-type-caption font-semibold",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
              active
                ? "bg-[var(--admin-surface)] text-[var(--admin-text)] shadow-[shadow:var(--admin-shadow-sm)]"
                : "text-[var(--admin-text-muted)] mouse-hover:text-[var(--admin-text)]",
            )}
          >
            <span className="tnum truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
