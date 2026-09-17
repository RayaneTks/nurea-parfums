import type { CSSProperties, ElementType, ReactNode } from "react";
import type { TypographyRoleName } from "@/design/tokens";
import { cn } from "@/lib/utils";
import { toneClass, typeClass, type TextTone } from "./typography";

type TextAlign = "left" | "center" | "right";

type TextProps = {
  /** Rôle typographique (05 §2.2). Défaut `body`. */
  variant?: TypographyRoleName;
  tone?: TextTone;
  align?: TextAlign;
  as?: ElementType;
  /** Chiffres tabulaires : montants, compteurs, heures. */
  numeric?: boolean;
  /** Une ligne, ellipse — jamais un mot coupé net. */
  truncate?: boolean;
  /** Lignes max avant ellipse. */
  clamp?: 1 | 2 | 3;
  /** Capitales — libellés de chiffres en `micro`. */
  uppercase?: boolean;
  id?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
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

/** Texte par rôle. Toute taille de texte de l'app passe par un rôle. */
export function Text({
  variant = "body",
  tone = "default",
  align,
  as,
  numeric = false,
  truncate = false,
  clamp,
  uppercase = false,
  id,
  children,
  className,
  style,
}: TextProps) {
  const Tag: ElementType = as ?? (variant === "micro" ? "span" : "p");
  return (
    <Tag
      id={id}
      className={cn(
        typeClass[variant],
        toneClass[tone],
        align ? alignClass[align] : null,
        numeric ? "tnum" : null,
        truncate ? "truncate" : null,
        clamp ? clampClass[clamp] : null,
        uppercase ? "uppercase" : null,
        className,
      )}
      style={style}
    >
      {children}
    </Tag>
  );
}
