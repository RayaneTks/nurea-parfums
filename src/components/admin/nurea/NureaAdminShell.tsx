"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ClipboardList,
  Command as CommandIcon,
  Home,
  Package,
  PlusCircle,
  Search,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminListItemSkeleton } from "../ui/AdminLoadingPrimitives";
import { AdminMobilePwaHint } from "./AdminMobilePwaHint";
import { CommandPalette } from "../shell/CommandPalette";
import type { ReactNode } from "react";

type Tab = {
  href: string;
  label: string;
  icon: typeof Home;
  match: (p: string) => boolean;
};

const TABS: readonly Tab[] = [
  {
    href: "/admin",
    label: "Tableau",
    icon: Home,
    match: (p) => p === "/admin",
  },
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
    match: (p) => p === "/admin/compta" || p.startsWith("/admin/compta/"),
  },
] as const;

const PENDING_SAFETY_MS = 12_000;

function focusCatalogueSearch(): void {
  if (typeof document === "undefined") return;
  document.getElementById("admin-nurea-search")?.focus();
}

export function NureaAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [navPendingHref, setNavPendingHref] = useState<string | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTabActive = (tab: Tab): boolean => {
    if (navPendingHref) return tab.href === navPendingHref;
    return tab.match(pathname);
  };

  const pendingTarget = navPendingHref
    ? TABS.find((t) => t.href === navPendingHref)
    : undefined;
  const isTabRoutePending = Boolean(pendingTarget) && !pendingTarget!.match(pathname);

  useEffect(() => {
    if (!navPendingHref) return;
    const target = TABS.find((t) => t.href === navPendingHref);
    if (target?.match(pathname)) setNavPendingHref(null);
  }, [pathname, navPendingHref]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const clear = () => setNavPendingHref(null);
    window.addEventListener("popstate", clear);
    return () => window.removeEventListener("popstate", clear);
  }, []);

  useEffect(() => {
    if (!navPendingHref) {
      if (safetyTimer.current) {
        clearTimeout(safetyTimer.current);
        safetyTimer.current = null;
      }
      return;
    }
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    safetyTimer.current = setTimeout(() => {
      setNavPendingHref(null);
      safetyTimer.current = null;
    }, PENDING_SAFETY_MS);
    return () => {
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
    };
  }, [navPendingHref]);

  const onTabActivate = (tab: Tab) => {
    if (tab.match(pathname)) {
      setNavPendingHref(null);
      return;
    }
    setNavPendingHref(tab.href);
  };

  const onCatalogue = TABS[1]?.match(pathname) ?? false;
  const dashboardTab = TABS[0]!;

  return (
    <div className="flex h-[100dvh] min-h-0 w-full min-w-0 max-w-full flex-col overflow-x-clip bg-ios-bg font-sans text-neutral-900">
      <header className="safe-top z-40 flex w-full min-w-0 shrink-0 items-center justify-between border-b border-neutral-200/50 bg-ios-bg/80 px-5 py-3.5 pt-[max(0.5rem,env(safe-area-inset-top,0px))] backdrop-blur-md">
        <h1 className="m-0 min-w-0">
          <Link
            href={dashboardTab.href}
            prefetch
            onPointerDown={() => {
              if (!dashboardTab.match(pathname)) setNavPendingHref(dashboardTab.href);
            }}
            onClick={() => onTabActivate(dashboardTab)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center tap-scale rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nurea-bordeaux/35 focus-visible:ring-offset-2 focus-visible:ring-offset-ios-bg"
            aria-label="Tableau de bord"
          >
            <Image
              src="/branding/monogram/np-free-bordeaux.webp"
              alt="Nuréa Parfums"
              width={44}
              height={44}
              className="h-10 w-10 object-contain sm:h-11 sm:w-11"
              priority
            />
          </Link>
        </h1>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const evt = new KeyboardEvent("keydown", { key: "k", metaKey: true });
              window.dispatchEvent(evt);
            }}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl p-2.5 text-neutral-700 transition-colors tap-scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nurea-bordeaux/35 focus-visible:ring-offset-2 focus-visible:ring-offset-ios-bg"
            aria-label="Palette de commandes (Cmd+K)"
            title="Cmd+K"
          >
            <CommandIcon size={20} strokeWidth={2.2} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => {
              if (onCatalogue) focusCatalogueSearch();
              else {
                router.push("/admin/catalogue");
                window.setTimeout(() => focusCatalogueSearch(), 120);
              }
            }}
            className="-mr-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl p-2.5 text-nurea-bordeaux transition-colors tap-scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nurea-bordeaux/35 focus-visible:ring-offset-2 focus-visible:ring-offset-ios-bg"
            aria-label="Recherche catalogue"
          >
            <Search size={22} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
      </header>

      <AdminMobilePwaHint />

      {isTabRoutePending ? (
        <div
          className="admin-nav-route-progress z-30"
          role="status"
          aria-live="polite"
          aria-label="Chargement de la page"
        >
          <div className="admin-nav-route-progress__bar" />
        </div>
      ) : null}

      <div
        className="ios-transition w-full pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
        aria-busy={isTabRoutePending}
      >
        {isTabRoutePending ? (
          <div
            className="flex min-h-0 flex-1 flex-col px-5 pt-2"
            role="status"
            aria-live="polite"
            aria-label="Chargement de la page"
          >
            <div className="mb-2 h-8 w-44 max-w-[60%] rounded-2xl bg-neutral-200/80 admin-skeleton" />
            <p className="mb-4 text-sm text-neutral-600">Chargement…</p>
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <AdminListItemSkeleton
                  key={i}
                  className="h-[72px] border border-neutral-200/80 bg-white shadow-sm"
                />
              ))}
            </div>
          </div>
        ) : (
          children
        )}
      </div>

      <nav className="admin-bottom-nav" aria-label="Navigation principale">
        <div className="admin-bottom-nav__inner">
          {TABS.map((tab) => {
            const active = isTabActive(tab);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch
                onPointerDown={() => {
                  if (!tab.match(pathname)) setNavPendingHref(tab.href);
                }}
                onClick={() => onTabActivate(tab)}
                scroll
                aria-current={active ? "page" : undefined}
                className={cn(
                  "admin-nav-item ios-transition relative flex min-h-[44px] min-w-0 flex-1 select-none flex-col items-center justify-center rounded-md px-1 py-2 motion-safe:active:scale-[0.98] transition-colors duration-200 ease-out-expo",
                  active
                    ? "text-nurea-bordeaux before:absolute before:left-1/2 before:top-0 before:h-[3px] before:w-9 before:-translate-x-1/2 before:rounded-b-full before:bg-nurea-bordeaux before:transition-transform before:duration-200 before:ease-out-expo before:content-['']"
                    : "text-neutral-600",
                )}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 2}
                  className="ios-transition transition-transform duration-200 ease-out-expo"
                />
                <span
                  className={cn(
                    "mt-0.5 text-[10px] font-medium tracking-tight transition-[color,font-weight] duration-200 ease-out-expo",
                    active ? "font-bold text-nurea-bordeaux" : "text-neutral-600",
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <CommandPalette />
    </div>
  );
}
