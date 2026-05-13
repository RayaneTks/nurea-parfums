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
        "sticky top-0 z-[40] flex w-full items-center justify-between px-4 py-2",
      )}
      style={{
        background: "color-mix(in srgb, var(--admin-bg) 80%, transparent)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderBottom: "1px solid var(--admin-border)",
        paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0px))",
      }}
    >
      <Link
        href="/admin"
        prefetch
        aria-label="Tableau de bord"
        className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] tap-scale focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]"
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
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--admin-text-muted)] tap-scale hover:bg-[var(--admin-surface-muted)]"
        >
          <CommandIcon size={20} aria-hidden />
        </button>
        {onOpenSearch ? (
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Rechercher"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--admin-accent)] tap-scale hover:bg-[var(--admin-accent-bg)]"
          >
            <Search size={20} strokeWidth={2.2} aria-hidden />
          </button>
        ) : null}
      </div>
    </header>
  );
}
