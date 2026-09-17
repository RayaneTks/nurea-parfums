"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  /**
   * Effet immédiat. L'interrupteur bascule AVANT la réponse (optimiste) ;
   * renvoyer `false` ou lever une erreur le remet dans son état — le toast qui
   * porte la raison du refus est à la charge de l'appelant (`useAction`).
   */
  onCheckedChange: (checked: boolean) => void | boolean | Promise<void | boolean>;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
  /**
   * Raison du verrouillage, affichée à la place de la description : jamais un
   * interrupteur grisé muet (« Ajoute un visuel », « Rends d'abord la marque visible »).
   */
  disabledReason?: string;
  className?: string;
};

/**
 * Interrupteur iOS pour un réglage binaire à effet immédiat (05 §3.1).
 *
 * La rangée ENTIÈRE est la cible (44 px au moins) : on vise un libellé au
 * pouce, pas une piste de 51 px. Sémantique `role="switch"` + `aria-checked`,
 * celle que rendrait Radix Switch — sans dépendance supplémentaire.
 * Verrouillé, il reste focusable (`aria-disabled`) pour que VoiceOver lise la
 * raison.
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  disabledReason,
  className,
}: SwitchProps) {
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const descriptionId = useId();

  // La vérité revient du serveur : dès que la prop change, elle fait foi.
  useEffect(() => {
    setOptimistic(null);
  }, [checked]);

  const shown = optimistic ?? checked;
  const hint = disabled && disabledReason ? disabledReason : description;

  const toggle = async () => {
    if (disabled || pending) return;
    const next = !shown;
    setOptimistic(next);
    setPending(true);
    try {
      const result = await onCheckedChange(next);
      if (result === false) setOptimistic(null);
    } catch {
      setOptimistic(null);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={shown}
      aria-disabled={disabled || undefined}
      aria-describedby={hint ? descriptionId : undefined}
      onClick={() => void toggle()}
      className={cn(
        "tap-scale flex min-h-[var(--admin-touch-min)] w-full items-center gap-3 rounded-[var(--admin-radius-md)] py-2 text-left",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
        disabled ? "cursor-not-allowed" : null,
        className,
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "admin-type-body font-medium",
            disabled ? "text-[var(--admin-text-muted)]" : "text-[var(--admin-text)]",
          )}
        >
          {label}
        </span>
        {hint ? (
          <span id={descriptionId} className="admin-type-caption mt-0.5 text-[var(--admin-text-muted)]">
            {hint}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden
        className={cn(
          "admin-transition relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-[var(--admin-radius-full)] p-0.5",
          shown
            ? "bg-[var(--admin-accent)]"
            : "bg-[var(--admin-surface-muted)] shadow-[inset_0_0_0_1px_var(--admin-border-strong)]",
          disabled ? "opacity-50" : null,
        )}
      >
        <span
          className={cn(
            "h-[27px] w-[27px] rounded-[var(--admin-radius-full)] bg-[var(--admin-surface)] shadow-[shadow:var(--admin-shadow-md)]",
            "[transition-property:transform] [transition-duration:var(--admin-duration-default)] [transition-timing-function:var(--admin-easing-default)] motion-reduce:transition-none",
            shown ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}
