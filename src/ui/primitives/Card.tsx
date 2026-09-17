"use client";

import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardTone = "surface" | "alt" | "accent" | "muted";

type CardProps = {
  tone?: CardTone;
  /** Padding interne sur la grille (défaut 4 = 16 px). `0` pour une liste bord à bord. */
  padding?: 0 | 2 | 3 | 4 | 5 | 6;
  /** Comportement bouton : press scale, survol souris, clavier. Implicite avec `onClick`. */
  interactive?: boolean;
  /** Ombre `sm` (défaut true). */
  elevated?: boolean;
  borderless?: boolean;
  onClick?: (e: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) => void;
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

const toneClass: Record<CardTone, string> = {
  surface: "bg-[var(--admin-surface)] border-[var(--admin-border)]",
  alt: "bg-[var(--admin-surface-alt)] border-[var(--admin-border)]",
  accent: "bg-[var(--admin-accent-bg)] border-[var(--admin-accent)]",
  muted: "bg-[var(--admin-surface-muted)] border-[var(--admin-border)]",
};

const paddingClass: Record<NonNullable<CardProps["padding"]>, string> = {
  0: "p-0",
  2: "p-2",
  3: "p-3",
  4: "p-4",
  5: "p-5",
  6: "p-6",
};

/** Surface de regroupement (rayon `lg`). */
export function Card({
  tone = "surface",
  padding = 4,
  interactive = false,
  elevated = true,
  borderless = false,
  onClick,
  ariaLabel,
  children,
  className,
  style,
}: CardProps) {
  const isButton = interactive || onClick !== undefined;
  return (
    <div
      role={isButton ? "button" : undefined}
      tabIndex={isButton ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={
        isButton && onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      className={cn(
        "relative overflow-hidden rounded-[var(--admin-radius-lg)]",
        borderless ? "border-0" : "border",
        toneClass[tone],
        paddingClass[padding],
        elevated ? "shadow-[shadow:var(--admin-shadow-sm)]" : null,
        isButton
          ? cn(
              "tap-scale cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
              "mouse-hover:shadow-[shadow:var(--admin-shadow-md)]",
            )
          : null,
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
