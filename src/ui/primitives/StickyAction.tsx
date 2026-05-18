"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StickyActionProps = {
  children: ReactNode;
  /** Si true (defaut), affiche un fond opaque avec backdrop blur. */
  background?: boolean;
  className?: string;
};

/**
 * Conteneur sticky bas-de-page pour CTA principal d'une page.
 *
 * - sticky bottom + safe-area inset
 * - margin-bottom auto pour compenser la tab bar
 * - place ce composant en dernier enfant du scroll content
 */
export function StickyAction({ children, background = true, className }: StickyActionProps) {
  return (
    <div
      className={cn(
        "sticky left-0 right-0 z-20 -mx-4 px-4 pt-3",
        background
          ? "border-t border-[var(--admin-border)] bg-[var(--admin-surface)]/95 backdrop-blur-md"
          : null,
        className,
      )}
      style={{
        /* Sticky juste au-dessus de la TabBar fixed (qui occupe le bas avec
           tab-bar-height + safe-area-inset-bottom). Le bouton reste visible
           au-dessus de la nav. */
        bottom:
          "calc(var(--admin-tab-bar-height) + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "0.75rem",
      }}
    >
      {children}
    </div>
  );
}
