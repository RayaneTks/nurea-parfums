import { cn } from "@/lib/utils";

const fmtEUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtEURCompact = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

type MoneyProps = {
  value: number | string | null | undefined;
  /** Si true, n'affiche pas les centimes (utile pour KPI compactes). */
  compact?: boolean;
  /** Affiche le signe + si valeur positive. */
  signed?: boolean;
  /** Couleur sémantique selon valeur. */
  tone?: "default" | "muted" | "success" | "danger" | "accent" | "auto";
  /** Si true, montant gras. */
  bold?: boolean;
  className?: string;
};

function toNumber(v: MoneyProps["value"]): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

const toneClass: Record<NonNullable<MoneyProps["tone"]>, string> = {
  default: "text-[var(--admin-text)]",
  muted: "text-[var(--admin-text-muted)]",
  success: "text-[var(--admin-success)]",
  danger: "text-[var(--admin-danger)]",
  accent: "text-[var(--admin-accent)]",
  auto: "",
};

export function Money({ value, compact = false, signed = false, tone = "default", bold = false, className }: MoneyProps) {
  const n = toNumber(value);
  const formatter = compact ? fmtEURCompact : fmtEUR;
  const formatted = formatter.format(Math.abs(n));
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
