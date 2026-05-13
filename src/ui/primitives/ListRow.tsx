"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ListRowProps = {
  /** Slot gauche : Avatar, icône, thumbnail. */
  leading?: ReactNode;
  /** Texte principal — string (interprété en font-medium 15px) ou ReactNode pour custom. */
  primary: ReactNode;
  /** Texte secondaire sous le primary (caption). */
  secondary?: ReactNode;
  /** Slot droit : montant, badge, etc. */
  trailing?: ReactNode;
  /** Affiche un chevron si tap-to-navigate. */
  chevron?: boolean;
  /** Navigation : si fourni → wrap dans <Link>. */
  href?: string;
  /** onClick handler — exclusif avec href. */
  onClick?: () => void;
  /** Désactive interactivité. */
  disabled?: boolean;
  /** ariaLabel pour accessibilité. */
  ariaLabel?: string;
  className?: string;
};

function ListRowInner({
  leading,
  primary,
  secondary,
  trailing,
  chevron,
}: Pick<ListRowProps, "leading" | "primary" | "secondary" | "trailing" | "chevron">) {
  return (
    <>
      {leading ? <span className="shrink-0">{leading}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col">
        {typeof primary === "string" ? (
          <span className="block truncate text-[15px] font-medium text-[var(--admin-text)] leading-tight">
            {primary}
          </span>
        ) : (
          primary
        )}
        {secondary ? (
          <span className="block truncate text-[13px] text-[var(--admin-text-muted)] mt-0.5">
            {secondary}
          </span>
        ) : null}
      </span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
      {chevron ? (
        <ChevronRight
          size={16}
          className="shrink-0 text-[var(--admin-text-subtle)]"
          aria-hidden
        />
      ) : null}
    </>
  );
}

export function ListRow(props: ListRowProps) {
  const { href, onClick, disabled, ariaLabel, className } = props;
  const isInteractive = (href !== undefined || onClick !== undefined) && !disabled;

  const baseCn = cn(
    "flex items-center gap-3 px-3 py-3 min-h-[56px]",
    isInteractive ? "tap-scale active:bg-[var(--admin-surface-muted)]" : null,
    isInteractive
      ? "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)] rounded-[12px]"
      : null,
    disabled ? "opacity-50" : null,
    className,
  );

  if (href && isInteractive) {
    return (
      <Link href={href} prefetch aria-label={ariaLabel} className={baseCn}>
        <ListRowInner {...props} />
      </Link>
    );
  }

  if (onClick && isInteractive) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(baseCn, "w-full text-left")}
      >
        <ListRowInner {...props} />
      </button>
    );
  }

  return (
    <div className={baseCn} aria-label={ariaLabel}>
      <ListRowInner {...props} />
    </div>
  );
}
