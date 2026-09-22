import type { TypographyRoleName } from "@/design/tokens";

/**
 * Classe CSS de chaque rôle typographique (`.admin-type-*`, globals.admin.css).
 *
 * Écrites en toutes lettres, jamais composées (`admin-type-${role}`) : Tailwind
 * ne conserve une classe de `@layer components` que s'il la lit telle quelle
 * dans les sources.
 */
export const typeClass: Record<TypographyRoleName, string> = {
  display: "admin-type-display",
  h1: "admin-type-h1",
  h2: "admin-type-h2",
  h3: "admin-type-h3",
  body: "admin-type-body",
  bodyEm: "admin-type-body-em",
  field: "admin-type-field",
  caption: "admin-type-caption",
  micro: "admin-type-micro",
};

export type TextTone =
  | "default"
  | "muted"
  | "subtle"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "onAccent"
  | "inherit";

export const toneClass: Record<TextTone, string> = {
  default: "text-[var(--admin-text)]",
  muted: "text-[var(--admin-text-muted)]",
  subtle: "text-[var(--admin-text-subtle)]",
  accent: "text-[var(--admin-accent)]",
  success: "text-[var(--admin-success)]",
  warning: "text-[var(--admin-warning)]",
  danger: "text-[var(--admin-danger)]",
  info: "text-[var(--admin-info)]",
  onAccent: "text-[var(--admin-on-accent)]",
  inherit: "",
};
