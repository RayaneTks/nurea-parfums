"use client";

import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";

type GiftToggleProps = {
  active: boolean;
  onToggle: () => void;
  className?: string;
};

/**
 * Bascule « Don » réutilisable pour une ligne (vente / commande).
 * Quand active : la ligne est offerte (prix 0, coût compté). Le parent gère la
 * mise à 0 du prix dans son handler `onToggle`.
 */
export function GiftToggle({ active, onToggle, className }: GiftToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        "inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium tap-scale",
        active
          ? "border-[var(--admin-accent)] bg-[var(--admin-accent-bg)] text-[var(--admin-accent)]"
          : "border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-text-muted)]",
        className,
      )}
    >
      <Gift size={14} /> Don
    </button>
  );
}
