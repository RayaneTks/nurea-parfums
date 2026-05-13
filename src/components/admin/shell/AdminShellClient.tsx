"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { NureaAdminShell } from "../nurea/NureaAdminShell";

const ADMIN_TAB_ROUTES = [
  "/admin",
  "/admin/catalogue",
  "/admin/vendre",
  "/admin/ordres",
  "/admin/compta",
] as const;

function runWhenIdle(fn: () => void): () => void {
  if (typeof requestIdleCallback !== "undefined") {
    const id = requestIdleCallback(() => fn(), { timeout: 2800 });
    return () => cancelIdleCallback(id);
  }
  const t = window.setTimeout(fn, 0);
  return () => window.clearTimeout(t);
}

interface AdminShellClientProps {
  children: ReactNode;
}

export function AdminShellClient({ children }: AdminShellClientProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const isLogin = pathname === "/admin/login" || pathname.startsWith("/admin/login/");

  useEffect(() => {
    document.body.classList.add("admin-route");
    document.documentElement.classList.add("admin-route-root");
    return () => {
      document.body.classList.remove("admin-route");
      document.documentElement.classList.remove("admin-route-root");
    };
  }, []);

  /** Précharge les autres onglets admin en idle (complète le prefetch `Link` de la barre). */
  useEffect(() => {
    if (isLogin) return;
    return runWhenIdle(() => {
      for (const href of ADMIN_TAB_ROUTES) {
        if (href === "/admin" && pathname === "/admin") continue;
        if (
          href === "/admin/catalogue" &&
          (pathname.startsWith("/admin/catalogue") ||
            pathname.startsWith("/admin/perfumes") ||
            pathname.startsWith("/admin/brands"))
        )
          continue;
        if (href === "/admin/vendre" && pathname.startsWith("/admin/vendre")) continue;
        if (href === "/admin/ordres" && pathname.startsWith("/admin/ordres")) continue;
        if (href === "/admin/compta" && pathname.startsWith("/admin/compta")) continue;
        router.prefetch(href);
      }
    });
  }, [isLogin, pathname, router]);

  if (isLogin) {
    return (
      <div className="admin-theme min-h-[100dvh] w-full min-w-0 max-w-full overflow-x-clip bg-admin-bg text-admin-text">
        <div className="admin-mobile-shell !pb-0 pt-[env(safe-area-inset-top,0px)]">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-theme min-h-[100dvh] w-full min-w-0 max-w-full overflow-x-clip text-neutral-900">
      <div className="mx-auto w-full min-h-[100dvh] min-w-0 max-w-[430px] shadow-none md:shadow-[0_0_0_1px_rgba(0,0,0,0.08)]">
        <NureaAdminShell>{children}</NureaAdminShell>
      </div>
    </div>
  );
}
