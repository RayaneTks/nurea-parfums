import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";
type BadgeSize = "sm" | "md";

type BadgeProps = {
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Pastille avant le libellé. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
};

const toneClass: Record<BadgeTone, { pill: string; dot: string }> = {
  neutral: { pill: "bg-[var(--admin-surface-muted)] text-[var(--admin-text-muted)]", dot: "bg-[var(--admin-text-subtle)]" },
  accent: { pill: "bg-[var(--admin-accent-bg)] text-[var(--admin-accent)]", dot: "bg-[var(--admin-accent)]" },
  success: { pill: "bg-[var(--admin-success-bg)] text-[var(--admin-success)]", dot: "bg-[var(--admin-success)]" },
  warning: { pill: "bg-[var(--admin-warning-bg)] text-[var(--admin-warning)]", dot: "bg-[var(--admin-warning)]" },
  danger: { pill: "bg-[var(--admin-danger-bg)] text-[var(--admin-danger)]", dot: "bg-[var(--admin-danger)]" },
  info: { pill: "bg-[var(--admin-info-bg)] text-[var(--admin-info)]", dot: "bg-[var(--admin-info)]" },
};

const sizeClass: Record<BadgeSize, string> = {
  sm: "h-5 gap-1 px-2 admin-type-micro",
  md: "h-6 gap-1.5 px-2.5 admin-type-caption font-medium",
};

/**
 * Signal d'un état ANORMAL (05 §3.3) : « Partiel », « En retard », « 80 € dû »,
 * « Rupture », « Offert ». Jamais un état nominal (« Visible » sur 99 lignes
 * sur 99 noie le seul cas qui compte) ; jamais deux sur une ligne ; jamais seul
 * porteur d'un montant. Non interactif.
 */
export function Badge({ tone = "neutral", size = "sm", dot = false, children, className }: BadgeProps) {
  const t = toneClass[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-[var(--admin-radius-full)]",
        sizeClass[size],
        t.pill,
        className,
      )}
    >
      {dot ? <span aria-hidden className={cn("inline-block h-1.5 w-1.5 rounded-[var(--admin-radius-full)]", t.dot)} /> : null}
      {children}
    </span>
  );
}
