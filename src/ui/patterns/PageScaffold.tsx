import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageScaffoldProps = {
  /** Header sticky en haut (généralement title + filter / search). */
  header?: ReactNode;
  /** Footer sticky en bas (CTA principal). */
  footer?: ReactNode;
  /** Padding latéral defaut 16. Mettre 0 pour bleed. */
  padding?: 0 | 3 | 4 | 5;
  /** ariaLabel main element. */
  ariaLabel?: string;
  /** Padding scroll renforcé quand clavier iOS + CTA sticky dans la page. */
  formScroll?: boolean;
  children: ReactNode;
  className?: string;
};

const pxClass = { 0: "px-0", 3: "px-3", 4: "px-4", 5: "px-5" } as const;

/**
 * Layout standard pour toute page admin.
 *
 * - Padding-bottom uniforme pour la tab bar (via --admin-scroll-bottom-pad).
 * - Slot header (sticky-top, safe-area inset) optionnel.
 * - Slot footer (sticky-bottom) optionnel.
 */
export function PageScaffold({
  header,
  footer,
  padding = 4,
  ariaLabel,
  formScroll = false,
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
          className="sticky top-0 z-30 bg-[var(--admin-bg)]/85 backdrop-blur-md admin-safe-top"
        >
          {header}
        </div>
      ) : null}

      <div
        className={cn(
          "flex flex-1 flex-col gap-4 pt-3",
          pxClass[padding],
          !footer && (formScroll ? "admin-form-scroll-pad" : "admin-page-bottom-pad"),
        )}
      >
        {children}
      </div>

      {footer ? (
        <div className={cn("shrink-0 admin-page-bottom-pad", pxClass[padding])}>{footer}</div>
      ) : null}
    </main>
  );
}
