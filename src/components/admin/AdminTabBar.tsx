"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid } from "lucide-react";

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
] as const;

export function AdminTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[70] border-t border-[var(--admin-border)] bg-[var(--admin-tab-bg)]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Navigation principale"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {tabs.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex min-w-0 flex-1 justify-center">
              <Link
                href={href}
                className={`flex min-h-[52px] min-w-[56px] max-w-[120px] flex-1 flex-col items-center justify-center gap-0.5 px-1 transition-[color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-tab-bg)] ${
                  active ? "text-[var(--admin-text)]" : "text-[var(--admin-muted)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={`h-[22px] w-[22px] shrink-0 ${active ? "opacity-100" : "opacity-70"}`} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                <span className={`max-w-full truncate text-[10px] font-semibold leading-tight tracking-tight ${active ? "" : "font-medium"}`}>
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
