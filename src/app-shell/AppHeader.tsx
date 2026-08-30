"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Search } from "lucide-react";
import { getParentScreen } from "./navigation";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  onOpenCommandPalette: () => void;
};

/**
 * Header applicatif — barre de navigation, pas de titre.
 *
 * Les titres d'écran sont rendus par les pages elles-mêmes (large title iOS) :
 * les répéter ici les afficherait deux fois et volerait 56 px de contenu.
 *
 * Le bouton retour est dérivé de la route (`getParentScreen`) et non de
 * l'historique : revenir depuis un lien profond — notification, raccourci,
 * palette de commandes — doit mener à l'écran parent, pas hors de l'app.
 */
export function AppHeader({ onOpenCommandPalette }: AppHeaderProps) {
  const pathname = usePathname() ?? "";
  const parent = getParentScreen(pathname);

  return (
    <header
      className={cn(
        "sticky top-0 z-[var(--admin-z-app-header)] flex w-full shrink-0 items-center justify-between gap-2 px-2",
        "min-h-[var(--admin-header-height)] py-1.5",
        "admin-header-blur border-b border-[var(--admin-border)]",
      )}
    >
      {parent ? (
        <Link
          href={parent.href}
          prefetch
          className={cn(
            "-ml-1 inline-flex min-h-[var(--admin-touch-min)] max-w-[60%] items-center gap-0.5 rounded-[10px] pr-2",
            "text-[var(--admin-accent)] tap-scale",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
          )}
        >
          <ChevronLeft size={22} strokeWidth={2.4} className="shrink-0" aria-hidden />
          <span className="truncate text-[15px] font-medium">{parent.label}</span>
        </Link>
      ) : (
        <Link
          href="/admin"
          prefetch
          aria-label="Accueil"
          className="inline-flex h-11 w-11 min-h-[var(--admin-touch-min)] min-w-[var(--admin-touch-min)] items-center justify-center rounded-[10px] tap-scale focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]"
        >
          <Image
            src="/branding/monogram/np-free-bordeaux.webp"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
            priority
          />
        </Link>
      )}

      <button
        type="button"
        onClick={onOpenCommandPalette}
        aria-label="Rechercher"
        aria-keyshortcuts="Meta+K Control+K"
        className={cn(
          "inline-flex h-10 min-h-[var(--admin-touch-min)] shrink-0 items-center gap-2 rounded-full",
          "bg-[var(--admin-surface-muted)] text-[var(--admin-text-muted)] tap-scale",
          "hover:bg-[var(--admin-accent-bg)] hover:text-[var(--admin-accent)]",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
          parent ? "w-11 justify-center" : "pl-3 pr-4",
        )}
      >
        <Search size={18} strokeWidth={2.2} aria-hidden />
        {parent ? null : <span className="text-[13px] font-medium">Rechercher</span>}
      </button>
    </header>
  );
}
