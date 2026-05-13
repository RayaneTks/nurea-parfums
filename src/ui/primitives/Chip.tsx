"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChipProps = {
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
};

export function Chip({
  active = false,
  onClick,
  disabled,
  children,
  ariaLabel,
  className,
}: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex min-h-[36px] items-center justify-center rounded-[10px] px-3",
        "text-[13px] font-semibold whitespace-nowrap select-none",
        "transition-[background-color,color,border-color,transform] duration-[var(--admin-duration-default)] ease-[var(--admin-easing-default)]",
        "tap-scale focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        active
          ? "bg-[var(--admin-accent-bg)] text-[var(--admin-accent)] border border-[var(--admin-accent)]"
          : "bg-[var(--admin-surface)] text-[var(--admin-text)] border border-[var(--admin-border-strong)]",
        className,
      )}
    >
      {children}
    </button>
  );
}
