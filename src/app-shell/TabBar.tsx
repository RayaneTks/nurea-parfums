"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_TABS } from "./navigation";
import { cn } from "@/lib/utils";

/**
 * Barre d'onglets basse — navigation primaire de l'app.
 *
 * Cinq destinations fixes (voir `navigation.ts`), aucun menu « Plus » : un
 * onglet qui cache une liste déroulante casse la promesse « une destination =
 * un tap » et masque la moitié de l'app.
 */
export function TabBar() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Navigation principale"
      data-tabbar
      className={cn(
        "admin-nav-blur safe-area-bottom fixed bottom-0 left-0 right-0 mx-auto",
        "z-[var(--admin-z-tab-bar)] flex h-[var(--admin-tab-bar-shell-height)]",
        "max-w-[var(--admin-app-max-width)] items-start justify-between px-1 pt-1.5",
      )}
    >
      {ADMIN_TABS.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch
            aria-current={active ? "page" : undefined}
            className={cn(
              "admin-tab-bar__item relative flex min-h-[var(--admin-touch-min)] min-w-0 flex-1",
              "select-none flex-col items-center justify-start gap-1 rounded-xl px-0.5 pt-1.5",
              "transition-colors duration-[var(--admin-duration-default)] ease-[var(--admin-easing-default)]",
              "tap-scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--admin-accent-ring)]",
              active ? "text-[var(--admin-accent)]" : "text-[var(--admin-text-muted)]",
            )}
          >
            {tab.emphasis ? (
              // « Vendre » est l'action la plus fréquente de la journée : elle
              // est traitée comme un bouton et non comme une destination.
              <span
                aria-hidden
                className={cn(
                  "inline-flex h-7 w-11 items-center justify-center rounded-[9px]",
                  "transition-colors duration-[var(--admin-duration-default)] ease-[var(--admin-easing-default)]",
                  active
                    ? "bg-[var(--admin-accent)] text-white"
                    : "bg-[var(--admin-accent-bg)] text-[var(--admin-accent)]",
                )}
              >
                <Icon size={20} strokeWidth={2.4} />
              </span>
            ) : (
              <Icon
                size={23}
                strokeWidth={active ? 2.4 : 1.9}
                aria-hidden
                className="h-7 shrink-0"
              />
            )}
            <span
              className={cn(
                "max-w-full truncate text-[10px] leading-none tracking-[0.01em]",
                active ? "font-bold" : "font-medium",
                tab.emphasis && !active ? "text-[var(--admin-accent)]" : null,
              )}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
