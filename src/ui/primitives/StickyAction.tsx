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
        "sticky bottom-0 left-0 right-0 z-20 -mx-4 px-4 pt-3",
        background
          ? "border-t border-[var(--admin-border)] bg-[var(--admin-surface)]/95 backdrop-blur-md"
          : null,
        className,
      )}
      style={{
        /* sticky bottom-0 dans le scroll container interne du shell admin
           (main.flex-1.overflow-y-auto) → reste au-dessus de la TabBar
           (qui est shrink-0 sous le scroll container). */
        paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {children}
    </div>
  );
}
