"use client";

import Image from "next/image";
import Link from "next/link";
import { Command as CommandIcon, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  onOpenCommandPalette: () => void;
  onOpenSearch?: () => void;
};

export function AppHeader({ onOpenCommandPalette, onOpenSearch }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-[var(--admin-z-app-header)] flex w-full shrink-0 items-center justify-between px-4",
        "admin-safe-top min-h-[calc(var(--admin-header-height)+env(safe-area-inset-top,0px))] py-2",
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

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          aria-label="Palette de commandes"
          className="inline-flex h-11 w-11 min-h-[var(--admin-touch-min)] min-w-[var(--admin-touch-min)] items-center justify-center rounded-full text-[var(--admin-text-muted)] tap-scale hover:bg-[var(--admin-surface-muted)]"
        >
          <CommandIcon size={20} aria-hidden />
        </button>
        {onOpenSearch ? (
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Rechercher"
            className="inline-flex h-11 w-11 min-h-[var(--admin-touch-min)] min-w-[var(--admin-touch-min)] items-center justify-center rounded-full text-[var(--admin-accent)] tap-scale hover:bg-[var(--admin-accent-bg)]"
          >
            <Search size={20} strokeWidth={2.2} aria-hidden />
          </button>
        ) : null}
      </div>
    </header>
  );
}
