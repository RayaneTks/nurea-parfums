import { cn } from "@/lib/utils";

type DividerProps = {
  /**
   * Traverse le padding latéral de page ou de sheet (16 px) pour toucher les
   * bords. Dans une carte `padding 0`, inutile : la carte est déjà bord à bord.
   */
  bleed?: boolean;
  className?: string;
};

/** Filet de 1 px. La séparation vient des filets, pas des ombres (05 §2.5). */
export function Divider({ bleed = false, className }: DividerProps) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn("h-px shrink-0 bg-[var(--admin-border)]", bleed ? "-mx-4" : null, className)}
    />
  );
}
