import { cn } from "@/lib/utils";
import { formateEuros, nombre } from "./format";

type MoneyProps = {
  value: number | string | null | undefined;
  /** Si true, n'affiche pas les centimes (utile pour KPI compactes). */
  compact?: boolean;
  /** Affiche le signe + si valeur positive. */
  signed?: boolean;
  /**
   * Couleur sémantique selon valeur. `inherit` laisse la couleur au parent —
   * indispensable sur les fonds pleins (carte accent, badge) où les jetons de
   * texte standards ne passeraient pas le contraste.
   */
  tone?: "default" | "muted" | "success" | "danger" | "warning" | "accent" | "auto" | "inherit";
  /** Si true, montant gras. */
  bold?: boolean;
  className?: string;
};

const toneClass: Record<NonNullable<MoneyProps["tone"]>, string> = {
  default: "text-[var(--admin-text)]",
  muted: "text-[var(--admin-text-muted)]",
  success: "text-[var(--admin-success)]",
  danger: "text-[var(--admin-danger)]",
  // « À encaisser » : ni bon ni mauvais, en attente. C'est la seule couleur
  // admise pour un montant qu'on n'a pas encore reçu.
  warning: "text-[var(--admin-warning)]",
  accent: "text-[var(--admin-accent)]",
  auto: "",
  inherit: "",
};

export function Money({ value, compact = false, signed = false, tone = "default", bold = false, className }: MoneyProps) {
  const n = nombre(value);
  // Toute la mise en forme passe par `format.ts` : c'est ce qui garantit qu'un
  // montant a la même allure ici et dans un message ou un libellé.
  const formatted = formateEuros(Math.abs(n), { compact });
  const prefix = n < 0 ? "−" : signed && n > 0 ? "+" : "";

  const resolvedTone: NonNullable<MoneyProps["tone"]> =
    tone === "auto" ? (n > 0 ? "success" : n < 0 ? "danger" : "muted") : tone;

  return (
    <span className={cn("tnum whitespace-nowrap", toneClass[resolvedTone], bold ? "font-semibold" : null, className)}>
      {prefix}
      {formatted}
    </span>
  );
}
