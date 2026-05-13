import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";
type BadgeSize = "sm" | "md";

type BadgeProps = {
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Pastille indicateur à gauche. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
};

const toneStyles: Record<BadgeTone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: "var(--admin-surface-muted)", fg: "var(--admin-text-muted)", dot: "var(--admin-text-subtle)" },
  accent: { bg: "var(--admin-accent-bg)", fg: "var(--admin-accent)", dot: "var(--admin-accent)" },
  success: { bg: "var(--admin-success-bg)", fg: "var(--admin-success)", dot: "var(--admin-success)" },
  warning: { bg: "var(--admin-warning-bg)", fg: "var(--admin-warning)", dot: "var(--admin-warning)" },
  danger: { bg: "var(--admin-danger-bg)", fg: "var(--admin-danger)", dot: "var(--admin-danger)" },
  info: { bg: "var(--admin-info-bg)", fg: "var(--admin-info)", dot: "var(--admin-info)" },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "h-[20px] px-2 text-[11px] gap-1 rounded-full",
  md: "h-[24px] px-2.5 text-[12px] gap-1.5 rounded-full",
};

export function Badge({
  tone = "neutral",
  size = "sm",
  dot = false,
  children,
  className,
}: BadgeProps) {
  const t = toneStyles[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium whitespace-nowrap",
        sizeStyles[size],
        className,
      )}
      style={{ background: t.bg, color: t.fg }}
    >
      {dot ? (
        <span
          aria-hidden
          className="inline-block h-[6px] w-[6px] rounded-full"
          style={{ background: t.dot }}
        />
      ) : null}
      {children}
    </span>
  );
}
