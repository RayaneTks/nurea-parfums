"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Calculator,
  PackageSearch,
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

export function BottomNav() {
  const pathname = usePathname() ?? "/admin";
  const [pressedHref, setPressedHref] = useState<string | null>(null);
  const [timingLabel, setTimingLabel] = useState<string | null>(null);
  const navTimingRef = useRef<{ href: string; t: number } | null>(null);

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

  return (
    <nav aria-label="Navigation principale" className="admin-bottom-nav admin-nav-no-select">
      {timingLabel ? (
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
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                prefetch={false}
                aria-current={isActive ? "page" : undefined}
                onPointerDown={(e) => {
                  if (e.button === 0) setPressedHref(item.href);
                }}
                onPointerUp={clearPressed}
                onPointerCancel={clearPressed}
                onPointerLeave={clearPressed}
                onClick={() => {
                  if (item.match(pathname)) {
                    setTimingLabel(`${item.label} · 0 ms`);
                    window.setTimeout(() => setTimingLabel(null), 2000);
                    return;
                  }
                  navTimingRef.current = { href: item.href, t: performance.now() };
                }}
                className={cn(
                  "admin-nav-item group relative flex h-16 flex-col items-center justify-center gap-1 mx-1 rounded-2xl",
                  "transition-[background-color,color,transform,opacity] duration-100 ease-out-expo tap-scale",
                  isPressed && "scale-[0.97] opacity-85 bg-admin-surface-muted/90",
                  isActive
                    ? "text-admin-accent bg-admin-accent-subtle"
                    : "text-admin-subtle [@media(hover:hover)]:hover:text-admin-accent",
                )}
              >
                <Icon
                  className={cn(
                    "admin-nav-icon h-[22px] w-[22px] transition-transform duration-200",
                    isActive
                      ? "scale-110"
                      : "[@media(hover:hover)]:group-hover:scale-105",
                  )}
                  aria-hidden
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span
                  className={cn(
                    "text-[10.5px] font-medium tracking-wide",
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
