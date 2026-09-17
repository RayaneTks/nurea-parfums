"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { ADMIN_TABS, tabOf, type TabId } from "./navigation";

export type TabBadge = {
  /** Complément du nom accessible : « brouillon en cours » → « Vendre, brouillon en cours ». */
  label: string;
};

type TabBarProps = {
  /** Point accent de 8 px sur l'icône (05 §3.4) — jamais un compteur. Seul usage v1 : le brouillon de Vendre. */
  badges?: Partial<Record<TabId, TabBadge>>;
  /** Tap sur un onglet (06 §1.5) : le shell décide (restaurer, fermer, remonter, effacer). */
  onTabPress: (tab: TabId) => void;
};

/**
 * Barre d'onglets (05 §3.4) : 88 px safe area comprise, flou, cinq onglets. Aucun menu « Plus ».
 *
 * **Seul l'onglet actif a un libellé bordeaux et gras** (décision du 17/09/2026) : quand « Vendre »
 * peignait aussi son libellé en bordeaux, deux onglets semblaient actifs et l'onglet courant se lisait
 * moins vite, sur l'écran comme sur une capture. Vendre garde son accent par sa seule pastille d'icône
 * (fond `accent-bg`, icône bordeaux ; pleine quand il est actif) ; son libellé suit les inactifs.
 * Contrastes sur la barre : libellé inactif `text-muted` 6,8:1, libellé actif `accent` 10,9:1, icône
 * bordeaux sur sa pastille 9,3:1, icône blanche sur la pastille pleine 11:1.
 *
 * Chaque onglet reste un vrai lien (préchargement, ouverture dans un nouvel onglet au clic modifié) ;
 * un tap simple est confié au shell, qui applique la mémoire d'onglet.
 */
export function TabBar({ badges = {}, onTabPress }: TabBarProps) {
  const pathname = usePathname() ?? "";
  const activeTab = tabOf(pathname);

  const press = (tab: TabId) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    onTabPress(tab);
  };

  return (
    <nav
      aria-label="Navigation principale"
      data-tabbar
      className={cn(
        "admin-nav-blur admin-safe-bottom fixed inset-x-0 bottom-0 z-[var(--admin-z-tab-bar)] mx-auto flex",
        "h-[var(--admin-tab-bar-height)] max-w-[var(--admin-app-max-width)] items-start justify-between pt-1.5",
      )}
    >
      {ADMIN_TABS.map((tab) => {
        const active = tab.id === activeTab;
        const badge = badges[tab.id];
        const Icon = tab.icon;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            prefetch
            onClick={press(tab.id)}
            aria-current={active ? "page" : undefined}
            aria-label={badge ? `${tab.label}, ${badge.label}` : undefined}
            data-tab={tab.id}
            className={cn(
              "admin-tab-bar__item tap-scale relative flex min-h-[var(--admin-touch-min)] min-w-0 flex-1 flex-col items-center justify-start gap-1 rounded-[var(--admin-radius-md)] pt-1",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--admin-accent-ring)]",
              active ? "text-[var(--admin-accent)]" : "text-[var(--admin-text-muted)]",
            )}
          >
            <span className="relative inline-flex h-7 items-center justify-center" aria-hidden>
              {tab.emphasis ? (
                <span
                  className={cn(
                    "admin-transition inline-flex h-7 w-11 items-center justify-center rounded-[var(--admin-radius-sm)]",
                    active
                      ? "bg-[var(--admin-accent)] text-[var(--admin-on-accent)]"
                      : "bg-[var(--admin-accent-bg)] text-[var(--admin-accent)]",
                  )}
                >
                  <Icon size={20} strokeWidth={2.4} />
                </span>
              ) : (
                <Icon size={23} strokeWidth={active ? 2.4 : 1.9} />
              )}
              {badge ? (
                <span
                  data-tab-badge
                  className="absolute -right-1 -top-0.5 h-2 w-2 rounded-[var(--admin-radius-full)] bg-[var(--admin-accent)] ring-2 ring-[var(--admin-surface)]"
                />
              ) : null}
            </span>
            <span className={cn("admin-type-micro max-w-full truncate tracking-tight", active ? "font-bold" : "font-medium")}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
