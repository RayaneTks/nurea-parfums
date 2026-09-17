"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { getParentScreen, resolveBack } from "./navigation";
import { useShellNavigation } from "./ShellNavigation";

type AppHeaderProps = {
  onOpenSearch: () => void;
};

/**
 * Header du shell (05 §3.4) : 56 px, flou, sans titre — le titre d'écran est rendu par la page
 * (grand titre iOS) ; le répéter ici volerait 56 px et le dirait deux fois.
 *
 * - À gauche : sur une racine d'onglet, le monogramme (repère, non cliquable : l'onglet Accueil est
 *   déjà là, deux chemins visibles vers la même destination sont interdits, 05 §5.3) ; ailleurs, le
 *   retour dérivé de la route (`getParentScreen`), jamais de l'historique, qui rouvre le parent avec
 *   ses filtres et son défilement (06 §1.5).
 * - À droite : « Rechercher » (S17), libellé visible sur une racine, loupe seule ailleurs ; « ⌘K »
 *   seulement avec un pointeur fin.
 */
export function AppHeader({ onOpenSearch }: AppHeaderProps) {
  const pathname = usePathname() ?? "";
  const parent = getParentScreen(pathname);
  const { navigate } = useShellNavigation();

  const goBack = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!parent || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const destination = resolveBack(parent);
    navigate(destination.url, { scrollTop: destination.scrollTop });
  };

  return (
    <header
      data-app-header
      className={cn(
        "admin-header-blur relative z-[var(--admin-z-app-header)] flex h-[var(--admin-header-height)] w-full shrink-0 items-center justify-between gap-2 px-2",
        "border-b border-[var(--admin-border)]",
      )}
    >
      {parent ? (
        <a
          href={parent.href}
          onClick={goBack}
          className={cn(
            "tap-scale inline-flex min-h-[var(--admin-touch-min)] min-w-0 max-w-[60%] items-center gap-0.5 rounded-[var(--admin-radius-md)] pr-2",
            "text-[var(--admin-accent)] active:bg-[var(--admin-accent-bg)]",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
          )}
        >
          <ChevronLeft size={24} strokeWidth={2.4} className="shrink-0" aria-hidden />
          <span className="admin-type-body truncate font-medium">{parent.label}</span>
        </a>
      ) : (
        <span className="inline-flex h-[var(--admin-touch-min)] items-center pl-2">
          <Image
            src="/branding/monogram/np-free-bordeaux.webp"
            alt="Nuréa Gestion"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
            priority
          />
        </span>
      )}

      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="Rechercher"
        aria-haspopup="dialog"
        aria-keyshortcuts="Meta+K Control+K"
        data-search-trigger
        className={cn(
          "tap-scale inline-flex h-[var(--admin-touch-min)] shrink-0 items-center gap-2 rounded-[var(--admin-radius-full)]",
          "bg-[var(--admin-surface-muted)] text-[var(--admin-text-muted)]",
          "active:bg-[var(--admin-accent-bg)] active:text-[var(--admin-accent)] mouse-hover:bg-[var(--admin-accent-bg)] mouse-hover:text-[var(--admin-accent)]",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
          parent ? "w-[var(--admin-touch-min)] justify-center" : "pl-3 pr-4",
        )}
      >
        <Search size={18} strokeWidth={2.2} aria-hidden />
        {parent ? null : <span className="admin-type-caption font-medium">Rechercher</span>}
        {parent ? null : (
          <kbd
            aria-hidden
            className="admin-type-micro hidden rounded-[var(--admin-radius-xs)] border border-[var(--admin-border-strong)] bg-[var(--admin-surface)] px-1.5 py-0.5 [font-family:inherit] text-[var(--admin-text-subtle)] [@media(pointer:fine)]:inline"
          >
            ⌘K
          </kbd>
        )}
      </button>
    </header>
  );
}
