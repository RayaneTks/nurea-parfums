import type { CSSProperties, ReactNode } from "react";
import type { TypographyRoleName } from "@/design/tokens";
import { cn } from "@/lib/utils";
import { toneClass, typeClass, type TextTone } from "./typography";

type HeadingLevel = 1 | 2 | 3;

type HeadingProps = {
  /** Niveau sémantique (h1, h2, h3). */
  level?: HeadingLevel;
  /** Rôle visuel ; défaut : celui du niveau. `display` pour un montant dominant. */
  variant?: Extract<TypographyRoleName, "display" | "h1" | "h2" | "h3">;
  tone?: TextTone;
  truncate?: boolean;
  id?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

const levelTag = { 1: "h1", 2: "h2", 3: "h3" } as const;
const levelRole = { 1: "h1", 2: "h2", 3: "h3" } as const;

export function Heading({
  level = 1,
  variant,
  tone = "default",
  truncate = false,
  id,
  children,
  className,
  style,
}: HeadingProps) {
  const Tag = levelTag[level];
  return (
    <Tag
      id={id}
      className={cn(
        typeClass[variant ?? levelRole[level]],
        toneClass[tone],
        truncate ? "truncate" : null,
        className,
      )}
      style={style}
    >
      {children}
    </Tag>
  );
}
