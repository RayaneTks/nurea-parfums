"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type TabDef = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

type AdminBottomNavPortalProps = {
  tabs: TabDef[];
  pathname: string;
  navPendingHref: string | null;
  onTabPointerDown: (tab: TabDef) => void;
  onTabActivate: (tab: TabDef) => void;
};

function isTabActive(
  tab: TabDef,
  pathname: string,
  navPendingHref: string | null,
): boolean {
  if (navPendingHref) return tab.href === navPendingHref;
  return tab.match(pathname);
}

/**
 * Barre d’onglets rendue dans document.body pour éviter tout contexte
 * transform/filter du parent (sinon position:fixed se comporte comme absolute → « flottement »).
 */
export function AdminBottomNavPortal({
  tabs,
  pathname,
  navPendingHref,
  onTabPointerDown,
  onTabActivate,
}: AdminBottomNavPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const nav = (
    <nav className="admin-bottom-nav" aria-label="Navigation principale">
      <div className="admin-bottom-nav__inner">
        {tabs.map((tab) => {
          const active = isTabActive(tab, pathname, navPendingHref);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch
              onPointerDown={() => onTabPointerDown(tab)}
              onClick={() => onTabActivate(tab)}
              scroll={true}
              aria-current={active ? "page" : undefined}
              className={cn(
                "admin-nav-item ios-transition relative flex min-h-[44px] min-w-0 flex-1 select-none flex-col items-center justify-center rounded-md p-2 motion-safe:active:scale-[0.98] transition-colors duration-200 ease-out-expo",
                active
                  ? "text-nurea-bordeaux before:absolute before:left-1/2 before:top-0 before:h-[3px] before:w-10 before:-translate-x-1/2 before:rounded-b-full before:bg-nurea-bordeaux before:transition-transform before:duration-200 before:ease-out-expo before:content-['']"
                  : "text-neutral-600",
              )}
            >
              <Icon
                size={24}
                strokeWidth={active ? 2.5 : 2}
                className="ios-transition transition-transform duration-200 ease-out-expo"
              />
              <span
                className={cn(
                  "mt-1 text-[10px] font-medium tracking-tight transition-[color,font-weight] duration-200 ease-out-expo",
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
  );

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(nav, document.body);
}
