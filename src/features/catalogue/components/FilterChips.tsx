"use client";

import { cn } from "@/lib/utils";

export type ChipOption<T extends string> = {
  value: T;
  label: string;
  count: number;
};

type FilterChipsProps<T extends string> = {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
};

/**
 * Rangée de filtres compacte, défilable horizontalement.
 *
 * Remplace le second bloc segmenté pleine largeur du catalogue : deux
 * contrôles segmentés empilés au-dessus de la liste consommaient un tiers de
 * l'écran avant la première ligne de contenu, et se ressemblaient assez pour
 * qu'on confonde « onglet » et « filtre ».
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: FilterChipsProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-1.5 overflow-x-auto pb-0.5",
        "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
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
              "inline-flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3",
              "text-[13px] font-semibold tap-scale",
              "transition-colors duration-[var(--admin-duration-fast)] ease-[var(--admin-easing-default)]",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
              active
                ? "bg-[var(--admin-accent)] text-white"
                : "bg-[var(--admin-surface)] text-[var(--admin-text-muted)]",
            )}
            style={active ? undefined : { border: "1px solid var(--admin-border-strong)" }}
          >
            {opt.label}
            <span
              className={cn(
                "tnum text-[12px] font-medium",
                active ? "text-white/70" : "text-[var(--admin-text-subtle)]",
              )}
            >
              {opt.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
