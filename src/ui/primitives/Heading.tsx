import type { ReactNode, CSSProperties } from "react";
import { typography } from "@/design/tokens";
import { cn } from "@/lib/utils";

type HeadingLevel = 1 | 2 | 3;

type HeadingColor = "default" | "muted" | "accent" | "inherit";

type HeadingProps = {
  level?: HeadingLevel;
  color?: HeadingColor;
  /** Display variant — pour KPI majeurs uniquement. */
  display?: boolean;
  truncate?: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

const levelToTag = { 1: "h1", 2: "h2", 3: "h3" } as const;
const levelToVariant = { 1: "h1", 2: "h2", 3: "h3" } as const;

const colorClass: Record<HeadingColor, string> = {
  default: "text-[var(--admin-text)]",
  muted: "text-[var(--admin-text-muted)]",
  accent: "text-[var(--admin-accent)]",
  inherit: "",
};

export function Heading({
  level = 1,
  color = "default",
  display = false,
  truncate = false,
  children,
  className,
  style,
}: HeadingProps) {
  const Tag = levelToTag[level];
  const variant = display ? "display" : levelToVariant[level];
  const t = typography[variant];

  return (
    <Tag
      className={cn(
        colorClass[color],
        truncate ? "truncate" : null,
        className,
      )}
      style={{
        fontSize: t.size,
        fontWeight: t.weight,
        lineHeight: t.lineHeight,
        letterSpacing: t.tracking,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
