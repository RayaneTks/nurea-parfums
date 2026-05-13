"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface FilterPillOption<V extends string> {
  value: V;
  label: string;
}

interface FilterPillsProps<V extends string> {
  options: readonly FilterPillOption<V>[];
  value: V;
  onChange: (value: V) => void;
  ariaLabel: string;
  className?: string;
}

export function FilterPills<V extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: FilterPillsProps<V>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ x: number; width: number }>({
    x: 0,
    width: 0,
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const active = root.querySelector<HTMLButtonElement>(`button[data-value="${value}"]`);
    if (!active) return;
    setIndicator({ x: active.offsetLeft, width: active.offsetWidth });
  }, [value, options]);

  return (
    <div
      ref={rootRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "admin-nav-no-select relative inline-flex items-center gap-1 p-1 bg-admin-surface-muted border border-admin-border rounded-full",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 rounded-full bg-admin-surface shadow-admin-sm transition-[transform,width,opacity] duration-200 ease-out-expo"
        style={{
          width: indicator.width || 0,
          transform: `translateX(${indicator.x}px)`,
          opacity: indicator.width > 0 ? 1 : 0,
        }}
      />
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            data-value={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-[1] min-h-11 min-w-[2.5rem] px-3.5 sm:px-4 text-[13px] font-medium rounded-full",
              "transition-[color,transform] duration-200 ease-out-expo tap-scale",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-surface",
              isActive
                ? "text-admin-text"
                : "text-admin-muted [@media(hover:hover)]:hover:text-admin-text",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
