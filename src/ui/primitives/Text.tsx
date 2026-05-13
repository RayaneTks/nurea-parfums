import type { ElementType, ReactNode, CSSProperties } from "react";
import { typography, type TypographyVariantName } from "@/design/tokens";
import { cn } from "@/lib/utils";

type TextColor =
  | "default"
  | "muted"
  | "subtle"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "inherit";

type TextAlign = "left" | "center" | "right";

type TextProps = {
  variant?: TypographyVariantName;
  color?: TextColor;
  align?: TextAlign;
  as?: ElementType;
  /** Tabular numerals (montants, dates). */
  numeric?: boolean;
  /** Affiche ... si trop long. */
  truncate?: boolean;
  /** Lignes max avant clamp (truncate multi-ligne). */
  clamp?: 1 | 2 | 3;
  /** Uppercase + tracking pour eyebrows / labels. */
  uppercase?: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

const colorClass: Record<TextColor, string> = {
  default: "text-[var(--admin-text)]",
  muted: "text-[var(--admin-text-muted)]",
  subtle: "text-[var(--admin-text-subtle)]",
  accent: "text-[var(--admin-accent)]",
  success: "text-[var(--admin-success)]",
  warning: "text-[var(--admin-warning)]",
  danger: "text-[var(--admin-danger)]",
  inherit: "",
};

const alignClass: Record<TextAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const clampClass: Record<NonNullable<TextProps["clamp"]>, string> = {
  1: "line-clamp-1",
  2: "line-clamp-2",
  3: "line-clamp-3",
};

export function Text({
  variant = "body",
  color = "default",
  align,
  as,
  numeric = false,
  truncate = false,
  clamp,
  uppercase = false,
  children,
  className,
  style,
}: TextProps) {
  const Tag: ElementType = as ?? (variant === "micro" ? "span" : "p");
  const t = typography[variant];

  const inlineStyle: CSSProperties = {
    fontSize: t.size,
    fontWeight: t.weight,
    lineHeight: t.lineHeight,
    letterSpacing: t.tracking,
    ...style,
  };

  return (
    <Tag
      className={cn(
        colorClass[color],
        align ? alignClass[align] : null,
        numeric ? "tnum" : null,
        truncate ? "truncate" : null,
        clamp ? clampClass[clamp] : null,
        uppercase ? "uppercase" : null,
        className,
      )}
      style={inlineStyle}
    >
      {children}
    </Tag>
  );
}
