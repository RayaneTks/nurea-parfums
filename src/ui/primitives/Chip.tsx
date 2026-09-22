import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChipProps = {
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  /**
   * Compteur affiché après le libellé : « En attente (2) ». À 0, le chip NE SE
   * REND PAS : un filtre qui ne discrimine rien n'est pas une option, c'est du
   * bruit (05 §5.3).
   */
  count?: number;
  /** Filtre actif effaçable (« En retard ✕ ») : le tap le retire. */
  clearable?: boolean;
  icon?: ReactNode;
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
};

/** Filtre, raccourci de montant, choix de poche. Cible de 44 px. */
export function Chip({
  active = false,
  onClick,
  disabled,
  count,
  clearable = false,
  icon,
  ariaLabel,
  children,
  className,
}: ChipProps) {
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        "tap-scale inline-flex min-h-[var(--admin-touch-min)] select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--admin-radius-md)] border px-3",
        "admin-type-caption font-semibold",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-[var(--admin-accent)] bg-[var(--admin-accent-bg)] text-[var(--admin-accent)]"
          : "border-[var(--admin-border-strong)] bg-[var(--admin-surface)] text-[var(--admin-text)] mouse-hover:bg-[var(--admin-surface-hover)]",
        className,
      )}
    >
      {icon ? <span aria-hidden className="inline-flex">{icon}</span> : null}
      <span>{children}</span>
      {count !== undefined ? <span className="tnum">({count})</span> : null}
      {clearable ? <X size={14} aria-hidden /> : null}
    </button>
  );
}
