"use client";

import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent"
  | "cuivre"
  | "neutral";

interface AdminBadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  success:
    "bg-[var(--admin-success-subtle)] text-[var(--admin-success)] border-[var(--admin-success-border)]",
  warning:
    "bg-[var(--admin-warning-subtle)] text-[var(--admin-warning)] border-[var(--admin-warning-border)]",
  danger:
    "bg-[var(--admin-danger-subtle)] text-[var(--admin-danger)] border-[var(--admin-danger-border)]",
  info:
    "bg-[var(--admin-info-subtle)] text-[var(--admin-info)] border-[var(--admin-info-border)]",
  accent:
    "bg-admin-accent-subtle text-admin-accent border-admin-border-hover",
  cuivre:
    "bg-admin-cuivre-subtle text-admin-cuivre border-admin-cuivre/30",
  neutral:
    "bg-admin-surface-muted text-admin-muted border-admin-border",
};

const dots: Record<BadgeVariant, string> = {
  success: "bg-[var(--admin-success)]",
  warning: "bg-[var(--admin-warning)]",
  danger: "bg-[var(--admin-danger)]",
  info: "bg-[var(--admin-info)]",
  accent: "bg-admin-accent",
  cuivre: "bg-admin-cuivre",
  neutral: "bg-admin-subtle",
};

export function AdminBadge({ label, variant = "neutral", dot = false, className }: AdminBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
        "text-[11px] font-medium",
        variants[variant],
        className,
      )}
    >
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", dots[variant])} aria-hidden /> : null}
      {label}
    </span>
  );
}
