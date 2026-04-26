"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Calculator,
  PackageSearch,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

const items: NavItem[] = [
  {
    href: "/admin/compta",
    label: "Compta",
    icon: LayoutDashboard,
    match: (p) => p === "/admin" || p === "/admin/compta" || p.startsWith("/admin/compta/"),
  },
  {
    href: "/admin/ordres",
    label: "Ordres",
    icon: ClipboardList,
    match: (p) => p.startsWith("/admin/ordres"),
  },
  {
    href: "/admin/vendre",
    label: "Vendre",
    icon: Calculator,
    match: (p) => p.startsWith("/admin/vendre"),
  },
  {
    href: "/admin/catalogue",
    label: "Catalogue",
    icon: PackageSearch,
    match: (p) =>
      p.startsWith("/admin/catalogue") ||
      p.startsWith("/admin/perfumes") ||
      p.startsWith("/admin/brands"),
  },
];

function hapticTab() {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(6);
  } catch {
    /* ignore */
  }
}

export function BottomNav() {
  const pathname = usePathname() ?? "/admin";
  const [pressedHref, setPressedHref] = useState<string | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [arrivalFlashHref, setArrivalFlashHref] = useState<string | null>(null);
  const [timingLabel, setTimingLabel] = useState<string | null>(null);
  const navTimingRef = useRef<{ href: string; t: number } | null>(null);
  const prevPathForArrivalRef = useRef<string | null>(null);

  const clearPressed = useCallback(() => {
    setPressedHref(null);
  }, []);

  useEffect(() => {
    const pending = navTimingRef.current;
    if (!pending) return;
    const item = items.find((i) => i.href === pending.href);
    if (item?.match(pathname)) {
      const ms = Math.round(performance.now() - pending.t);
      navTimingRef.current = null;
      setTimingLabel(`${item.label} · ${ms} ms`);
      const id = window.setTimeout(() => setTimingLabel(null), 2800);
      return () => window.clearTimeout(id);
    }
  }, [pathname]);

  useEffect(() => {
    if (!pendingHref) return;
    const item = items.find((i) => i.href === pendingHref);
    if (item?.match(pathname)) {
      setPendingHref(null);
    }
  }, [pathname, pendingHref]);

  useEffect(() => {
    if (!pendingHref) return;
    const t = window.setTimeout(() => setPendingHref(null), 12000);
    return () => window.clearTimeout(t);
  }, [pendingHref]);

  useEffect(() => {
    if (prevPathForArrivalRef.current === null) {
      prevPathForArrivalRef.current = pathname;
      return;
    }
    if (prevPathForArrivalRef.current === pathname) return;
    prevPathForArrivalRef.current = pathname;
    const active = items.find((i) => i.match(pathname));
    if (!active) return;
    setArrivalFlashHref(active.href);
    const id = window.setTimeout(() => setArrivalFlashHref(null), 480);
    return () => window.clearTimeout(id);
  }, [pathname]);

  const showNavTiming = process.env.NODE_ENV === "development";

  return (
    <nav aria-label="Navigation principale" className="admin-bottom-nav admin-nav-no-select">
      {showNavTiming && timingLabel ? (
        <output
          className="pointer-events-none absolute left-1/2 top-1 z-[1] -translate-x-1/2 rounded-lg border border-admin-border bg-admin-surface/95 px-2.5 py-1 text-[10px] font-medium tabular-nums text-admin-muted shadow-admin-sm backdrop-blur-sm"
          aria-live="polite"
        >
          {timingLabel}
        </output>
      ) : null}
      <ul className="flex items-stretch justify-around px-2">
        {items.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;
          const isPressed = pressedHref === item.href;
          const isPending = pendingHref === item.href;
          const showArrival = arrivalFlashHref === item.href && isActive;
          return (
            <li key={item.href} className="admin-nav-cell flex min-h-0 min-w-0 flex-1">
              <Link
                href={item.href}
                prefetch
                aria-current={isActive ? "page" : undefined}
                aria-busy={isPending}
                data-active={isActive ? "true" : undefined}
                data-pending={isPending ? "true" : undefined}
                onPointerDown={(e) => {
                  if (e.button === 0) setPressedHref(item.href);
                }}
                onPointerUp={clearPressed}
                onPointerCancel={clearPressed}
                onPointerLeave={clearPressed}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  if (e.button !== 0) return;
                  if (item.match(pathname)) {
                    setTimingLabel(`${item.label} · 0 ms`);
                    window.setTimeout(() => setTimingLabel(null), 2000);
                    return;
                  }
                  hapticTab();
                  setPendingHref(item.href);
                  navTimingRef.current = { href: item.href, t: performance.now() };
                }}
                className={cn(
                  "admin-nav-item group relative flex h-16 w-full flex-col items-center justify-center gap-1 rounded-2xl",
                  "transition-[background-color,color,transform,box-shadow] duration-100 ease-out-expo tap-scale",
                  isPressed && !isPending && "scale-[0.97] bg-admin-surface-muted/90",
                  isActive
                    ? "text-admin-accent bg-admin-accent-subtle"
                    : "text-admin-subtle [@media(hover:hover)]:hover:text-admin-accent",
                  showArrival && "admin-nav-arrival",
                )}
              >
                <span
                  className="relative flex h-[22px] w-[22px] shrink-0 items-center justify-center"
                  aria-hidden
                >
                  <Icon
                    className={cn(
                      "admin-nav-icon h-[22px] w-[22px] transition-transform duration-200",
                      isPending && "opacity-35",
                      isActive
                        ? "scale-110"
                        : "[@media(hover:hover)]:group-hover:scale-105",
                    )}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  {isPending ? (
                    <Loader2
                      className="text-admin-accent pointer-events-none absolute h-[16px] w-[16px] animate-spin"
                      strokeWidth={2.2}
                      aria-hidden
                    />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "text-[10.5px] font-medium leading-none tracking-wide",
                    isActive && "font-semibold",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
