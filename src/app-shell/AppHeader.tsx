"use client";

import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  onOpenCommandPalette: () => void;
};

export function AppHeader({ onOpenCommandPalette }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-[var(--admin-z-app-header)] flex w-full shrink-0 items-center justify-between px-4",
        "min-h-[var(--admin-header-height)] py-2",
        "admin-header-blur border-b border-[var(--admin-border)]",
      )}
    >
      <Link
        href="/admin"
        prefetch
        aria-label="Tableau de bord"
        className="inline-flex h-11 w-11 min-h-[var(--admin-touch-min)] min-w-[var(--admin-touch-min)] items-center justify-center rounded-[10px] tap-scale focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]"
      >
        <Image
          src="/branding/monogram/np-free-bordeaux.webp"
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 object-contain"
          priority
        />
      </Link>

      <button
        type="button"
        onClick={onOpenCommandPalette}
        aria-label="Rechercher"
        className="inline-flex h-11 min-h-[var(--admin-touch-min)] items-center gap-2 rounded-full bg-[var(--admin-surface-muted)] pl-3 pr-4 text-[var(--admin-text-muted)] tap-scale hover:bg-[var(--admin-accent-bg)] hover:text-[var(--admin-accent)]"
      >
        <Search size={18} strokeWidth={2.2} aria-hidden />
        <span className="text-[13px] font-medium">Rechercher</span>
      </button>
    </header>
  );
}
