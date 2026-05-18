"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ClipboardList, Home, Package, PlusCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

const TABS: readonly Tab[] = [
  { href: "/admin", label: "Tableau", icon: Home, match: (p) => p === "/admin" },
  {
    href: "/admin/catalogue",
    label: "Produits",
    icon: Package,
    match: (p) =>
      p.startsWith("/admin/catalogue") ||
      p.startsWith("/admin/perfumes") ||
      p.startsWith("/admin/brands"),
  },
  {
    href: "/admin/ordres",
    label: "Commandes",
    icon: ClipboardList,
    match: (p) => p.startsWith("/admin/ordres"),
  },
  {
    href: "/admin/vendre",
    label: "Vendre",
    icon: PlusCircle,
    match: (p) => p.startsWith("/admin/vendre"),
  },
  {
    href: "/admin/compta",
    label: "Compta",
    icon: TrendingUp,
    match: (p) => p.startsWith("/admin/compta") || p.startsWith("/admin/lots"),
  },
] as const;

/**
 * Bottom tab bar — rendue en `flex-shrink-0` à la fin du flex column du
 * shell admin. Le scroll content (`flex-1 overflow-y-auto`) au-dessus se
 * comprime / s'étend selon la hauteur disponible, et la TabBar reste
 * naturellement collée au bas du viewport visible (sync via --admin-vh
 * pour gérer le clavier iOS).
 *
 * NB : on n'utilise PAS `position: fixed` ici — combiné à certains
 * contextes de containment iOS PWA, ça pouvait faire apparaître la
 * navbar tout en haut. Le flex layout reste la solution la plus stable.
 */
export function TabBar() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Navigation principale"
      data-tabbar
      className="shrink-0"
      style={{
        /* Fond 100% opaque — la safe-area du home indicator iOS se confond
           avec la nav et donne l'impression d'aller jusqu'au bord. */
        background: "var(--admin-surface)",
        borderTop: "1px solid var(--admin-border)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        className="flex w-full items-stretch justify-around"
        style={{
          height: "var(--admin-tab-bar-height)",
        }}
      >
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 min-w-0 select-none flex-col items-center justify-center gap-0.5 px-1",
                "transition-colors duration-[var(--admin-duration-default)] ease-[var(--admin-easing-default)]",
                "tap-scale focus-visible:outline-none focus-visible:bg-[var(--admin-surface-muted)]",
                active ? "text-[var(--admin-accent)]" : "text-[var(--admin-text-muted)]",
              )}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-[36px] rounded-b-full"
                  style={{ background: "var(--admin-accent)" }}
                />
              ) : null}
              <Icon size={22} strokeWidth={active ? 2.4 : 2} aria-hidden />
              <span
                className={cn(
                  "text-[10px] leading-none tracking-[0.01em]",
                  active ? "font-bold" : "font-medium",
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
