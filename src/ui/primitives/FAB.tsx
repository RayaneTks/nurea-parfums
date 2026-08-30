"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type FABProps = {
  icon: LucideIcon;
  ariaLabel: string;
  href?: string;
  onClick?: () => void;
  className?: string;
};

/**
 * Bouton d'action flottant.
 *
 * Positionné dans un rail de la largeur de l'app (`--admin-app-max-width`) et
 * non contre le bord de la fenêtre : sur desktop, un `fixed right-4` seul
 * projetait le bouton à des centaines de pixels du cadre 430 px, détaché de
 * la liste qu'il complète.
 */
export function FAB({ icon: Icon, ariaLabel, href, onClick, className }: FABProps) {
  const button = cn(
    "pointer-events-auto absolute bottom-0 right-4",
    "inline-flex h-[56px] w-[56px] items-center justify-center rounded-full",
    "bg-[var(--admin-accent)] text-white shadow-[var(--admin-shadow-lg)]",
    "tap-scale focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
    className,
  );

  return (
    <div
      aria-hidden={false}
      className="pointer-events-none fixed inset-x-0 z-[var(--admin-z-fab)] mx-auto h-0 max-w-[var(--admin-app-max-width)]"
      style={{ bottom: "calc(var(--admin-tab-bar-height) + 16px)" }}
    >
      {href ? (
        <Link href={href} prefetch aria-label={ariaLabel} className={button}>
          <Icon size={22} strokeWidth={2.4} aria-hidden />
        </Link>
      ) : (
        <button type="button" onClick={onClick} aria-label={ariaLabel} className={button}>
          <Icon size={22} strokeWidth={2.4} aria-hidden />
        </button>
      )}
    </div>
  );
}
