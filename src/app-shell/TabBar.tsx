"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Home,
  MoreHorizontal,
  Package,
  PlusCircle,
  TrendingUp,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

type MoreItem = {
  href: string;
  label: string;
  description?: string;
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

const MORE_ITEMS: readonly MoreItem[] = [
  {
    href: "/admin/clients",
    label: "Clients",
    description: "Liste et fiches",
    icon: Users,
    match: (p) =>
      p.startsWith("/admin/clients") &&
      p !== "/admin/clients/new" &&
      !p.endsWith("/edit"),
  },
  {
    href: "/admin/clients/new",
    label: "Nouveau client",
    description: "Créer une fiche",
    icon: UserRoundPlus,
    match: (p) => p === "/admin/clients/new",
  },
] as const;

function isMoreActive(pathname: string) {
  return MORE_ITEMS.some((item) => item.match(pathname));
}

export function TabBar() {
  const pathname = usePathname() ?? "";
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const moreActive = isMoreActive(pathname);

  return (
    <nav
      aria-label="Navigation principale"
      data-tabbar
      className="admin-tab-bar"
    >
      <div className="admin-tab-bar__inner mx-auto flex w-full max-w-[var(--admin-app-max-width)] items-center justify-around">
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
                "admin-tab-bar__item relative flex min-h-[var(--admin-touch-min)] min-w-0 flex-1 select-none flex-col items-center justify-center gap-0.5 px-0.5",
                "transition-colors duration-[var(--admin-duration-default)] ease-[var(--admin-easing-default)]",
                "tap-scale focus-visible:outline-none focus-visible:bg-[var(--admin-surface-muted)]",
                active ? "text-[var(--admin-accent)]" : "text-[var(--admin-text-muted)]",
              )}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute top-0 left-1/2 h-[3px] w-9 -translate-x-1/2 rounded-b-full bg-[var(--admin-accent)]"
                />
              ) : null}
              <Icon size={22} strokeWidth={active ? 2.4 : 2} aria-hidden />
              <span
                className={cn(
                  "max-w-full truncate text-[10px] leading-none tracking-[0.01em]",
                  active ? "font-bold" : "font-medium",
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}

        <div ref={moreRef} className="relative flex min-w-0 flex-1">
          {moreOpen ? (
            <button
              type="button"
              aria-label="Fermer le menu Plus"
              className="admin-tab-bar-menu-scrim fixed inset-0 z-[var(--admin-z-tab-bar-menu)]"
              onClick={() => setMoreOpen(false)}
            />
          ) : null}

          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            aria-label="Plus d'options"
            onClick={() => setMoreOpen((open) => !open)}
            className={cn(
              "admin-tab-bar__item relative z-[calc(var(--admin-z-tab-bar-menu)+1)] flex min-h-[var(--admin-touch-min)] w-full select-none flex-col items-center justify-center gap-0.5 px-0.5",
              "transition-colors duration-[var(--admin-duration-default)] ease-[var(--admin-easing-default)]",
              "tap-scale focus-visible:outline-none focus-visible:bg-[var(--admin-surface-muted)]",
              moreActive || moreOpen
                ? "text-[var(--admin-accent)]"
                : "text-[var(--admin-text-muted)]",
            )}
          >
            {moreActive ? (
              <span
                aria-hidden
                className="absolute top-0 left-1/2 h-[3px] w-9 -translate-x-1/2 rounded-b-full bg-[var(--admin-accent)]"
              />
            ) : null}
            <MoreHorizontal size={22} strokeWidth={moreActive || moreOpen ? 2.4 : 2} aria-hidden />
            <span
              className={cn(
                "text-[10px] leading-none tracking-[0.01em]",
                moreActive || moreOpen ? "font-bold" : "font-medium",
              )}
            >
              Plus
            </span>
          </button>

          {moreOpen ? (
            <div
              role="menu"
              aria-label="Navigation secondaire"
              className="admin-tab-bar-menu absolute bottom-[calc(100%+8px)] right-1 z-[calc(var(--admin-z-tab-bar-menu)+1)] min-w-[196px] overflow-hidden rounded-[14px] border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-lg)]"
            >
              {MORE_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = item.match(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    role="menuitem"
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-[var(--admin-touch-min)] items-center gap-3 px-4 tap-scale active:scale-[0.98]",
                      "transition-colors duration-[var(--admin-duration-fast)] ease-[var(--admin-easing-default)]",
                      active
                        ? "bg-[var(--admin-accent-bg)] text-[var(--admin-accent)]"
                        : "text-[var(--admin-text)] hover:bg-[var(--admin-surface-muted)]",
                    )}
                    onClick={() => setMoreOpen(false)}
                  >
                    <span
                      className={cn(
                        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
                        active
                          ? "bg-[var(--admin-accent)] text-white"
                          : "bg-[var(--admin-surface-muted)] text-[var(--admin-accent)]",
                      )}
                      aria-hidden
                    >
                      <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold leading-tight">
                        {item.label}
                      </span>
                      {item.description ? (
                        <span className="mt-0.5 block text-[11px] text-[var(--admin-text-subtle)]">
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

