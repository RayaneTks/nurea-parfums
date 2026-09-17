import { formatEur, spokenEur } from "@/domain/money";
import { cn } from "@/lib/utils";
import { toEur, type MoneyValue } from "./money-value";

export type MoneyTone = "default" | "muted" | "success" | "danger" | "warning" | "accent" | "inherit";

type MoneyProps = {
  value: MoneyValue;
  /** Sans centimes : tuiles KPI uniquement (05 §2.2). */
  compact?: boolean;
  /** « + » devant un positif (mouvements, journal). */
  signed?: boolean;
  /**
   * `warning` est le SEUL ton d'un montant non reçu (« À encaisser »). Un
   * positif n'est pas vert par défaut : `success` signale un événement, pas
   * une valeur. `inherit` sur les fonds pleins.
   */
  tone?: MoneyTone;
  bold?: boolean;
  className?: string;
};

const toneClass: Record<MoneyTone, string> = {
  default: "text-[var(--admin-text)]",
  muted: "text-[var(--admin-text-muted)]",
  success: "text-[var(--admin-success)]",
  danger: "text-[var(--admin-danger)]",
  warning: "text-[var(--admin-warning)]",
  accent: "text-[var(--admin-accent)]",
  inherit: "",
};

/**
 * Affichage d'un montant (05 §3.2). N'appelle que `formatEur` et `spokenEur`
 * (04 §5.3 règle 6) : même texte au serveur et sur l'iPhone, chiffres
 * tabulaires, espace fine insécable.
 *
 * VoiceOver lit le montant en toutes lettres (« 1 234 euros 50 ») par un texte
 * réservé aux lecteurs d'écran : un `aria-label` posé sur un `span` générique
 * n'est pas lu de façon fiable.
 */
export function Money({ value, compact = false, signed = false, tone = "default", bold = false, className }: MoneyProps) {
  const amount = toEur(value);
  return (
    <span className={cn("tnum whitespace-nowrap", toneClass[tone], bold ? "font-semibold" : null, className)}>
      <span aria-hidden>{formatEur(amount, { compact, signed })}</span>
      <span className="sr-only">{spokenEur(amount)}</span>
    </span>
  );
}
