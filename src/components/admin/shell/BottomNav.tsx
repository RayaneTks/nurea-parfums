"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  return (
    <nav aria-label="Navigation principale" className="admin-bottom-nav">
      <ul className="flex items-stretch justify-around px-2">
        {items.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "admin-nav-item group relative flex h-16 flex-col items-center justify-center gap-1 mx-1 rounded-2xl",
                  "transition-[background-color,color,transform] duration-200 ease-out-expo tap-scale",
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
