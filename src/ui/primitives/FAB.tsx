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

export function FAB({ icon: Icon, ariaLabel, href, onClick, className }: FABProps) {
  const cls = cn(
    "fixed right-4 z-[55]",
    "inline-flex h-[56px] w-[56px] items-center justify-center rounded-full",
    "bg-[var(--admin-accent)] text-white shadow-[var(--admin-shadow-lg)]",
    "tap-scale focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
    className,
  );
  const style = {
    bottom: "calc(var(--admin-tab-bar-height) + env(safe-area-inset-bottom, 0px) + 16px)",
  } as const;

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={cls} style={style}>
        <Icon size={22} strokeWidth={2.4} aria-hidden />
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={cls} style={style}>
      <Icon size={22} strokeWidth={2.4} aria-hidden />
    </button>
  );
}
