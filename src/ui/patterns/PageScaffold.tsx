import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageScaffoldProps = {
  /** Header sticky en haut (généralement title + filter / search). */
  header?: ReactNode;
  /** Footer sticky en bas (CTA principal). Si fourni, padding-bottom géré. */
  footer?: ReactNode;
  /** Padding latéral defaut 16. Mettre 0 pour bleed. */
  padding?: 0 | 3 | 4 | 5;
  /** ariaLabel main element. */
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
};

const pxClass = { 0: "px-0", 3: "px-3", 4: "px-4", 5: "px-5" } as const;

/**
 * Layout standard pour toute page admin.
 *
 * - Main scrollable avec padding-bottom auto pour la tab bar.
 * - Slot header (sticky-top, safe-area inset) optionnel.
 * - Slot footer (sticky-bottom) optionnel.
 * - Content centré max 430px (parent shell le contraint déjà, ici simple pass-through).
 */
export function PageScaffold({
  header,
  footer,
  padding = 4,
  ariaLabel,
  children,
  className,
}: PageScaffoldProps) {
  return (
    <main
      id="main-content"
      aria-label={ariaLabel}
      className={cn("flex min-h-0 flex-1 flex-col", className)}
    >
      {header ? (
        <div
          className="sticky top-0 z-30 bg-[var(--admin-bg)]/85 backdrop-blur-md"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          {header}
        </div>
      ) : null}

      <div
        className={cn(
          "flex-1 flex flex-col gap-4",
          pxClass[padding],
          "pt-3",
        )}
        style={{
          paddingBottom: footer ? "0" : "var(--admin-scroll-bottom-pad)",
        }}
      >
        {children}
      </div>

      {footer ? (
        <div className={cn("shrink-0", pxClass[padding])}>{footer}</div>
      ) : null}
    </main>
  );
}
