"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Wallet } from "lucide-react";

const tabs = [
  { href: "/admin", label: "Accueil", icon: Home, match: (p: string) => p === "/admin" },
  {
    href: "/admin/catalogue",
    label: "Catalogue",
    icon: LayoutGrid,
    match: (p: string) =>
      p.startsWith("/admin/catalogue") ||
      p.startsWith("/admin/perfumes") ||
      p.startsWith("/admin/brands"),
  },
  {
    href: "/admin/caisse",
    label: "Caisse",
    icon: Wallet,
    match: (p: string) => p.startsWith("/admin/caisse"),
  },
] as const;

/** Tab bar iOS : fond flou, libellés SF size 10, tint sur l’onglet actif. */
export function AdminTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[70] border-t border-[var(--admin-separator)] bg-[var(--admin-tab-bg)] pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--admin-tab-bg)]"
      aria-label="Navigation principale"
    >
      <ul className="mx-auto flex max-w-lg items-end justify-around px-2 pt-1">
        {tabs.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex min-w-0 flex-1 justify-center pb-1">
              <Link
                href={href}
                className={`flex min-h-[50px] min-w-[64px] max-w-[140px] flex-1 flex-col items-center justify-end gap-0.5 rounded-[10px] px-1 transition-opacity duration-150 ease-out active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-tab-bg)] ${
                  active ? "text-[var(--admin-accent)]" : "text-[var(--admin-muted)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-[10px] transition-colors duration-150 ${
                    active ? "bg-[var(--admin-tab-active)]" : ""
                  }`}
                  aria-hidden
                >
                  <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                </span>
                <span className="max-w-full truncate text-[10px] font-medium leading-none tracking-wide">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
