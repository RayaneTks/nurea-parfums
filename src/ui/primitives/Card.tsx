import type { ReactNode, CSSProperties } from "react";
import { radius, space } from "@/design/tokens";
import { cn } from "@/lib/utils";

type CardTone = "surface" | "alt" | "accent" | "muted";

type CardProps = {
  tone?: CardTone;
  /** Padding interne (defaut 16). */
  padding?: 0 | 2 | 3 | 4 | 5 | 6;
  /** Si true, comportement bouton (hover + active). */
  interactive?: boolean;
  /** Affiche une ombre sm (defaut true). */
  elevated?: boolean;
  /** Désactive border (par défaut visible). */
  borderless?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
};

const toneStyles: Record<CardTone, { bg: string; border: string }> = {
  surface: { bg: "var(--admin-surface)", border: "var(--admin-border)" },
  alt: { bg: "var(--admin-surface-alt)", border: "var(--admin-border)" },
  accent: { bg: "var(--admin-accent-bg)", border: "var(--admin-accent)" },
  muted: { bg: "var(--admin-surface-muted)", border: "var(--admin-border)" },
};

export function Card({
  tone = "surface",
  padding = 4,
  interactive = false,
  elevated = true,
  borderless = false,
  onClick,
  children,
  className,
  style,
  ariaLabel,
}: CardProps) {
  const t = toneStyles[tone];
  const isButton = interactive || onClick !== undefined;

  return (
    <div
      role={isButton ? "button" : undefined}
      tabIndex={isButton ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!isButton || !onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
        }
      }}
      className={cn(
        "relative overflow-hidden",
        isButton ? "tap-scale cursor-pointer" : null,
        isButton ? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent-ring)]" : null,
        className,
      )}
      style={{
        background: t.bg,
        border: borderless ? "none" : `1px solid ${t.border}`,
        borderRadius: radius.xl,
        padding: padding === 0 ? 0 : space[padding],
        boxShadow: elevated ? "var(--admin-shadow-sm)" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
